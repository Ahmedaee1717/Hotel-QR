import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'

// Type definitions for Cloudflare bindings
type Bindings = {
  DB: D1Database
}

const app = new Hono<{ Bindings: Bindings }>()

// Enable CORS for API routes
app.use('/api/*', cors())

// ============================================
// UTILITY FUNCTIONS
// ============================================

// Generate unique booking reference
function generateBookingReference(): string {
  const date = new Date().toISOString().slice(2, 10).replace(/-/g, '')
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `HB-${date}-${random}`
}

// Generate session token
function generateSessionToken(): string {
  return crypto.randomUUID()
}

// Language configuration
const SUPPORTED_LANGUAGES = {
  'en': { name: 'English', native: 'English', flag: '🇬🇧' },
  'ar': { name: 'Arabic', native: 'العربية', flag: '🇸🇦' },
  'de': { name: 'German', native: 'Deutsch', flag: '🇩🇪' },
  'ru': { name: 'Russian', native: 'Русский', flag: '🇷🇺' },
  'pl': { name: 'Polish', native: 'Polski', flag: '🇵🇱' },
  'it': { name: 'Italian', native: 'Italiano', flag: '🇮🇹' },
  'fr': { name: 'French', native: 'Français', flag: '🇫🇷' },
  'cs': { name: 'Czech', native: 'Čeština', flag: '🇨🇿' },
  'uk': { name: 'Ukrainian', native: 'Українська', flag: '🇺🇦' }
}

// AI Translation using OpenAI GPT-4 (for 100% accurate tourism translations)
async function translateWithAI(texts: string[], targetLang: string, apiKey: string): Promise<string[]> {
  if (!texts || texts.length === 0) return []
  
  const languageNames: Record<string, string> = {
    'ar': 'Modern Standard Arabic',
    'de': 'German', 
    'ru': 'Russian',
    'pl': 'Polish',
    'it': 'Italian',
    'fr': 'French',
    'cs': 'Czech',
    'uk': 'Ukrainian'
  }
  
  try {
    const combinedText = texts.join('\n---SPLIT---\n')
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [{
          role: 'system',
          content: `You are a professional tourism translator specializing in hotel, resort, and travel content for Egypt Red Sea destinations (Hurghada, Marsa Alam). 

CRITICAL REQUIREMENTS:
- Translate with 100% accuracy to ${languageNames[targetLang]}
- Maintain tourism marketing tone and appeal
- Preserve formatting, punctuation, and special characters
- Keep proper nouns (hotel names, locations) unchanged
- Use appropriate formality level for hospitality industry
- Ensure cultural appropriateness for ${languageNames[targetLang]} speakers
- Output translations separated by ---SPLIT--- markers
- Output ONLY the translations, NO explanations or notes`
        }, {
          role: 'user',
          content: combinedText
        }],
        temperature: 0.2,
        max_tokens: 2000
      })
    })
    
    if (!response.ok) {
      console.error('Translation API error:', await response.text())
      return texts // Fallback to original
    }
    
    const data: any = await response.json()
    const translatedText = data.choices?.[0]?.message?.content?.trim()
    
    if (!translatedText) return texts
    
    return translatedText.split('---SPLIT---').map((t: string) => t.trim())
  } catch (error) {
    console.error(`Translation error for ${targetLang}:`, error)
    return texts // Fallback to original text
  }
}

// ============================================
// GUEST API ROUTES
// ============================================

// Welcome page - QR code entry point
app.get('/api/welcome/:property_slug/:room_token', async (c) => {
  const { property_slug, room_token } = c.req.param()
  const { DB } = c.env

  try {
    // Validate room token and get property/room info
    const room = await DB.prepare(`
      SELECT r.*, p.* FROM rooms r
      JOIN properties p ON r.property_id = p.property_id
      WHERE r.qr_code_data = ? AND p.slug = ? AND p.status = 'active'
    `).bind(room_token, property_slug).first()

    if (!room) {
      return c.json({ error: 'Invalid QR code or property' }, 404)
    }

    // Create guest session
    const session_token = generateSessionToken()
    const guest = await DB.prepare(`
      INSERT INTO guests (property_id, room_id, session_token, preferred_language)
      VALUES (?, ?, ?, 'en')
      RETURNING guest_id, session_token
    `).bind(room.property_id, room.room_id, session_token).first()

    // Get featured activities
    const featured = await DB.prepare(`
      SELECT a.*, v.business_name as vendor_name, c.name_en as category_name
      FROM activities a
      JOIN vendors v ON a.vendor_id = v.vendor_id
      JOIN categories c ON a.category_id = c.category_id
      JOIN vendor_properties vp ON v.vendor_id = vp.vendor_id
      WHERE vp.property_id = ? AND a.status = 'active' AND a.is_featured = 1
      ORDER BY a.popularity_score DESC
      LIMIT 6
    `).bind(room.property_id).all()

    // Log analytics event
    await DB.prepare(`
      INSERT INTO analytics_events (property_id, guest_id, event_type, entity_id, metadata)
      VALUES (?, ?, 'qr_scan', ?, ?)
    `).bind(room.property_id, guest.guest_id, room.room_id, JSON.stringify({ room_token })).run()

    return c.json({
      session_token: guest.session_token,
      property: {
        name: room.name,
        slug: room.slug,
        logo: room.brand_logo_url,
        primary_color: room.primary_color,
        secondary_color: room.secondary_color,
        supported_languages: JSON.parse(room.supported_languages)
      },
      room: {
        number: room.room_number,
        type: room.room_type
      },
      featured_activities: featured.results
    })
  } catch (error) {
    console.error('Welcome API error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Get all categories
app.get('/api/categories', async (c) => {
  const { DB } = c.env
  const lang = c.req.query('lang') || 'en'

  try {
    const categories = await DB.prepare(`
      SELECT 
        category_id,
        ${lang === 'ar' ? 'name_ar' : 'name_en'} as name,
        slug,
        icon_name,
        display_order
      FROM categories
      WHERE parent_category_id IS NULL
      ORDER BY display_order ASC
    `).all()

    return c.json({ categories: categories.results })
  } catch (error) {
    console.error('Categories API error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Get activities catalog
app.get('/api/activities', async (c) => {
  const { DB } = c.env
  const property_id = c.req.query('property_id')
  const category = c.req.query('category')
  const sort = c.req.query('sort') || 'popularity'
  const lang = c.req.query('lang') || 'en'
  const page = parseInt(c.req.query('page') || '1')
  const per_page = 20

  try {
    let query = `
      SELECT 
        a.activity_id,
        ${lang === 'ar' ? 'a.title_ar' : 'a.title_en'} as title,
        ${lang === 'ar' ? 'a.short_description_ar' : 'a.short_description_en'} as short_description,
        a.images,
        a.duration_minutes,
        a.capacity_per_slot,
        a.price,
        a.currency,
        a.is_featured,
        v.business_name as vendor_name,
        v.slug as vendor_slug,
        ${lang === 'ar' ? 'c.name_ar' : 'c.name_en'} as category_name,
        c.slug as category_slug
      FROM activities a
      JOIN vendors v ON a.vendor_id = v.vendor_id
      JOIN categories c ON a.category_id = c.category_id
      JOIN vendor_properties vp ON v.vendor_id = vp.vendor_id
      WHERE vp.property_id = ? AND a.status = 'active'
    `

    const params: any[] = [property_id]

    if (category) {
      query += ` AND c.slug = ?`
      params.push(category)
    }

    // Sorting
    if (sort === 'price') {
      query += ` ORDER BY a.price ASC`
    } else if (sort === 'duration') {
      query += ` ORDER BY a.duration_minutes ASC`
    } else {
      query += ` ORDER BY a.popularity_score DESC`
    }

    query += ` LIMIT ? OFFSET ?`
    params.push(per_page, (page - 1) * per_page)

    const activities = await DB.prepare(query).bind(...params).all()

    return c.json({
      activities: activities.results,
      page,
      per_page,
      total: activities.results.length
    })
  } catch (error) {
    console.error('Activities API error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Get single activity details
app.get('/api/activities/:activity_id', async (c) => {
  const { DB } = c.env
  const { activity_id } = c.req.param()
  const lang = c.req.query('lang') || 'en'

  try {
    const activity = await DB.prepare(`
      SELECT 
        a.*,
        ${lang === 'ar' ? 'a.title_ar' : 'a.title_en'} as title,
        ${lang === 'ar' ? 'a.short_description_ar' : 'a.short_description_en'} as short_description,
        ${lang === 'ar' ? 'a.full_description_ar' : 'a.full_description_en'} as full_description,
        v.business_name as vendor_name,
        v.slug as vendor_slug,
        v.phone as vendor_phone,
        v.email as vendor_email,
        v.certifications as vendor_certifications,
        v.safety_rating as vendor_safety_rating,
        ${lang === 'ar' ? 'c.name_ar' : 'c.name_en'} as category_name
      FROM activities a
      JOIN vendors v ON a.vendor_id = v.vendor_id
      JOIN categories c ON a.category_id = c.category_id
      WHERE a.activity_id = ? AND a.status = 'active'
    `).bind(activity_id).first()

    if (!activity) {
      return c.json({ error: 'Activity not found' }, 404)
    }

    // Get availability schedule
    const schedule = await DB.prepare(`
      SELECT * FROM availability_schedule
      WHERE activity_id = ?
      ORDER BY day_of_week, start_time
    `).bind(activity_id).all()

    return c.json({
      activity: {
        ...activity,
        images: activity.images ? JSON.parse(activity.images) : [],
        requirements: activity.requirements ? JSON.parse(activity.requirements) : {},
        includes: activity.includes ? JSON.parse(activity.includes) : []
      },
      schedule: schedule.results
    })
  } catch (error) {
    console.error('Activity detail API error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Get activity availability for specific date
app.get('/api/availability/:activity_id', async (c) => {
  const { DB } = c.env
  const { activity_id } = c.req.param()
  const date = c.req.query('date') // Format: YYYY-MM-DD

  try {
    const dayOfWeek = new Date(date).getDay()

    // Get scheduled slots for this day
    const slots = await DB.prepare(`
      SELECT 
        start_time,
        end_time,
        slots_available
      FROM availability_schedule
      WHERE activity_id = ?
        AND (day_of_week = ? OR specific_date = ?)
        AND (valid_from IS NULL OR valid_from <= ?)
        AND (valid_until IS NULL OR valid_until >= ?)
      ORDER BY start_time
    `).bind(activity_id, dayOfWeek, date, date, date).all()

    // Get existing bookings for this date
    const bookings = await DB.prepare(`
      SELECT activity_time, SUM(num_participants) as booked
      FROM bookings
      WHERE activity_id = ? AND activity_date = ? AND booking_status = 'confirmed'
      GROUP BY activity_time
    `).bind(activity_id, date).all()

    const bookedMap = new Map()
    bookings.results.forEach((b: any) => {
      bookedMap.set(b.activity_time, b.booked)
    })

    // Calculate availability
    const availability = slots.results.map((slot: any) => {
      const booked = bookedMap.get(slot.start_time) || 0
      return {
        time: slot.start_time,
        capacity: slot.slots_available,
        available: slot.slots_available - booked,
        booked
      }
    })

    return c.json({ date, slots: availability })
  } catch (error) {
    console.error('Availability API error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Create booking
app.post('/api/bookings', async (c) => {
  const { DB } = c.env
  const body = await c.req.json()
  const {
    session_token,
    activity_id,
    activity_date,
    activity_time,
    num_participants,
    guest_info,
    payment_method,
    guest_notes
  } = body

  try {
    // Validate session
    const guest = await DB.prepare(`
      SELECT * FROM guests WHERE session_token = ?
    `).bind(session_token).first()

    if (!guest) {
      return c.json({ error: 'Invalid session' }, 401)
    }

    // Get activity details
    const activity = await DB.prepare(`
      SELECT a.*, v.commission_rate
      FROM activities a
      JOIN vendors v ON a.vendor_id = v.vendor_id
      WHERE a.activity_id = ?
    `).bind(activity_id).first()

    if (!activity) {
      return c.json({ error: 'Activity not found' }, 404)
    }

    // Check availability
    const dayOfWeek = new Date(activity_date).getDay()
    const slot = await DB.prepare(`
      SELECT slots_available FROM availability_schedule
      WHERE activity_id = ? AND (day_of_week = ? OR specific_date = ?) AND start_time = ?
    `).bind(activity_id, dayOfWeek, activity_date, activity_time).first()

    if (!slot) {
      return c.json({ error: 'Time slot not available' }, 400)
    }

    // Check current bookings
    const booked = await DB.prepare(`
      SELECT SUM(num_participants) as total
      FROM bookings
      WHERE activity_id = ? AND activity_date = ? AND activity_time = ? AND booking_status = 'confirmed'
    `).bind(activity_id, activity_date, activity_time).first()

    const currentBooked = booked?.total || 0
    if (currentBooked + num_participants > slot.slots_available) {
      return c.json({ error: 'Not enough capacity available' }, 400)
    }

    // Update guest info if provided
    if (guest_info) {
      await DB.prepare(`
        UPDATE guests
        SET first_name = ?, last_name = ?, email = ?, phone = ?, preferred_language = ?
        WHERE guest_id = ?
      `).bind(
        guest_info.first_name,
        guest_info.last_name,
        guest_info.email,
        guest_info.phone,
        guest_info.preferred_language || 'en',
        guest.guest_id
      ).run()
    }

    // Calculate pricing
    const total_price = activity.price * num_participants
    const commission_amount = total_price * (activity.commission_rate / 100)

    // Generate booking reference
    const booking_reference = generateBookingReference()

    // Determine booking status based on payment method
    const booking_status = payment_method === 'pay_at_vendor' ? 'confirmed' : 'pending'
    const payment_status = payment_method === 'pay_at_vendor' ? 'pending' : 'pending'

    // Create booking
    const booking = await DB.prepare(`
      INSERT INTO bookings (
        booking_reference, guest_id, property_id, activity_id, vendor_id,
        activity_date, activity_time, duration_minutes, num_participants,
        total_price, currency, commission_amount, payment_status, payment_method,
        booking_status, guest_notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING booking_id
    `).bind(
      booking_reference,
      guest.guest_id,
      guest.property_id,
      activity_id,
      activity.vendor_id,
      activity_date,
      activity_time,
      activity.duration_minutes,
      num_participants,
      total_price,
      activity.currency,
      commission_amount,
      payment_status,
      payment_method,
      booking_status,
      guest_notes || null
    ).first()

    // Log analytics event
    await DB.prepare(`
      INSERT INTO analytics_events (property_id, guest_id, event_type, entity_id, metadata)
      VALUES (?, ?, 'booking_created', ?, ?)
    `).bind(guest.property_id, guest.guest_id, booking.booking_id, JSON.stringify({ payment_method })).run()

    return c.json({
      success: true,
      booking_id: booking.booking_id,
      booking_reference,
      status: booking_status,
      payment_required: payment_method !== 'pay_at_vendor',
      total_price,
      currency: activity.currency
    })
  } catch (error) {
    console.error('Booking creation error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Get booking details
app.get('/api/bookings/:booking_id', async (c) => {
  const { DB } = c.env
  const { booking_id } = c.req.param()
  const session_token = c.req.header('X-Session-Token')
  const lang = c.req.query('lang') || 'en'

  try {
    const booking = await DB.prepare(`
      SELECT 
        b.*,
        ${lang === 'ar' ? 'a.title_ar' : 'a.title_en'} as activity_title,
        a.images as activity_images,
        v.business_name as vendor_name,
        v.phone as vendor_phone,
        v.email as vendor_email,
        g.first_name,
        g.last_name,
        g.email as guest_email,
        g.phone as guest_phone
      FROM bookings b
      JOIN activities a ON b.activity_id = a.activity_id
      JOIN vendors v ON b.vendor_id = v.vendor_id
      JOIN guests g ON b.guest_id = g.guest_id
      WHERE b.booking_id = ? AND g.session_token = ?
    `).bind(booking_id, session_token).first()

    if (!booking) {
      return c.json({ error: 'Booking not found' }, 404)
    }

    return c.json({ booking })
  } catch (error) {
    console.error('Get booking error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Get guest's bookings
app.get('/api/my-bookings', async (c) => {
  const { DB } = c.env
  const session_token = c.req.header('X-Session-Token')
  const status = c.req.query('status') || 'upcoming'
  const lang = c.req.query('lang') || 'en'

  try {
    const guest = await DB.prepare(`
      SELECT guest_id FROM guests WHERE session_token = ?
    `).bind(session_token).first()

    if (!guest) {
      return c.json({ error: 'Invalid session' }, 401)
    }

    let query = `
      SELECT 
        b.*,
        ${lang === 'ar' ? 'a.title_ar' : 'a.title_en'} as activity_title,
        a.images as activity_images,
        v.business_name as vendor_name,
        v.phone as vendor_phone
      FROM bookings b
      JOIN activities a ON b.activity_id = a.activity_id
      JOIN vendors v ON b.vendor_id = v.vendor_id
      WHERE b.guest_id = ?
    `

    if (status === 'upcoming') {
      query += ` AND b.activity_date >= date('now') AND b.booking_status = 'confirmed'`
    } else if (status === 'past') {
      query += ` AND b.activity_date < date('now')`
    } else if (status === 'cancelled') {
      query += ` AND b.booking_status = 'cancelled'`
    }

    query += ` ORDER BY b.activity_date DESC, b.activity_time DESC`

    const bookings = await DB.prepare(query).bind(guest.guest_id).all()

    return c.json({ bookings: bookings.results })
  } catch (error) {
    console.error('Get bookings error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Cancel booking
app.post('/api/bookings/:booking_id/cancel', async (c) => {
  const { DB } = c.env
  const { booking_id } = c.req.param()
  const session_token = c.req.header('X-Session-Token')

  try {
    const booking = await DB.prepare(`
      SELECT b.*, g.session_token
      FROM bookings b
      JOIN guests g ON b.guest_id = g.guest_id
      WHERE b.booking_id = ?
    `).bind(booking_id).first()

    if (!booking || booking.session_token !== session_token) {
      return c.json({ error: 'Booking not found' }, 404)
    }

    if (booking.booking_status === 'cancelled') {
      return c.json({ error: 'Booking already cancelled' }, 400)
    }

    // Check cancellation policy
    const activity = await DB.prepare(`
      SELECT cancellation_policy_hours FROM activities WHERE activity_id = ?
    `).bind(booking.activity_id).first()

    const activityDateTime = new Date(`${booking.activity_date}T${booking.activity_time}`)
    const now = new Date()
    const hoursUntilActivity = (activityDateTime.getTime() - now.getTime()) / (1000 * 60 * 60)

    if (hoursUntilActivity < activity.cancellation_policy_hours) {
      return c.json({
        error: `Cancellation must be made at least ${activity.cancellation_policy_hours} hours before activity`,
        refund_eligible: false
      }, 400)
    }

    // Cancel booking
    await DB.prepare(`
      UPDATE bookings
      SET booking_status = 'cancelled', cancelled_at = datetime('now')
      WHERE booking_id = ?
    `).bind(booking_id).run()

    return c.json({
      success: true,
      message: 'Booking cancelled successfully',
      refund_eligible: booking.payment_status === 'paid'
    })
  } catch (error) {
    console.error('Cancel booking error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Get vendor profile
app.get('/api/vendors/:vendor_slug', async (c) => {
  const { DB } = c.env
  const { vendor_slug } = c.req.param()
  const property_id = c.req.query('property_id')
  const lang = c.req.query('lang') || 'en'

  try {
    const vendor = await DB.prepare(`
      SELECT 
        v.*,
        ${lang === 'ar' ? 'v.description_ar' : 'v.description_en'} as description,
        ${lang === 'ar' ? 'c.name_ar' : 'c.name_en'} as category_name
      FROM vendors v
      JOIN categories c ON v.category_id = c.category_id
      JOIN vendor_properties vp ON v.vendor_id = vp.vendor_id
      WHERE v.slug = ? AND vp.property_id = ? AND v.status = 'active'
    `).bind(vendor_slug, property_id).first()

    if (!vendor) {
      return c.json({ error: 'Vendor not found' }, 404)
    }

    // Get vendor's activities
    const activities = await DB.prepare(`
      SELECT 
        a.activity_id,
        ${lang === 'ar' ? 'a.title_ar' : 'a.title_en'} as title,
        ${lang === 'ar' ? 'a.short_description_ar' : 'a.short_description_en'} as short_description,
        a.images,
        a.duration_minutes,
        a.price,
        a.currency
      FROM activities a
      WHERE a.vendor_id = ? AND a.status = 'active'
      ORDER BY a.is_featured DESC, a.popularity_score DESC
    `).bind(vendor.vendor_id).all()

    return c.json({
      vendor: {
        ...vendor,
        cover_images: vendor.cover_images ? JSON.parse(vendor.cover_images) : [],
        certifications: vendor.certifications ? JSON.parse(vendor.certifications) : [],
        working_hours: vendor.working_hours ? JSON.parse(vendor.working_hours) : {},
        operating_hours: vendor.operating_hours ? JSON.parse(vendor.operating_hours) : {},
        social_media: vendor.social_media ? JSON.parse(vendor.social_media) : {},
        specialties: vendor.specialties ? JSON.parse(vendor.specialties) : [],
        languages_spoken: vendor.languages_spoken ? JSON.parse(vendor.languages_spoken) : []
      },
      activities: activities.results
    })
  } catch (error) {
    console.error('Vendor profile error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// ============================================
// VENDOR API ROUTES
// ============================================

// Vendor login
app.post('/api/vendor/login', async (c) => {
  const { DB } = c.env
  const { email, password } = await c.req.json()

  try {
    const vendor = await DB.prepare(`
      SELECT * FROM vendors WHERE email = ? AND status = 'active'
    `).bind(email).first()

    if (!vendor) {
      return c.json({ error: 'Invalid credentials' }, 401)
    }

    // Note: In production, use proper bcrypt password verification
    // For now, we're using the hashed password from seed data
    // You would normally do: const match = await bcrypt.compare(password, vendor.password_hash)
    
    return c.json({
      success: true,
      vendor: {
        vendor_id: vendor.vendor_id,
        business_name: vendor.business_name,
        email: vendor.email,
        slug: vendor.slug
      },
      // In production, generate and return a JWT token here
      token: `vendor-${vendor.vendor_id}-${Date.now()}`
    })
  } catch (error) {
    console.error('Vendor login error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Vendor dashboard stats
app.get('/api/vendor/dashboard', async (c) => {
  const { DB } = c.env
  const vendor_id = c.req.header('X-Vendor-ID')

  try {
    // Today's bookings
    const todayBookings = await DB.prepare(`
      SELECT COUNT(*) as count FROM bookings
      WHERE vendor_id = ? AND activity_date = date('now')
    `).bind(vendor_id).first()

    // This week's revenue
    const weekRevenue = await DB.prepare(`
      SELECT SUM(total_price - commission_amount) as revenue FROM bookings
      WHERE vendor_id = ? 
        AND activity_date >= date('now', 'weekday 0', '-7 days')
        AND payment_status = 'paid'
    `).bind(vendor_id).first()

    // Pending confirmations
    const pending = await DB.prepare(`
      SELECT COUNT(*) as count FROM bookings
      WHERE vendor_id = ? AND booking_status = 'pending'
    `).bind(vendor_id).first()

    // Upcoming bookings
    const upcoming = await DB.prepare(`
      SELECT 
        b.*,
        a.title_en as activity_title,
        g.first_name,
        g.last_name,
        g.email,
        g.phone
      FROM bookings b
      JOIN activities a ON b.activity_id = a.activity_id
      JOIN guests g ON b.guest_id = g.guest_id
      WHERE b.vendor_id = ? 
        AND b.activity_date >= date('now')
        AND b.booking_status = 'confirmed'
      ORDER BY b.activity_date, b.activity_time
      LIMIT 10
    `).bind(vendor_id).all()

    return c.json({
      kpis: {
        today_bookings: todayBookings.count,
        week_revenue: weekRevenue.revenue || 0,
        pending_confirmations: pending.count
      },
      upcoming_bookings: upcoming.results
    })
  } catch (error) {
    console.error('Vendor dashboard error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Get vendor bookings
app.get('/api/vendor/bookings', async (c) => {
  const { DB } = c.env
  const vendor_id = c.req.header('X-Vendor-ID')
  const status = c.req.query('status') || 'upcoming'
  const date_from = c.req.query('date_from')
  const date_to = c.req.query('date_to')

  try {
    let query = `
      SELECT 
        b.*,
        a.title_en as activity_title,
        g.first_name,
        g.last_name,
        g.email,
        g.phone
      FROM bookings b
      JOIN activities a ON b.activity_id = a.activity_id
      JOIN guests g ON b.guest_id = g.guest_id
      WHERE b.vendor_id = ?
    `
    const params = [vendor_id]

    if (status === 'upcoming') {
      query += ` AND b.activity_date >= date('now') AND b.booking_status = 'confirmed'`
    } else if (status === 'past') {
      query += ` AND b.activity_date < date('now')`
    } else if (status === 'pending') {
      query += ` AND b.booking_status = 'pending'`
    }

    if (date_from) {
      query += ` AND b.activity_date >= ?`
      params.push(date_from)
    }

    if (date_to) {
      query += ` AND b.activity_date <= ?`
      params.push(date_to)
    }

    query += ` ORDER BY b.activity_date DESC, b.activity_time DESC`

    const bookings = await DB.prepare(query).bind(...params).all()

    return c.json({ bookings: bookings.results })
  } catch (error) {
    console.error('Vendor bookings error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Update booking status (vendor confirms or completes)
app.patch('/api/vendor/bookings/:booking_id', async (c) => {
  const { DB } = c.env
  const { booking_id } = c.req.param()
  const vendor_id = c.req.header('X-Vendor-ID')
  const { status, vendor_notes, send_payment_link } = await c.req.json()

  try {
    const booking = await DB.prepare(`
      SELECT * FROM bookings WHERE booking_id = ? AND vendor_id = ?
    `).bind(booking_id, vendor_id).first()

    if (!booking) {
      return c.json({ error: 'Booking not found' }, 404)
    }

    // Update booking
    await DB.prepare(`
      UPDATE bookings
      SET booking_status = ?, vendor_notes = ?, payment_link_sent = ?, updated_at = datetime('now')
      WHERE booking_id = ?
    `).bind(status, vendor_notes || booking.vendor_notes, send_payment_link ? 1 : 0, booking_id).run()

    // TODO: If send_payment_link is true, send email with Stripe payment link

    return c.json({ success: true, message: 'Booking updated successfully' })
  } catch (error) {
    console.error('Update booking error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Get vendor activities
app.get('/api/vendor/activities', async (c) => {
  const { DB } = c.env
  const vendor_id = c.req.header('X-Vendor-ID')

  try {
    const activities = await DB.prepare(`
      SELECT 
        a.*,
        c.name_en as category_name
      FROM activities a
      JOIN categories c ON a.category_id = c.category_id
      WHERE a.vendor_id = ?
      ORDER BY a.created_at DESC
    `).bind(vendor_id).all()

    return c.json({ activities: activities.results })
  } catch (error) {
    console.error('Vendor activities error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Create new activity
app.post('/api/vendor/activities', async (c) => {
  const { DB } = c.env
  const vendor_id = c.req.header('X-Vendor-ID')
  const body = await c.req.json()

  try {
    const {
      category_id, title_en, title_ar, short_description_en, short_description_ar,
      full_description_en, full_description_ar, images, duration_minutes,
      capacity_per_slot, price, currency, price_type, requirements,
      includes, cancellation_policy_hours, status
    } = body

    const activity = await DB.prepare(`
      INSERT INTO activities (
        vendor_id, category_id, title_en, title_ar, short_description_en, short_description_ar,
        full_description_en, full_description_ar, images, duration_minutes, capacity_per_slot,
        price, currency, price_type, requirements, includes, cancellation_policy_hours, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING activity_id
    `).bind(
      vendor_id, category_id, title_en, title_ar || title_en,
      short_description_en, short_description_ar || short_description_en,
      full_description_en, full_description_ar || full_description_en,
      JSON.stringify(images), duration_minutes, capacity_per_slot,
      price, currency || 'USD', price_type || 'per_person',
      JSON.stringify(requirements), JSON.stringify(includes),
      cancellation_policy_hours || 24, status || 'draft'
    ).first()

    return c.json({ success: true, activity_id: activity.activity_id })
  } catch (error) {
    console.error('Create activity error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Upload activity image (simulated - returns data URL for now)
app.post('/api/vendor/upload-image', async (c) => {
  const { DB } = c.env
  const vendor_id = c.req.header('X-Vendor-ID')
  
  try {
    // In production, this would upload to Cloudflare R2
    // For now, we'll return a placeholder URL
    const formData = await c.req.formData()
    const image = formData.get('image')
    
    if (!image) {
      return c.json({ error: 'No image provided' }, 400)
    }
    
    // Generate placeholder image URL
    const timestamp = Date.now()
    const imageUrl = `/static/uploads/${vendor_id}_${timestamp}.jpg`
    
    return c.json({
      success: true,
      image_url: imageUrl,
      message: 'Image uploaded successfully'
    })
  } catch (error) {
    console.error('Image upload error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Get vendor profile
app.get('/api/vendor/profile', async (c) => {
  const { DB } = c.env
  const vendor_id = c.req.header('X-Vendor-ID')
  
  try {
    const profile = await DB.prepare(`
      SELECT 
        vendor_id, business_name, slug, email, phone, website,
        profile_image, description, address, city, country,
        operating_hours, social_media, specialties, years_experience,
        languages_spoken, safety_rating, status
      FROM vendors
      WHERE vendor_id = ?
    `).bind(vendor_id).first()
    
    if (!profile) {
      return c.json({ error: 'Vendor not found' }, 404)
    }
    
    return c.json({ profile })
  } catch (error) {
    console.error('Get vendor profile error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Update vendor profile
app.put('/api/vendor/profile', async (c) => {
  const { DB } = c.env
  const vendor_id = c.req.header('X-Vendor-ID')
  const body = await c.req.json()
  
  try {
    const {
      business_name, phone, website, description, address, city, country,
      operating_hours, social_media, specialties, years_experience, languages_spoken
    } = body
    
    await DB.prepare(`
      UPDATE vendors
      SET business_name = ?,
          phone = ?,
          website = ?,
          description = ?,
          address = ?,
          city = ?,
          country = ?,
          operating_hours = ?,
          social_media = ?,
          specialties = ?,
          years_experience = ?,
          languages_spoken = ?,
          updated_at = datetime('now')
      WHERE vendor_id = ?
    `).bind(
      business_name, phone, website || null, description || null,
      address || null, city || null, country || null,
      operating_hours ? JSON.stringify(operating_hours) : null,
      social_media ? JSON.stringify(social_media) : null,
      specialties ? JSON.stringify(specialties) : null,
      years_experience || null,
      languages_spoken ? JSON.stringify(languages_spoken) : null,
      vendor_id
    ).run()
    
    return c.json({ success: true, message: 'Profile updated successfully' })
  } catch (error) {
    console.error('Update vendor profile error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Upload vendor profile image
app.post('/api/vendor/upload-profile-image', async (c) => {
  const { DB } = c.env
  const vendor_id = c.req.header('X-Vendor-ID')
  
  try {
    const formData = await c.req.formData()
    const image = formData.get('image')
    
    if (!image) {
      return c.json({ error: 'No image provided' }, 400)
    }
    
    // Generate placeholder image URL (production: upload to R2)
    const timestamp = Date.now()
    const imageUrl = `/static/vendors/${vendor_id}_profile_${timestamp}.jpg`
    
    // Update vendor profile image
    await DB.prepare(`
      UPDATE vendors SET profile_image = ?, updated_at = datetime('now')
      WHERE vendor_id = ?
    `).bind(imageUrl, vendor_id).run()
    
    return c.json({
      success: true,
      image_url: imageUrl,
      message: 'Profile image uploaded successfully'
    })
  } catch (error) {
    console.error('Profile image upload error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Vendor registration with hotel code
app.post('/api/vendor/register', async (c) => {
  const { DB } = c.env
  const { registration_code, business_name, email, phone, password } = await c.req.json()
  
  try {
    // Validate registration code
    const property = await DB.prepare(`
      SELECT property_id, registration_code_expires_at 
      FROM properties 
      WHERE registration_code = ? AND status = 'active'
    `).bind(registration_code).first()
    
    if (!property) {
      return c.json({ error: 'Invalid registration code' }, 400)
    }
    
    // Check if code is expired
    const expiresAt = new Date(property.registration_code_expires_at)
    if (expiresAt < new Date()) {
      return c.json({ error: 'Registration code has expired' }, 400)
    }
    
    // Check if email already exists
    const existing = await DB.prepare(`
      SELECT vendor_id FROM vendors WHERE email = ?
    `).bind(email).first()
    
    if (existing) {
      return c.json({ error: 'Email already registered' }, 400)
    }
    
    // Create vendor
    const slug = business_name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    const vendor = await DB.prepare(`
      INSERT INTO vendors (business_name, slug, email, phone, password_hash, status)
      VALUES (?, ?, ?, ?, ?, 'active')
      RETURNING vendor_id
    `).bind(business_name, slug, email, phone, password).first()
    
    // Link vendor to property
    await DB.prepare(`
      INSERT INTO vendor_properties (vendor_id, property_id, registration_code_used, joined_via, commission_rate)
      VALUES (?, ?, ?, 'registration_code', 15)
    `).bind(vendor.vendor_id, property.property_id, registration_code).run()
    
    return c.json({
      success: true,
      vendor_id: vendor.vendor_id,
      message: 'Vendor registered successfully'
    })
  } catch (error) {
    console.error('Vendor registration error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// ============================================
// GUEST CALLBACK REQUESTS
// ============================================

// Submit callback request
app.post('/api/callback-request', async (c) => {
  const { DB } = c.env
  const { property_id, first_name, last_name, phone, email, preferred_time, message } = await c.req.json()
  
  try {
    const request = await DB.prepare(`
      INSERT INTO callback_requests (
        property_id, first_name, last_name, phone, email, preferred_time, message, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
      RETURNING request_id
    `).bind(property_id, first_name, last_name, phone, email || null, preferred_time || 'anytime', message || null).first()
    
    return c.json({
      success: true,
      request_id: request.request_id,
      message: 'Callback request submitted. We will contact you soon!'
    })
  } catch (error) {
    console.error('Callback request error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// ============================================
// SUPER ADMIN API ENDPOINTS
// ============================================

// Get platform stats
app.get('/api/superadmin/stats', async (c) => {
  const { DB } = c.env
  
  try {
    const hotels = await DB.prepare('SELECT COUNT(*) as count FROM properties').first()
    const vendors = await DB.prepare('SELECT COUNT(*) as count FROM vendors').first()
    const bookings = await DB.prepare('SELECT COUNT(*) as count, SUM(total_amount) as revenue FROM bookings').first()
    
    return c.json({
      total_hotels: hotels.count,
      total_vendors: vendors.count,
      total_bookings: bookings.count,
      total_revenue: bookings.revenue || 0
    })
  } catch (error) {
    console.error('Stats error:', error)
    return c.json({ error: 'Failed to load stats' }, 500)
  }
})

// Get all hotels
app.get('/api/superadmin/hotels', async (c) => {
  const { DB } = c.env
  
  try {
    const hotels = await DB.prepare(`
      SELECT property_id, name as property_name, slug, contact_email, contact_phone, 
             address as location, status, created_at
      FROM properties
      ORDER BY created_at DESC
    `).all()
    
    return c.json(hotels.results)
  } catch (error) {
    console.error('Get hotels error:', error)
    return c.json({ error: 'Failed to load hotels' }, 500)
  }
})

// Add new hotel
app.post('/api/superadmin/hotels', async (c) => {
  const { DB } = c.env
  const data = await c.req.json()
  
  try {
    // Create hotel property
    const property = await DB.prepare(`
      INSERT INTO properties (name, slug, contact_email, contact_phone, address, status)
      VALUES (?, ?, ?, ?, ?, 'active')
    `).bind(
      data.name,
      data.slug,
      data.contact_email,
      data.contact_phone || null,
      data.address || null
    ).run()
    
    // Create admin user for the hotel
    const adminResult = await DB.prepare(`
      INSERT INTO guests (email, name, phone, language_preference)
      VALUES (?, ?, ?, 'en')
    `).bind(data.contact_email, data.name + ' Admin', data.contact_phone || '').run()
    
    // Generate registration code for the hotel
    const code = Math.random().toString(36).substring(2, 10).toUpperCase()
    const expiry = new Date()
    expiry.setDate(expiry.getDate() + 30)
    
    await DB.prepare(`
      UPDATE properties 
      SET registration_code = ?, registration_code_expires_at = ?
      WHERE property_id = ?
    `).bind(code, expiry.toISOString(), property.meta.last_row_id).run()
    
    return c.json({
      success: true,
      property_id: property.meta.last_row_id,
      registration_code: code,
      message: 'Hotel created successfully'
    })
  } catch (error) {
    console.error('Create hotel error:', error)
    return c.json({ error: 'Failed to create hotel' }, 500)
  }
})

// Get all vendors
app.get('/api/superadmin/vendors', async (c) => {
  const { DB } = c.env
  
  try {
    const vendors = await DB.prepare(`
      SELECT 
        v.*,
        COUNT(DISTINCT vp.property_id) as property_count
      FROM vendors v
      LEFT JOIN vendor_properties vp ON v.vendor_id = vp.vendor_id
      GROUP BY v.vendor_id
      ORDER BY v.created_at DESC
    `).all()
    
    return c.json(vendors.results)
  } catch (error) {
    console.error('Get vendors error:', error)
    return c.json({ error: 'Failed to load vendors' }, 500)
  }
})

// Get all bookings
app.get('/api/superadmin/bookings', async (c) => {
  const { DB } = c.env
  
  try {
    const bookings = await DB.prepare(`
      SELECT 
        b.*,
        a.title_en as activity_title,
        p.name as property_name
      FROM activity_bookings b
      JOIN activities a ON b.activity_id = a.activity_id
      JOIN properties p ON b.property_id = p.property_id
      ORDER BY b.created_at DESC
      LIMIT 100
    `).all()
    
    return c.json(bookings.results)
  } catch (error) {
    console.error('Get bookings error:', error)
    return c.json({ error: 'Failed to load bookings' }, 500)
  }
})

// ============================================
// HOTEL ADMIN API ENDPOINTS
// ============================================

// Get callback requests (Admin)
app.get('/api/admin/callback-requests', async (c) => {
  const { DB } = c.env
  const property_id = c.req.query('property_id')
  const status = c.req.query('status') || 'pending'
  
  try {
    const requests = await DB.prepare(`
      SELECT * FROM callback_requests
      WHERE property_id = ? AND status = ?
      ORDER BY created_at DESC
      LIMIT 50
    `).bind(property_id, status).all()
    
    return c.json({ requests: requests.results })
  } catch (error) {
    console.error('Get callback requests error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// ============================================
// ADMIN API ROUTES
// ============================================

// Admin login
app.post('/api/admin/login', async (c) => {
  const { DB } = c.env
  const { email, password } = await c.req.json()

  try {
    const user = await DB.prepare(`
      SELECT * FROM users WHERE email = ? AND status = 'active'
    `).bind(email).first()

    if (!user) {
      return c.json({ error: 'Invalid credentials' }, 401)
    }

    // Note: In production, use proper bcrypt password verification
    
    return c.json({
      success: true,
      user: {
        user_id: user.user_id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        property_id: user.property_id
      },
      token: `admin-${user.user_id}-${Date.now()}`
    })
  } catch (error) {
    console.error('Admin login error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Admin dashboard stats
app.get('/api/admin/dashboard', async (c) => {
  const { DB } = c.env
  const property_id = c.req.header('X-Property-ID')

  try {
    // Today's bookings
    const todayBookings = await DB.prepare(`
      SELECT COUNT(*) as count FROM bookings
      WHERE property_id = ? AND activity_date = date('now')
    `).bind(property_id).first()

    // This month's revenue
    const monthRevenue = await DB.prepare(`
      SELECT SUM(total_price) as revenue FROM bookings
      WHERE property_id = ? 
        AND strftime('%Y-%m', activity_date) = strftime('%Y-%m', 'now')
        AND payment_status = 'paid'
    `).bind(property_id).first()

    // Active vendors
    const activeVendors = await DB.prepare(`
      SELECT COUNT(*) as count FROM vendor_properties vp
      JOIN vendors v ON vp.vendor_id = v.vendor_id
      WHERE vp.property_id = ? AND v.status = 'active'
    `).bind(property_id).first()

    // Guest engagement (QR scans vs bookings)
    const scans = await DB.prepare(`
      SELECT COUNT(*) as count FROM analytics_events
      WHERE property_id = ? AND event_type = 'qr_scan'
        AND date(timestamp) >= date('now', '-30 days')
    `).bind(property_id).first()

    const bookings = await DB.prepare(`
      SELECT COUNT(*) as count FROM bookings
      WHERE property_id = ? AND created_at >= datetime('now', '-30 days')
    `).bind(property_id).first()

    const engagement = scans.count > 0 ? Math.round((bookings.count / scans.count) * 100) : 0

    return c.json({
      kpis: {
        today_bookings: todayBookings.count,
        month_revenue: monthRevenue.revenue || 0,
        active_vendors: activeVendors.count,
        engagement_rate: engagement
      }
    })
  } catch (error) {
    console.error('Admin dashboard error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Get all rooms
app.get('/api/admin/rooms', async (c) => {
  const { DB } = c.env
  const property_id = c.req.query('property_id') || c.req.header('X-Property-ID')

  try {
    const rooms = await DB.prepare(`
      SELECT * FROM rooms WHERE property_id = ?
      ORDER BY room_number
    `).bind(property_id).all()

    return c.json(rooms.results)
  } catch (error) {
    console.error('Get rooms error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Create new room
app.post('/api/admin/rooms', async (c) => {
  const { DB } = c.env
  const property_id = c.req.header('X-Property-ID')
  const { room_number, room_type } = await c.req.json()

  try {
    const qr_code_data = `qr-${room_number}-${crypto.randomUUID()}`

    const room = await DB.prepare(`
      INSERT INTO rooms (property_id, room_number, room_type, qr_code_data, status)
      VALUES (?, ?, ?, ?, 'vacant')
      RETURNING room_id, qr_code_data
    `).bind(property_id, room_number, room_type || 'standard', qr_code_data).first()

    return c.json({
      success: true,
      room_id: room.room_id,
      qr_code_data: room.qr_code_data,
      qr_code_url: `/api/qr/${room.qr_code_data}`
    })
  } catch (error) {
    console.error('Create room error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Regenerate room QR code
app.post('/api/admin/rooms/:room_id/regenerate-qr', async (c) => {
  const { DB } = c.env
  const { room_id } = c.req.param()

  try {
    const room = await DB.prepare(`
      SELECT room_number FROM rooms WHERE room_id = ?
    `).bind(room_id).first()

    if (!room) {
      return c.json({ error: 'Room not found' }, 404)
    }

    const new_qr_code_data = `qr-${room.room_number}-${crypto.randomUUID()}`

    await DB.prepare(`
      UPDATE rooms
      SET qr_code_data = ?, updated_at = datetime('now')
      WHERE room_id = ?
    `).bind(new_qr_code_data, room_id).run()

    return c.json({
      success: true,
      qr_code_data: new_qr_code_data,
      qr_code_url: `/api/qr/${new_qr_code_data}`
    })
  } catch (error) {
    console.error('Regenerate QR error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Get all vendors
app.get('/api/admin/vendors', async (c) => {
  const { DB } = c.env
  const property_id = c.req.query('property_id')

  try {
    let query = `
      SELECT 
        v.*,
        c.name_en as category_name
      FROM vendors v
      LEFT JOIN categories c ON v.category_id = c.category_id
    `
    
    // If property_id provided, filter by vendor-property relationship
    if (property_id) {
      query += `
        INNER JOIN vendor_properties vp ON v.vendor_id = vp.vendor_id
        WHERE vp.property_id = ?
      `
    }
    
    query += ` ORDER BY v.created_at DESC`
    
    const vendors = property_id 
      ? await DB.prepare(query).bind(property_id).all()
      : await DB.prepare(query).all()

    return c.json(vendors.results)
  } catch (error) {
    console.error('Get vendors error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Update vendor status
app.patch('/api/admin/vendors/:vendor_id', async (c) => {
  const { DB } = c.env
  const { vendor_id } = c.req.param()
  const { status, commission_rate } = await c.req.json()

  try {
    await DB.prepare(`
      UPDATE vendors
      SET status = ?, commission_rate = COALESCE(?, commission_rate), updated_at = datetime('now')
      WHERE vendor_id = ?
    `).bind(status, commission_rate, vendor_id).run()

    return c.json({ success: true, message: 'Vendor updated successfully' })
  } catch (error) {
    console.error('Update vendor error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Get property registration code
app.get('/api/admin/registration-code', async (c) => {
  const { DB } = c.env
  const property_id = c.req.query('property_id')
  
  try {
    const property = await DB.prepare(`
      SELECT registration_code, registration_code_expires_at
      FROM properties
      WHERE property_id = ?
    `).bind(property_id).first()
    
    return c.json({
      registration_code: property.registration_code,
      expires_at: property.registration_code_expires_at
    })
  } catch (error) {
    console.error('Get registration code error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Regenerate property registration code
app.post('/api/admin/regenerate-registration-code', async (c) => {
  const { DB } = c.env
  const { property_id } = await c.req.json()
  
  try {
    // Generate new 8-character code
    const newCode = Math.random().toString(36).substring(2, 10).toUpperCase()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30) // Expires in 30 days
    
    await DB.prepare(`
      UPDATE properties
      SET registration_code = ?,
          registration_code_expires_at = ?
      WHERE property_id = ?
    `).bind(newCode, expiresAt.toISOString(), property_id).run()
    
    return c.json({
      success: true,
      registration_code: newCode,
      expires_at: expiresAt.toISOString()
    })
  } catch (error) {
    console.error('Regenerate registration code error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Get property design settings
app.get('/api/admin/property-settings', async (c) => {
  const { DB } = c.env
  const property_id = c.req.query('property_id')
  
  try {
    const property = await DB.prepare(`
      SELECT 
        slug, name, tagline, contact_email, contact_phone, address,
        brand_logo_url, hero_image_url, hero_image_effect, hero_overlay_opacity,
        primary_color, secondary_color, accent_color,
        layout_style, font_family, button_style, card_style, header_style, use_gradient,
        hotel_map_url, homepage_section_order, 
        show_restaurants, show_events, show_spa, show_service, show_activities, show_hotel_map
      FROM properties
      WHERE property_id = ?
    `).bind(property_id).first()
    
    // Provide defaults for visibility settings
    const settingsWithDefaults = {
      ...property,
      show_restaurants: property.show_restaurants ?? 1,
      show_events: property.show_events ?? 1,
      show_spa: property.show_spa ?? 1,
      show_service: property.show_service ?? 1,
      show_activities: property.show_activities ?? 1,
      show_hotel_map: property.show_hotel_map ?? 0,
      homepage_section_order: property.homepage_section_order || JSON.stringify(['restaurants', 'events', 'spa', 'service', 'activities'])
    }
    
    return c.json(settingsWithDefaults)
  } catch (error) {
    console.error('Get property settings error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Update property design settings
app.put('/api/admin/property-settings', async (c) => {
  const { DB } = c.env
  const data = await c.req.json()
  
  try {
    await DB.prepare(`
      UPDATE properties
      SET name = ?,
          tagline = ?,
          contact_email = ?,
          contact_phone = ?,
          address = ?,
          brand_logo_url = ?,
          hero_image_url = ?,
          hero_image_effect = ?,
          hero_overlay_opacity = ?,
          primary_color = ?,
          secondary_color = ?,
          accent_color = ?,
          layout_style = ?,
          font_family = ?,
          button_style = ?,
          card_style = ?,
          header_style = ?,
          use_gradient = ?,
          hotel_map_url = ?,
          homepage_section_order = ?,
          show_restaurants = ?,
          show_events = ?,
          show_spa = ?,
          show_service = ?,
          show_activities = ?,
          show_hotel_map = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE property_id = ?
    `).bind(
      data.name,
      data.tagline,
      data.contact_email,
      data.contact_phone,
      data.address,
      data.brand_logo_url,
      data.hero_image_url,
      data.hero_image_effect,
      data.hero_overlay_opacity,
      data.primary_color,
      data.secondary_color,
      data.accent_color,
      data.layout_style,
      data.font_family,
      data.button_style,
      data.card_style,
      data.header_style,
      data.use_gradient,
      data.hotel_map_url,
      data.homepage_section_order,
      data.show_restaurants,
      data.show_events,
      data.show_spa,
      data.show_service,
      data.show_activities,
      data.show_hotel_map,
      data.property_id
    ).run()
    
    return c.json({ success: true })
  } catch (error) {
    console.error('Update property settings error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Get all bookings (admin view)
app.get('/api/admin/bookings', async (c) => {
  const { DB } = c.env
  const property_id = c.req.header('X-Property-ID')

  try {
    const bookings = await DB.prepare(`
      SELECT 
        b.*,
        a.title_en as activity_title,
        v.business_name as vendor_name,
        g.first_name,
        g.last_name,
        g.email,
        g.phone
      FROM bookings b
      JOIN activities a ON b.activity_id = a.activity_id
      JOIN vendors v ON b.vendor_id = v.vendor_id
      JOIN guests g ON b.guest_id = g.guest_id
      WHERE b.property_id = ?
      ORDER BY b.created_at DESC
      LIMIT 100
    `).bind(property_id).all()

    return c.json({ bookings: bookings.results })
  } catch (error) {
    console.error('Admin bookings error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Create hotel offering (Admin)
app.post('/api/admin/offerings', async (c) => {
  const { DB } = c.env
  const data = await c.req.json()
  
  try {
    const result = await DB.prepare(`
      INSERT INTO hotel_offerings (
        property_id, offering_type, title_en, short_description_en, full_description_en,
        images, price, currency, duration_minutes, requires_booking, location,
        event_date, event_start_time, event_end_time, status, display_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'USD', ?, ?, ?, ?, ?, ?, 'active', 0)
    `).bind(
      data.property_id,
      data.offering_type,
      data.title_en,
      data.short_description_en,
      data.full_description_en,
      data.images,
      data.price || 0,
      data.duration_minutes,
      data.requires_booking ? 1 : 0,
      data.location,
      data.event_date,
      data.event_start_time,
      data.event_end_time
    ).run()
    
    return c.json({ 
      success: true,
      offering_id: result.meta.last_row_id
    })
  } catch (error) {
    console.error('Create offering error:', error)
    return c.json({ error: 'Failed to create offering' }, 500)
  }
})

// Update hotel offering (Admin)
app.put('/api/admin/offerings/:offering_id', async (c) => {
  const { DB } = c.env
  const { offering_id } = c.req.param()
  const data = await c.req.json()
  
  try {
    await DB.prepare(`
      UPDATE hotel_offerings SET
        title_en = ?, short_description_en = ?, full_description_en = ?,
        price = ?, location = ?, duration_minutes = ?,
        requires_booking = ?, images = ?,
        event_date = ?, event_start_time = ?, event_end_time = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE offering_id = ?
    `).bind(
      data.title_en,
      data.short_description_en,
      data.full_description_en,
      data.price || 0,
      data.location,
      data.duration_minutes,
      data.requires_booking ? 1 : 0,
      data.images,
      data.event_date,
      data.event_start_time,
      data.event_end_time,
      offering_id
    ).run()
    
    return c.json({ success: true })
  } catch (error) {
    console.error('Update offering error:', error)
    return c.json({ error: 'Failed to update offering' }, 500)
  }
})

// Delete hotel offering (Admin)
app.delete('/api/admin/offerings/:offering_id', async (c) => {
  const { DB } = c.env
  const { offering_id } = c.req.param()
  
  try {
    await DB.prepare(`
      DELETE FROM hotel_offerings WHERE offering_id = ?
    `).bind(offering_id).run()
    
    return c.json({ success: true })
  } catch (error) {
    console.error('Delete offering error:', error)
    return c.json({ error: 'Failed to delete offering' }, 500)
  }
})

// Auto-translate offering to all languages (Admin)
app.post('/api/admin/offerings/:offering_id/translate', async (c) => {
  const { DB } = c.env
  const { offering_id } = c.req.param()
  const { openai_api_key } = await c.req.json()
  
  if (!openai_api_key) {
    return c.json({ error: 'OpenAI API key required' }, 400)
  }
  
  try {
    // Get the offering
    const offering: any = await DB.prepare(`
      SELECT title_en, short_description_en, full_description_en
      FROM hotel_offerings WHERE offering_id = ?
    `).bind(offering_id).first()
    
    if (!offering) {
      return c.json({ error: 'Offering not found' }, 404)
    }
    
    // Translate to all languages
    const languages = ['ar', 'de', 'ru', 'pl', 'it', 'fr', 'cs', 'uk']
    const translations: any = {}
    
    for (const lang of languages) {
      const textsToTranslate = [
        offering.title_en,
        offering.short_description_en || '',
        offering.full_description_en || ''
      ]
      
      const translated = await translateWithAI(textsToTranslate, lang, openai_api_key)
      
      translations[`title_${lang}`] = translated[0] || offering.title_en
      translations[`short_description_${lang}`] = translated[1] || offering.short_description_en
      translations[`full_description_${lang}`] = translated[2] || offering.full_description_en
    }
    
    // Update database with translations
    await DB.prepare(`
      UPDATE hotel_offerings SET
        title_ar = ?, short_description_ar = ?, full_description_ar = ?,
        title_de = ?, short_description_de = ?, full_description_de = ?,
        title_ru = ?, short_description_ru = ?, full_description_ru = ?,
        title_pl = ?, short_description_pl = ?, full_description_pl = ?,
        title_it = ?, short_description_it = ?, full_description_it = ?,
        title_fr = ?, short_description_fr = ?, full_description_fr = ?,
        title_cs = ?, short_description_cs = ?, full_description_cs = ?,
        title_uk = ?, short_description_uk = ?, full_description_uk = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE offering_id = ?
    `).bind(
      translations.title_ar, translations.short_description_ar, translations.full_description_ar,
      translations.title_de, translations.short_description_de, translations.full_description_de,
      translations.title_ru, translations.short_description_ru, translations.full_description_ru,
      translations.title_pl, translations.short_description_pl, translations.full_description_pl,
      translations.title_it, translations.short_description_it, translations.full_description_it,
      translations.title_fr, translations.short_description_fr, translations.full_description_fr,
      translations.title_cs, translations.short_description_cs, translations.full_description_cs,
      translations.title_uk, translations.short_description_uk, translations.full_description_uk,
      offering_id
    ).run()
    
    return c.json({ 
      success: true,
      translations: translations,
      message: 'Translated to 8 languages successfully'
    })
  } catch (error) {
    console.error('Translation error:', error)
    return c.json({ error: 'Translation failed: ' + error }, 500)
  }
})

// Translate property tagline (Admin)
app.post('/api/admin/property/:property_id/translate-tagline', async (c) => {
  const { DB } = c.env
  const { property_id } = c.req.param()
  const { openai_api_key } = await c.req.json()
  
  if (!openai_api_key) {
    return c.json({ error: 'OpenAI API key required' }, 400)
  }
  
  try {
    const property: any = await DB.prepare(`
      SELECT tagline FROM properties WHERE property_id = ?
    `).bind(property_id).first()
    
    if (!property || !property.tagline) {
      return c.json({ error: 'Property or tagline not found' }, 404)
    }
    
    const languages = ['de', 'ru', 'pl', 'it', 'fr', 'cs', 'uk']
    const translations: any = {}
    
    for (const lang of languages) {
      const translated = await translateWithAI([property.tagline], lang, openai_api_key)
      translations[`tagline_${lang}`] = translated[0] || property.tagline
    }
    
    await DB.prepare(`
      UPDATE properties SET
        tagline_de = ?, tagline_ru = ?, tagline_pl = ?,
        tagline_it = ?, tagline_fr = ?, tagline_cs = ?, tagline_uk = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE property_id = ?
    `).bind(
      translations.tagline_de, translations.tagline_ru, translations.tagline_pl,
      translations.tagline_it, translations.tagline_fr, translations.tagline_cs, translations.tagline_uk,
      property_id
    ).run()
    
    return c.json({ success: true, translations })
  } catch (error) {
    console.error('Tagline translation error:', error)
    return c.json({ error: 'Translation failed' }, 500)
  }
})

// Remove vendor from hotel (Admin)
app.delete('/api/admin/vendors/:vendor_id/remove', async (c) => {
  const { DB } = c.env
  const { vendor_id } = c.req.param()
  const property_id = c.req.query('property_id')
  
  try {
    // Remove vendor-property link
    await DB.prepare(`
      DELETE FROM vendor_properties 
      WHERE vendor_id = ? AND property_id = ?
    `).bind(vendor_id, property_id).run()
    
    return c.json({ success: true, message: 'Vendor removed from hotel' })
  } catch (error) {
    console.error('Remove vendor error:', error)
    return c.json({ error: 'Failed to remove vendor' }, 500)
  }
})

// Get all activities (Admin)
app.get('/api/admin/activities', async (c) => {
  const { DB } = c.env
  const property_id = c.req.query('property_id')
  
  try {
    const activities = await DB.prepare(`
      SELECT 
        a.*,
        v.business_name,
        c.name_en as category_name
      FROM activities a
      JOIN vendors v ON a.vendor_id = v.vendor_id
      JOIN vendor_properties vp ON v.vendor_id = vp.vendor_id
      JOIN categories c ON a.category_id = c.category_id
      WHERE vp.property_id = ?
      ORDER BY a.created_at DESC
    `).bind(property_id).all()
    
    return c.json(activities.results)
  } catch (error) {
    console.error('Get activities error:', error)
    return c.json({ error: 'Failed to get activities' }, 500)
  }
})

// Delete activity (Admin)
app.delete('/api/admin/activities/:activity_id', async (c) => {
  const { DB } = c.env
  const { activity_id } = c.req.param()
  
  try {
    await DB.prepare(`
      UPDATE activities SET status = 'inactive' WHERE activity_id = ?
    `).bind(activity_id).run()
    
    return c.json({ success: true, message: 'Activity deactivated' })
  } catch (error) {
    console.error('Delete activity error:', error)
    return c.json({ error: 'Failed to delete activity' }, 500)
  }
})

// ============================================
// RESTAURANT TABLE BOOKING APIs
// ============================================

// Get all tables for a restaurant
app.get('/api/restaurant/:offering_id/tables', async (c) => {
  const { DB } = c.env
  const { offering_id } = c.req.param()
  
  try {
    const tables = await DB.prepare(`
      SELECT * FROM restaurant_tables 
      WHERE offering_id = ? AND is_active = 1
      ORDER BY table_number
    `).bind(offering_id).all()
    
    return c.json({ 
      success: true,
      tables: tables.results.map(t => ({
        ...t,
        features: t.features ? JSON.parse(t.features) : []
      }))
    })
  } catch (error) {
    console.error('Get tables error:', error)
    return c.json({ error: 'Failed to get tables' }, 500)
  }
})

// Create table (Admin)
app.post('/api/admin/restaurant/table', async (c) => {
  const { DB } = c.env
  const data = await c.req.json()
  
  try {
    const result = await DB.prepare(`
      INSERT INTO restaurant_tables (
        offering_id, table_number, table_name, capacity,
        position_x, position_y, width, height, shape, table_type, features
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      data.offering_id,
      data.table_number,
      data.table_name || null,
      data.capacity,
      data.position_x || 0,
      data.position_y || 0,
      data.width || 100,
      data.height || 80,
      data.shape || 'rectangle',
      data.table_type || 'standard',
      JSON.stringify(data.features || [])
    ).run()
    
    return c.json({ 
      success: true,
      table_id: result.meta.last_row_id
    })
  } catch (error) {
    console.error('Create table error:', error)
    return c.json({ error: 'Failed to create table' }, 500)
  }
})

// Update table (Admin)
app.put('/api/admin/restaurant/table/:table_id', async (c) => {
  const { DB } = c.env
  const { table_id } = c.req.param()
  const data = await c.req.json()
  
  try {
    await DB.prepare(`
      UPDATE restaurant_tables SET
        table_number = ?, table_name = ?, capacity = ?,
        position_x = ?, position_y = ?, width = ?, height = ?,
        shape = ?, table_type = ?, features = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE table_id = ?
    `).bind(
      data.table_number,
      data.table_name || null,
      data.capacity,
      data.position_x,
      data.position_y,
      data.width,
      data.height,
      data.shape,
      data.table_type,
      JSON.stringify(data.features || []),
      table_id
    ).run()
    
    return c.json({ success: true })
  } catch (error) {
    console.error('Update table error:', error)
    return c.json({ error: 'Failed to update table' }, 500)
  }
})

// Delete table (Admin)
app.delete('/api/admin/restaurant/table/:table_id', async (c) => {
  const { DB } = c.env
  const { table_id } = c.req.param()
  
  try {
    await DB.prepare(`
      UPDATE restaurant_tables SET is_active = 0 WHERE table_id = ?
    `).bind(table_id).run()
    
    return c.json({ success: true })
  } catch (error) {
    console.error('Delete table error:', error)
    return c.json({ error: 'Failed to delete table' }, 500)
  }
})

// Get dining sessions for a restaurant
app.get('/api/restaurant/:offering_id/sessions', async (c) => {
  const { DB } = c.env
  const { offering_id } = c.req.param()
  const date = c.req.query('date') || new Date().toISOString().split('T')[0]
  
  try {
    const sessions = await DB.prepare(`
      SELECT * FROM dining_sessions 
      WHERE offering_id = ? AND session_date = ?
      ORDER BY session_time
    `).bind(offering_id, date).all()
    
    return c.json({ 
      success: true,
      sessions: sessions.results
    })
  } catch (error) {
    console.error('Get sessions error:', error)
    return c.json({ error: 'Failed to get sessions' }, 500)
  }
})

// Create dining session (Admin)
app.post('/api/admin/restaurant/session', async (c) => {
  const { DB } = c.env
  const data = await c.req.json()
  
  try {
    const result = await DB.prepare(`
      INSERT INTO dining_sessions (
        offering_id, session_date, session_time, session_type,
        duration_minutes, max_capacity, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      data.offering_id,
      data.session_date,
      data.session_time,
      data.session_type,
      data.duration_minutes || 90,
      data.max_capacity,
      'available'
    ).run()
    
    return c.json({ 
      success: true,
      session_id: result.meta.last_row_id
    })
  } catch (error) {
    console.error('Create session error:', error)
    return c.json({ error: 'Failed to create session' }, 500)
  }
})

// Get table availability for a session
app.get('/api/restaurant/session/:session_id/availability', async (c) => {
  const { DB } = c.env
  const { session_id } = c.req.param()
  
  try {
    // Get session details
    const session = await DB.prepare(`
      SELECT * FROM dining_sessions WHERE session_id = ?
    `).bind(session_id).first()
    
    if (!session) {
      return c.json({ error: 'Session not found' }, 404)
    }
    
    // Get all tables for this restaurant
    const tables = await DB.prepare(`
      SELECT * FROM restaurant_tables 
      WHERE offering_id = ? AND is_active = 1
    `).bind(session.offering_id).all()
    
    // Get reserved tables for this session
    const reservations = await DB.prepare(`
      SELECT table_id FROM table_reservations 
      WHERE session_id = ? AND status != 'cancelled'
    `).bind(session_id).all()
    
    const reservedTableIds = new Set(reservations.results.map(r => r.table_id))
    
    const availableTables = tables.results.map(t => ({
      ...t,
      features: t.features ? JSON.parse(t.features) : [],
      is_available: !reservedTableIds.has(t.table_id)
    }))
    
    return c.json({ 
      success: true,
      session: session,
      tables: availableTables
    })
  } catch (error) {
    console.error('Get availability error:', error)
    return c.json({ error: 'Failed to get availability' }, 500)
  }
})

// Create table reservation
app.post('/api/restaurant/reserve', async (c) => {
  const { DB } = c.env
  const data = await c.req.json()
  
  try {
    // Validate table capacity
    const table = await DB.prepare(`
      SELECT capacity FROM restaurant_tables WHERE table_id = ?
    `).bind(data.table_id).first()
    
    if (!table) {
      return c.json({ error: 'Table not found' }, 404)
    }
    
    if (data.num_guests > table.capacity) {
      return c.json({ error: `Table capacity is ${table.capacity} guests` }, 400)
    }
    
    // Check if table is already booked
    const existing = await DB.prepare(`
      SELECT reservation_id FROM table_reservations 
      WHERE session_id = ? AND table_id = ? AND status != 'cancelled'
    `).bind(data.session_id, data.table_id).first()
    
    if (existing) {
      return c.json({ error: 'Table is already reserved' }, 400)
    }
    
    // Create reservation
    const result = await DB.prepare(`
      INSERT INTO table_reservations (
        session_id, table_id, guest_id, property_id,
        reservation_date, reservation_time, num_guests,
        special_requests, dietary_requirements, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed')
    `).bind(
      data.session_id,
      data.table_id,
      data.guest_id,
      data.property_id,
      data.reservation_date,
      data.reservation_time,
      data.num_guests,
      data.special_requests || null,
      data.dietary_requirements || null
    ).run()
    
    // Update session booking count
    await DB.prepare(`
      UPDATE dining_sessions 
      SET current_bookings = current_bookings + ?
      WHERE session_id = ?
    `).bind(data.num_guests, data.session_id).run()
    
    return c.json({ 
      success: true,
      reservation_id: result.meta.last_row_id,
      message: 'Table reserved successfully!'
    })
  } catch (error) {
    console.error('Create reservation error:', error)
    return c.json({ error: 'Failed to create reservation' }, 500)
  }
})

// Create offering booking (General bookings for restaurants, events, spa)
app.post('/api/offering-booking', async (c) => {
  const { DB } = c.env
  const data = await c.req.json()
  
  try {
    // Create guest record if doesn't exist
    let guest = await DB.prepare(`
      SELECT guest_id FROM guests WHERE email = ?
    `).bind(data.guest_email).first()
    
    let guestId = guest?.guest_id
    
    if (!guestId) {
      const newGuest = await DB.prepare(`
        INSERT INTO guests (email, name, phone, language_preference)
        VALUES (?, ?, ?, 'en')
      `).bind(data.guest_email, data.guest_name, data.guest_phone).run()
      guestId = newGuest.meta.last_row_id
    }
    
    // Create offering booking record
    const result = await DB.prepare(`
      INSERT INTO offering_bookings (
        offering_id, guest_id, property_id, booking_date,
        num_guests, total_amount, special_requests, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
    `).bind(
      data.offering_id,
      guestId,
      data.property_id,
      data.booking_date,
      data.num_guests,
      data.total_amount,
      data.special_requests || null
    ).run()
    
    return c.json({
      success: true,
      booking_id: result.meta.last_row_id,
      message: 'Booking request submitted! We will contact you shortly.'
    })
  } catch (error) {
    console.error('Create offering booking error:', error)
    return c.json({ error: 'Failed to create booking' }, 500)
  }
})

// Get reservations (Admin)
app.get('/api/admin/restaurant/reservations', async (c) => {
  const { DB } = c.env
  const offering_id = c.req.query('offering_id')
  const date = c.req.query('date') || new Date().toISOString().split('T')[0]
  
  try {
    const reservations = await DB.prepare(`
      SELECT 
        tr.*,
        rt.table_number,
        rt.table_name,
        ds.session_time,
        ds.session_type,
        g.first_name,
        g.last_name,
        g.email,
        g.phone
      FROM table_reservations tr
      JOIN restaurant_tables rt ON tr.table_id = rt.table_id
      JOIN dining_sessions ds ON tr.session_id = ds.session_id
      JOIN guests g ON tr.guest_id = g.guest_id
      WHERE rt.offering_id = ? AND tr.reservation_date = ?
      ORDER BY ds.session_time, rt.table_number
    `).bind(offering_id, date).all()
    
    return c.json({ 
      success: true,
      reservations: reservations.results
    })
  } catch (error) {
    console.error('Get reservations error:', error)
    return c.json({ error: 'Failed to get reservations' }, 500)
  }
})

// ============================================
// HOTEL LANDING PAGE & APIs
// ============================================

// API: Get property details
app.get('/api/properties', async (c) => {
  const { DB } = c.env
  const slug = c.req.query('slug')
  const property_id = c.req.query('property_id')
  
  try {
    let properties;
    
    if (slug) {
      properties = await DB.prepare(`
        SELECT * FROM properties WHERE slug = ? AND status = 'active'
      `).bind(slug).all()
    } else if (property_id) {
      properties = await DB.prepare(`
        SELECT * FROM properties WHERE property_id = ? AND status = 'active'
      `).bind(property_id).all()
    } else {
      properties = await DB.prepare(`
        SELECT * FROM properties WHERE status = 'active' ORDER BY name
      `).all()
    }
    
    return c.json({ 
      success: true,
      properties: properties.results
    })
  } catch (error) {
    console.error('Get properties error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// API: Get hotel offerings by property
app.get('/api/hotel-offerings/:property_id', async (c) => {
  const { DB } = c.env
  const { property_id } = c.req.param()
  const lang = c.req.query('lang') || 'en'
  const offering_type = c.req.query('type') // optional filter
  
  try {
    let query = `
      SELECT 
        ho.*,
        CASE 
          WHEN ? = 'ar' THEN COALESCE(ho.title_ar, ho.title_en)
          WHEN ? = 'de' THEN COALESCE(ho.title_de, ho.title_en)
          WHEN ? = 'ru' THEN COALESCE(ho.title_ru, ho.title_en)
          WHEN ? = 'pl' THEN COALESCE(ho.title_pl, ho.title_en)
          WHEN ? = 'it' THEN COALESCE(ho.title_it, ho.title_en)
          WHEN ? = 'fr' THEN COALESCE(ho.title_fr, ho.title_en)
          WHEN ? = 'cs' THEN COALESCE(ho.title_cs, ho.title_en)
          WHEN ? = 'uk' THEN COALESCE(ho.title_uk, ho.title_en)
          ELSE ho.title_en
        END as title,
        CASE 
          WHEN ? = 'ar' THEN COALESCE(ho.short_description_ar, ho.short_description_en)
          WHEN ? = 'de' THEN COALESCE(ho.short_description_de, ho.short_description_en)
          WHEN ? = 'ru' THEN COALESCE(ho.short_description_ru, ho.short_description_en)
          WHEN ? = 'pl' THEN COALESCE(ho.short_description_pl, ho.short_description_en)
          WHEN ? = 'it' THEN COALESCE(ho.short_description_it, ho.short_description_en)
          WHEN ? = 'fr' THEN COALESCE(ho.short_description_fr, ho.short_description_en)
          WHEN ? = 'cs' THEN COALESCE(ho.short_description_cs, ho.short_description_en)
          WHEN ? = 'uk' THEN COALESCE(ho.short_description_uk, ho.short_description_en)
          ELSE ho.short_description_en
        END as short_description,
        CASE 
          WHEN ? = 'ar' THEN COALESCE(ho.full_description_ar, ho.full_description_en)
          WHEN ? = 'de' THEN COALESCE(ho.full_description_de, ho.full_description_en)
          WHEN ? = 'ru' THEN COALESCE(ho.full_description_ru, ho.full_description_en)
          WHEN ? = 'pl' THEN COALESCE(ho.full_description_pl, ho.full_description_en)
          WHEN ? = 'it' THEN COALESCE(ho.full_description_it, ho.full_description_en)
          WHEN ? = 'fr' THEN COALESCE(ho.full_description_fr, ho.full_description_en)
          WHEN ? = 'cs' THEN COALESCE(ho.full_description_cs, ho.full_description_en)
          WHEN ? = 'uk' THEN COALESCE(ho.full_description_uk, ho.full_description_en)
          ELSE ho.full_description_en
        END as full_description
      FROM hotel_offerings ho
      WHERE ho.property_id = ?
        AND ho.status = 'active'
        ${offering_type ? 'AND ho.offering_type = ?' : ''}
      ORDER BY ho.is_featured DESC, ho.display_order ASC, ho.created_at DESC
    `
    
    // Build params array: 8 params for title + 8 for short_desc + 8 for full_desc + property_id + optional type
    const langParams = Array(24).fill(lang) // 8 CASE statements × 3 fields
    const params = offering_type 
      ? [...langParams, property_id, offering_type]
      : [...langParams, property_id]
    
    const offerings = await DB.prepare(query).bind(...params).all()
    
    return c.json({ 
      success: true,
      offerings: offerings.results.map(o => ({
        ...o,
        images: o.images ? JSON.parse(o.images) : [],
        includes: o.includes ? JSON.parse(o.includes) : []
      }))
    })
  } catch (error) {
    console.error('Get hotel offerings error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// API: Get linked vendor activities for a property
app.get('/api/property-vendor-activities/:property_id', async (c) => {
  const { DB } = c.env
  const { property_id } = c.req.param()
  const lang = c.req.query('lang') || 'en'
  
  try {
    const activities = await DB.prepare(`
      SELECT 
        a.*,
        v.business_name,
        v.slug as vendor_slug,
        c.name_en as category_name,
        CASE WHEN ? = 'ar' THEN a.title_ar ELSE a.title_en END as title,
        CASE WHEN ? = 'ar' THEN a.short_description_ar ELSE a.short_description_en END as short_description
      FROM activities a
      JOIN vendors v ON a.vendor_id = v.vendor_id
      JOIN vendor_properties vp ON v.vendor_id = vp.vendor_id
      JOIN categories c ON a.category_id = c.category_id
      WHERE vp.property_id = ?
        AND vp.status = 'active'
        AND a.status = 'active'
        AND v.status = 'active'
      ORDER BY a.is_featured DESC, a.popularity_score DESC
      LIMIT 50
    `).bind(lang, lang, property_id).all()
    
    return c.json({ 
      success: true,
      activities: activities.results.map(a => ({
        ...a,
        images: a.images ? JSON.parse(a.images) : []
      }))
    })
  } catch (error) {
    console.error('Get property vendor activities error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Hotel Landing Page - Main QR entry point
app.get('/hotel/:property_slug', async (c) => {
  const { property_slug } = c.req.param()
  
  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <meta name="apple-mobile-web-app-capable" content="yes">
        <meta name="mobile-web-app-capable" content="yes">
        <title>Welcome</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <style id="dynamic-styles">
          /* Dynamic styles will be injected here */
        </style>
        <style>
          body { 
            -webkit-font-smoothing: antialiased;
          }
          .offering-card {
            transition: all 0.3s ease;
          }
          .offering-card:active {
            transform: scale(0.98);
          }
          .category-pill {
            display: inline-block;
            padding: 0.5rem 1rem;
            border-radius: 9999px;
            font-size: 0.875rem;
            font-weight: 600;
            transition: all 0.2s;
          }
          .category-pill:active {
            transform: scale(0.95);
          }
          .sticky-nav {
            position: sticky;
            top: 0;
            z-index: 40;
            background: white;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          }
        </style>
    </head>
    <body class="bg-gray-50">
        <!-- Loading Spinner -->
        <div id="loading" class="fixed inset-0 bg-white z-50 flex items-center justify-center">
            <div class="text-center">
                <div class="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500 mx-auto"></div>
                <p class="mt-4 text-gray-600">Loading your experience...</p>
            </div>
        </div>

        <div id="content" class="hidden">
            <!-- Hero Header -->
            <div class="gradient-hero text-white py-12 px-4">
                <div class="max-w-6xl mx-auto text-center">
                    <h1 class="text-4xl md:text-5xl font-bold mb-3" id="propertyName">Paradise Resort</h1>
                    <p class="text-lg opacity-90" id="propertyTagline">Discover all we have to offer</p>
                </div>
            </div>

            <!-- Category Filter Pills -->
            <div class="sticky-nav py-4 px-4 overflow-x-auto">
                <div class="max-w-6xl mx-auto flex gap-2 whitespace-nowrap">
                    <button onclick="filterOfferings('all')" class="category-pill bg-blue-500 text-white" data-category="all">
                        <i class="fas fa-th-large mr-2"></i>All
                    </button>
                    <button onclick="filterOfferings('restaurant')" class="category-pill bg-gray-200 text-gray-700" data-category="restaurant">
                        <i class="fas fa-utensils mr-2"></i>Restaurants
                    </button>
                    <button onclick="filterOfferings('event')" class="category-pill bg-gray-200 text-gray-700" data-category="event">
                        <i class="fas fa-calendar-star mr-2"></i>Events
                    </button>
                    <button onclick="filterOfferings('spa')" class="category-pill bg-gray-200 text-gray-700" data-category="spa">
                        <i class="fas fa-spa mr-2"></i>Spa
                    </button>
                    <button onclick="filterOfferings('service')" class="category-pill bg-gray-200 text-gray-700" data-category="service">
                        <i class="fas fa-concierge-bell mr-2"></i>Services
                    </button>
                    <button onclick="filterOfferings('activities')" class="category-pill bg-gray-200 text-gray-700" data-category="activities">
                        <i class="fas fa-hiking mr-2"></i>Activities
                    </button>
                </div>
            </div>

            <!-- Main Content -->
            <div class="max-w-6xl mx-auto px-4 py-6 pb-20">
                
                <!-- Hotel Restaurants Section -->
                <section id="restaurants-section" class="mb-12">
                    <h2 class="text-2xl font-bold mb-4 flex items-center">
                        <i class="fas fa-utensils text-blue-500 mr-3"></i>
                        Our Restaurants
                    </h2>
                    <div id="restaurants-grid" class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <!-- Loaded dynamically -->
                    </div>
                </section>

                <!-- Upcoming Events Section -->
                <section id="events-section" class="mb-12">
                    <h2 class="text-2xl font-bold mb-4 flex items-center">
                        <i class="fas fa-calendar-star text-purple-500 mr-3"></i>
                        Upcoming Events
                    </h2>
                    <div id="events-grid" class="grid grid-cols-1 gap-4">
                        <!-- Loaded dynamically -->
                    </div>
                </section>

                <!-- Spa & Wellness Section -->
                <section id="spa-section" class="mb-12">
                    <h2 class="text-2xl font-bold mb-4 flex items-center">
                        <i class="fas fa-spa text-green-500 mr-3"></i>
                        Spa & Wellness
                    </h2>
                    <div id="spa-grid" class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <!-- Loaded dynamically -->
                    </div>
                </section>

                <!-- Hotel Services Section -->
                <section id="service-section" class="mb-12">
                    <h2 class="text-2xl font-bold mb-4 flex items-center">
                        <i class="fas fa-concierge-bell text-indigo-500 mr-3"></i>
                        Hotel Services
                    </h2>
                    <div id="service-grid" class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <!-- Loaded dynamically -->
                    </div>
                </section>

                <!-- Vendor Activities Section -->
                <section id="activities-section" class="mb-12">
                    <h2 class="text-2xl font-bold mb-4 flex items-center">
                        <i class="fas fa-hiking text-orange-500 mr-3"></i>
                        Activities & Experiences
                    </h2>
                    <p class="text-gray-600 mb-4 text-sm">Curated experiences from our trusted partners</p>
                    <div id="activities-grid" class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <!-- Loaded dynamically -->
                    </div>
                </section>
                
                <!-- Hotel Map Section -->
                <section id="hotel-map-section" class="mb-12" style="display: none;">
                    <h2 class="text-2xl font-bold mb-4 flex items-center">
                        <i class="fas fa-map text-indigo-500 mr-3"></i>
                        Hotel Map & Layout
                    </h2>
                    <div id="hotel-map-container" class="bg-white rounded-xl shadow-sm overflow-hidden">
                        <!-- Loaded dynamically -->
                    </div>
                </section>
            </div>
        </div>

        <script>
        const propertySlug = '${property_slug}';
        let propertyData = null;
        let allOfferings = [];
        let allActivities = [];
        let currentFilter = 'all';

        function applyDesignSettings(settings) {
          // Font family mapping
          const fontMap = {
            'inter': "'Inter', system-ui, sans-serif",
            'poppins': "'Poppins', sans-serif",
            'playfair': "'Playfair Display', serif",
            'montserrat': "'Montserrat', sans-serif",
            'lora': "'Lora', serif"
          };
          
          const primaryColor = settings.primary_color || '#3B82F6';
          const secondaryColor = settings.secondary_color || '#10B981';
          const accentColor = settings.accent_color || '#F59E0B';
          const fontFamily = fontMap[settings.font_family] || fontMap['inter'];
          const layoutStyle = settings.layout_style || 'modern';
          const buttonStyle = settings.button_style || 'rounded';
          const cardStyle = settings.card_style || 'shadow';
          const headerStyle = settings.header_style || 'transparent';
          const useGradient = settings.use_gradient || 0;
          const heroImageEffect = settings.hero_image_effect || 'none';
          const heroOverlay = (settings.hero_overlay_opacity || 30) / 100;
          
          // Logo
          if (settings.brand_logo_url) {
            const logoHtml = \`<img src="\${settings.brand_logo_url}" alt="Logo" class="h-16 mx-auto mb-3" />\`;
            document.getElementById('propertyName').insertAdjacentHTML('beforebegin', logoHtml);
          }
          
          // Gradient or solid color
          const heroBackground = useGradient ? 
            \`linear-gradient(135deg, \${primaryColor} 0%, \${secondaryColor} 100%)\` : 
            primaryColor;
          
          // Hero image filter effects
          let heroFilter = '';
          if (heroImageEffect === 'grayscale') heroFilter = 'grayscale(100%)';
          else if (heroImageEffect === 'sepia') heroFilter = 'sepia(80%)';
          else if (heroImageEffect === 'blur') heroFilter = 'blur(4px)';
          
          // Hero background with image and overlay
          const heroImageCSS = settings.hero_image_url ? \`
            background-image: 
              linear-gradient(rgba(0,0,0,\${heroOverlay}), rgba(0,0,0,\${heroOverlay})),
              url('\${settings.hero_image_url}');
            background-size: cover;
            background-position: center;
            \${heroFilter ? 'filter: ' + heroFilter + ';' : ''}
          \` : '';
          
          // Generate dynamic CSS based on layout style
          let dynamicCSS = '';
          
          if (layoutStyle === 'modern') {
            // Modern: Rounded cards, soft shadows, vibrant colors
            dynamicCSS = \`
              body {
                font-family: \${fontFamily};
                background: linear-gradient(to bottom, #f9fafb 0%, #ffffff 100%);
              }
              
              .gradient-hero {
                background: \${heroBackground};
                padding: 4rem 1rem;
                border-radius: 0 0 2rem 2rem;
                position: relative;
                \${heroImageCSS}
              }
              
              .offering-card {
                background: white;
                border-radius: 1.5rem;
                box-shadow: 0 4px 12px rgba(0,0,0,0.08);
                overflow: hidden;
                transition: transform 0.3s ease, box-shadow 0.3s ease;
              }
              
              .offering-card:hover {
                transform: translateY(-8px);
                box-shadow: 0 12px 24px rgba(0,0,0,0.15);
              }
              
              .offering-card img {
                border-radius: 0;
              }
              
              .category-pill {
                border-radius: 9999px;
                padding: 0.75rem 1.5rem;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
              }
              
              .category-pill.bg-blue-500 {
                background: \${useGradient ? heroBackground : primaryColor} !important;
              }
              
              button, .btn {
                border-radius: \${buttonStyle === 'pill' ? '9999px' : '0.75rem'};
                font-weight: 600;
                transition: all 0.3s ease;
              }
              
              .text-blue-500, .text-blue-600 {
                color: \${primaryColor} !important;
              }
              
              .bg-blue-600 {
                background: \${useGradient ? heroBackground : primaryColor} !important;
              }
              
              .bg-blue-600:hover {
                background: \${secondaryColor} !important;
                transform: scale(1.05);
              }
              
              .text-green-600 { color: \${secondaryColor} !important; }
              .text-orange-600 { color: \${accentColor} !important; }
              .bg-green-100 { background-color: \${secondaryColor}22 !important; color: \${secondaryColor} !important; }
              .bg-blue-100 { background-color: \${primaryColor}22 !important; color: \${primaryColor} !important; }
            \`;
          } else if (layoutStyle === 'elegant') {
            // Elegant: Borders, subtle colors, refined typography
            dynamicCSS = \`
              body {
                font-family: \${fontFamily};
                background: #fafafa;
              }
              
              .gradient-hero {
                background: \${heroBackground};
                padding: 5rem 1rem;
                border-bottom: 3px solid \${accentColor};
                position: relative;
                \${heroImageCSS}
              }
              
              .gradient-hero h1 {
                font-size: 3rem;
                letter-spacing: 0.05em;
                text-transform: uppercase;
                font-weight: 300;
              }
              
              .offering-card {
                background: white;
                border-radius: 0.25rem;
                border: 2px solid #e5e7eb;
                overflow: hidden;
                transition: border-color 0.3s ease, box-shadow 0.3s ease;
              }
              
              .offering-card:hover {
                border-color: \${primaryColor};
                box-shadow: 0 0 0 1px \${primaryColor};
              }
              
              .offering-card img {
                border-bottom: 1px solid #e5e7eb;
              }
              
              .category-pill {
                border-radius: 0.25rem;
                padding: 0.5rem 1.25rem;
                border: 1px solid currentColor;
                background: transparent !important;
                color: #374151;
                font-weight: 500;
                letter-spacing: 0.05em;
              }
              
              .category-pill.bg-blue-500 {
                background: \${primaryColor} !important;
                color: white !important;
                border-color: \${primaryColor} !important;
              }
              
              button, .btn {
                border-radius: 0.25rem;
                font-weight: 500;
                letter-spacing: 0.05em;
                border: 1px solid currentColor;
              }
              
              .text-blue-500, .text-blue-600 {
                color: \${primaryColor} !important;
              }
              
              .bg-blue-600 {
                background: \${primaryColor} !important;
                border-color: \${primaryColor} !important;
              }
              
              .bg-blue-600:hover {
                background: white !important;
                color: \${primaryColor} !important;
              }
              
              .text-green-600 { color: \${secondaryColor} !important; }
              .text-orange-600 { color: \${accentColor} !important; }
              .bg-green-100 { background-color: transparent !important; color: \${secondaryColor} !important; border: 1px solid \${secondaryColor}; }
              .bg-blue-100 { background-color: transparent !important; color: \${primaryColor} !important; border: 1px solid \${primaryColor}; }
            \`;
          } else if (layoutStyle === 'minimal') {
            // Minimal: Flat, clean, lots of whitespace
            dynamicCSS = \`
              body {
                font-family: \${fontFamily};
                background: white;
              }
              
              .gradient-hero {
                background: \${heroBackground};
                padding: 6rem 1rem 3rem;
                position: relative;
                \${heroImageCSS}
              }
              
              .gradient-hero h1 {
                font-size: 2.5rem;
                font-weight: 700;
                letter-spacing: -0.02em;
              }
              
              .offering-card {
                background: #f9fafb;
                border-radius: 0.5rem;
                border: 1px solid #e5e7eb;
                overflow: hidden;
                transition: background-color 0.2s ease;
              }
              
              .offering-card:hover {
                background: white;
              }
              
              .offering-card img {
                border-radius: 0;
              }
              
              .category-pill {
                border-radius: 0.375rem;
                padding: 0.5rem 1rem;
                background: #f3f4f6 !important;
                color: #374151;
                font-weight: 500;
                font-size: 0.875rem;
              }
              
              .category-pill.bg-blue-500 {
                background: \${primaryColor} !important;
                color: white !important;
              }
              
              button, .btn {
                border-radius: 0.5rem;
                font-weight: 600;
                padding: 0.75rem 1.5rem;
              }
              
              .text-blue-500, .text-blue-600 {
                color: \${primaryColor} !important;
              }
              
              .bg-blue-600 {
                background: \${primaryColor} !important;
              }
              
              .bg-blue-600:hover {
                opacity: 0.9;
              }
              
              .text-green-600 { color: \${secondaryColor} !important; }
              .text-orange-600 { color: \${accentColor} !important; }
              .bg-green-100 { background-color: \${secondaryColor}11 !important; color: \${secondaryColor} !important; }
              .bg-blue-100 { background-color: \${primaryColor}11 !important; color: \${primaryColor} !important; }
            \`;
          }
          
          document.getElementById('dynamic-styles').textContent = dynamicCSS;
        }

        async function init() {
            try {
                // Get property details
                const propResponse = await fetch(\`/api/properties?slug=\${propertySlug}\`);
                const propData = await propResponse.json();
                
                if (!propData.properties || propData.properties.length === 0) {
                    throw new Error('Property not found');
                }
                
                propertyData = propData.properties[0];
                document.getElementById('propertyName').textContent = propertyData.name;
                if (propertyData.tagline) {
                  document.getElementById('propertyTagline').textContent = propertyData.tagline;
                }
                document.title = propertyData.name;
                
                // Apply design settings
                applyDesignSettings(propertyData);
                
                // Load hotel offerings
                const offeringsResponse = await fetch(\`/api/hotel-offerings/\${propertyData.property_id}\`);
                const offeringsData = await offeringsResponse.json();
                allOfferings = offeringsData.offerings || [];
                
                // Load vendor activities
                const activitiesResponse = await fetch(\`/api/property-vendor-activities/\${propertyData.property_id}\`);
                const activitiesData = await activitiesResponse.json();
                allActivities = activitiesData.activities || [];
                
                // Render all content
                renderContent();
                
                // Hide loading, show content
                document.getElementById('loading').classList.add('hidden');
                document.getElementById('content').classList.remove('hidden');
                
            } catch (error) {
                console.error('Initialization error:', error);
                document.getElementById('loading').innerHTML = \`
                    <div class="text-center">
                        <i class="fas fa-exclamation-triangle text-red-500 text-5xl mb-4"></i>
                        <p class="text-gray-600">Unable to load content</p>
                        <button onclick="location.reload()" class="mt-4 px-6 py-2 bg-blue-500 text-white rounded-lg">
                            Try Again
                        </button>
                    </div>
                \`;
            }
        }

        function renderContent() {
            // Get section order from property settings
            const sectionOrder = propertyData.homepage_section_order ? 
              JSON.parse(propertyData.homepage_section_order) : 
              ['restaurants', 'events', 'spa', 'service', 'activities'];
            
            // Get container
            const container = document.querySelector('.max-w-6xl.mx-auto.px-4.py-6');
            
            // Collect all section elements
            const sectionElements = {
              'restaurants': document.getElementById('restaurants-section'),
              'events': document.getElementById('events-section'),
              'spa': document.getElementById('spa-section'),
              'service': document.getElementById('service-section'),
              'activities': document.getElementById('activities-section'),
              'hotel-map': document.getElementById('hotel-map-section')
            };
            
            // Detach all sections
            Object.values(sectionElements).forEach(el => {
              if (el && el.parentNode) {
                el.parentNode.removeChild(el);
              }
            });
            
            // Re-append in specified order
            sectionOrder.forEach(section => {
              if (sectionElements[section]) {
                container.appendChild(sectionElements[section]);
              }
            });
            
            // Always append hotel map at the end
            if (sectionElements['hotel-map']) {
              container.appendChild(sectionElements['hotel-map']);
            }
            
            // Render each section's content
            renderRestaurants();
            renderEvents();
            renderSpa();
            renderServices();
            renderActivities();
            renderHotelMap();
            updateSectionVisibility();
        }

        function renderRestaurants() {
            const restaurants = allOfferings.filter(o => o.offering_type === 'restaurant');
            const grid = document.getElementById('restaurants-grid');
            
            if (restaurants.length === 0) {
                grid.innerHTML = '<p class="text-gray-500 col-span-full">No restaurants available</p>';
                return;
            }
            
            grid.innerHTML = restaurants.map(r => \`
                <div class="offering-card bg-white rounded-xl shadow-sm overflow-hidden" onclick="viewOffering(\${r.offering_id})">
                    <img src="\${r.images[0] || '/static/placeholder.jpg'}" 
                         alt="\${r.title}" 
                         class="w-full h-40 object-cover">
                    <div class="p-4">
                        <div class="flex items-center justify-between mb-2">
                            <h3 class="font-bold text-lg">\${r.title}</h3>
                            \${r.requires_booking ? '<span class="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Booking Required</span>' : '<span class="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Walk-in Welcome</span>'}
                        </div>
                        <p class="text-sm text-gray-600 mb-3">\${r.short_description}</p>
                        <div class="flex items-center justify-between text-sm">
                            <span class="text-gray-500">
                                <i class="fas fa-map-marker-alt mr-1"></i>\${r.location}
                            </span>
                            <span class="font-semibold text-blue-600">\${r.price ? r.currency + ' ' + r.price : 'Free'}</span>
                        </div>
                    </div>
                </div>
            \`).join('');
        }

        function renderEvents() {
            const events = allOfferings.filter(o => o.offering_type === 'event');
            const grid = document.getElementById('events-grid');
            
            if (events.length === 0) {
                grid.innerHTML = '<p class="text-gray-500">No upcoming events</p>';
                return;
            }
            
            grid.innerHTML = events.map(e => \`
                <div class="offering-card bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl shadow-sm p-4" onclick="viewOffering(\${e.offering_id})">
                    <div class="flex gap-4">
                        <img src="\${e.images[0] || '/static/placeholder.jpg'}" 
                             alt="\${e.title}" 
                             class="w-24 h-24 rounded-lg object-cover flex-shrink-0">
                        <div class="flex-1">
                            <h3 class="font-bold text-lg mb-1">\${e.title}</h3>
                            <p class="text-sm text-gray-600 mb-2">\${e.short_description}</p>
                            <div class="flex items-center gap-3 text-sm text-gray-700">
                                \${e.event_date ? '<span><i class="fas fa-calendar mr-1"></i>' + new Date(e.event_date).toLocaleDateString() + '</span>' : ''}
                                \${e.event_start_time ? '<span><i class="fas fa-clock mr-1"></i>' + e.event_start_time + '</span>' : ''}
                                <span class="font-semibold text-purple-600">\${e.currency} \${e.price}</span>
                            </div>
                        </div>
                    </div>
                </div>
            \`).join('');
        }

        function renderSpa() {
            const spa = allOfferings.filter(o => o.offering_type === 'spa');
            const grid = document.getElementById('spa-grid');
            
            if (spa.length === 0) {
                grid.innerHTML = '<p class="text-gray-500 col-span-full">No spa services available</p>';
                return;
            }
            
            grid.innerHTML = spa.map(s => \`
                <div class="offering-card bg-white rounded-xl shadow-sm overflow-hidden" onclick="viewOffering(\${s.offering_id})">
                    <img src="\${s.images[0] || '/static/placeholder.jpg'}" 
                         alt="\${s.title}" 
                         class="w-full h-40 object-cover">
                    <div class="p-4">
                        <h3 class="font-bold text-lg mb-2">\${s.title}</h3>
                        <p class="text-sm text-gray-600 mb-3">\${s.short_description}</p>
                        <div class="flex items-center justify-between text-sm">
                            <span class="text-gray-500">
                                <i class="fas fa-clock mr-1"></i>\${s.duration_minutes} min
                            </span>
                            <span class="font-semibold text-green-600">\${s.currency} \${s.price}</span>
                        </div>
                    </div>
                </div>
            \`).join('');
        }

        function renderServices() {
            const services = allOfferings.filter(o => o.offering_type === 'service');
            const grid = document.getElementById('service-grid');
            
            if (services.length === 0) {
                grid.innerHTML = '<p class="text-gray-500 col-span-full">No services available</p>';
                return;
            }
            
            grid.innerHTML = services.map(s => \`
                <div class="offering-card bg-white rounded-xl shadow-sm overflow-hidden" onclick="viewOffering(\${s.offering_id})">
                    <img src="\${s.images[0] || '/static/placeholder.jpg'}" 
                         alt="\${s.title}" 
                         class="w-full h-40 object-cover">
                    <div class="p-4">
                        <h3 class="font-bold text-lg mb-2">\${s.title}</h3>
                        <p class="text-sm text-gray-600 mb-3">\${s.short_description}</p>
                        <div class="flex items-center justify-between text-sm">
                            <span class="text-gray-500">
                                <i class="fas fa-concierge-bell mr-1"></i>\${s.location || 'Hotel Service'}
                            </span>
                            <span class="font-semibold text-indigo-600">\${s.price ? s.currency + ' ' + s.price : 'Complimentary'}</span>
                        </div>
                    </div>
                </div>
            \`).join('');
        }

        function renderActivities() {
            const grid = document.getElementById('activities-grid');
            
            if (allActivities.length === 0) {
                grid.innerHTML = '<p class="text-gray-500 col-span-full">No activities available</p>';
                return;
            }
            
            grid.innerHTML = allActivities.map(a => \`
                <div class="offering-card bg-white rounded-xl shadow-sm overflow-hidden" onclick="viewActivity(\${a.activity_id})">
                    <img src="\${a.images[0] || '/static/placeholder.jpg'}" 
                         alt="\${a.title}" 
                         class="w-full h-40 object-cover">
                    <div class="p-4">
                        <div class="flex items-center justify-between mb-2">
                            <h3 class="font-bold text-lg">\${a.title}</h3>
                            <span class="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">\${a.category_name}</span>
                        </div>
                        <p class="text-sm text-gray-500 mb-1">by \${a.business_name}</p>
                        <p class="text-sm text-gray-600 mb-3">\${a.short_description}</p>
                        <div class="flex items-center justify-between text-sm">
                            <span class="text-gray-500">
                                <i class="fas fa-clock mr-1"></i>\${a.duration_minutes} min
                            </span>
                            <span class="font-semibold text-orange-600">\${a.currency} \${a.price}</span>
                        </div>
                    </div>
                </div>
            \`).join('');
        }

        function renderHotelMap() {
            const mapSection = document.getElementById('hotel-map-section');
            const mapContainer = document.getElementById('hotel-map-container');
            
            if (propertyData.show_hotel_map === 1 && propertyData.hotel_map_url) {
                mapSection.style.display = 'block';
                mapContainer.innerHTML = \`
                    <div class="relative">
                        <img src="\${propertyData.hotel_map_url}" 
                             alt="Hotel Map" 
                             class="w-full h-auto"
                             style="max-height: 600px; object-fit: contain;">
                        <div class="absolute top-4 right-4 bg-white bg-opacity-90 rounded-lg p-3 shadow-lg">
                            <p class="text-xs text-gray-600 font-medium">
                                <i class="fas fa-info-circle mr-1"></i>
                                Click to view full size
                            </p>
                        </div>
                    </div>
                \`;
                
                // Make map clickable to open in new window
                mapContainer.querySelector('img').addEventListener('click', () => {
                    window.open(propertyData.hotel_map_url, '_blank');
                });
                mapContainer.querySelector('img').style.cursor = 'pointer';
            } else {
                mapSection.style.display = 'none';
            }
        }

        function updateSectionVisibility() {
            const sections = {
                'restaurants': document.getElementById('restaurants-section'),
                'events': document.getElementById('events-section'),
                'spa': document.getElementById('spa-section'),
                'service': document.getElementById('service-section'),
                'activities': document.getElementById('activities-section')
            };
            
            // First, apply visibility settings from property data
            if (propertyData) {
                if (propertyData.show_restaurants === 0) {
                    sections.restaurants.style.display = 'none';
                }
                if (propertyData.show_events === 0) {
                    sections.events.style.display = 'none';
                }
                if (propertyData.show_spa === 0) {
                    sections.spa.style.display = 'none';
                }
                if (propertyData.show_service === 0) {
                    sections.service.style.display = 'none';
                }
                if (propertyData.show_activities === 0) {
                    sections.activities.style.display = 'none';
                }
            }
            
            // Then apply category filter on top
            if (currentFilter === 'all') {
                // Show all sections that are enabled
                if (propertyData) {
                    if (propertyData.show_restaurants === 1) sections.restaurants.style.display = 'block';
                    if (propertyData.show_events === 1) sections.events.style.display = 'block';
                    if (propertyData.show_spa === 1) sections.spa.style.display = 'block';
                    if (propertyData.show_service === 1) sections.service.style.display = 'block';
                    if (propertyData.show_activities === 1) sections.activities.style.display = 'block';
                }
            } else if (currentFilter === 'restaurant') {
                sections.restaurants.style.display = (propertyData && propertyData.show_restaurants === 1) ? 'block' : 'none';
                sections.events.style.display = 'none';
                sections.spa.style.display = 'none';
                sections.service.style.display = 'none';
                sections.activities.style.display = 'none';
            } else if (currentFilter === 'event') {
                sections.restaurants.style.display = 'none';
                sections.events.style.display = (propertyData && propertyData.show_events === 1) ? 'block' : 'none';
                sections.spa.style.display = 'none';
                sections.service.style.display = 'none';
                sections.activities.style.display = 'none';
            } else if (currentFilter === 'spa') {
                sections.restaurants.style.display = 'none';
                sections.events.style.display = 'none';
                sections.spa.style.display = (propertyData && propertyData.show_spa === 1) ? 'block' : 'none';
                sections.service.style.display = 'none';
                sections.activities.style.display = 'none';
            } else if (currentFilter === 'service') {
                sections.restaurants.style.display = 'none';
                sections.events.style.display = 'none';
                sections.spa.style.display = 'none';
                sections.service.style.display = (propertyData && propertyData.show_service === 1) ? 'block' : 'none';
                sections.activities.style.display = 'none';
            } else if (currentFilter === 'activities') {
                sections.restaurants.style.display = 'none';
                sections.events.style.display = 'none';
                sections.spa.style.display = 'none';
                sections.service.style.display = 'none';
                sections.activities.style.display = (propertyData && propertyData.show_activities === 1) ? 'block' : 'none';
            }
        }

        function filterOfferings(category) {
            currentFilter = category;
            
            // Update pill styles
            document.querySelectorAll('.category-pill').forEach(pill => {
                if (pill.dataset.category === category) {
                    pill.className = 'category-pill bg-blue-500 text-white';
                } else {
                    pill.className = 'category-pill bg-gray-200 text-gray-700';
                }
            });
            
            updateSectionVisibility();
        }

        function viewOffering(offeringId) {
            window.location.href = '/offering-detail?id=' + offeringId + '&property=' + propertyData.property_id;
        }

        function viewActivity(activityId) {
            window.location.href = '/activity?id=' + activityId + '&property=' + propertyData.property_id;
        }

        // Initialize on load
        init();
        </script>
    </body>
    </html>
  `)
})

// ============================================
// OFFERING DETAIL PAGE - Booking page for restaurants, events, spa
app.get('/offering-detail', async (c) => {
  const offering_id = c.req.query('id')
  const property_id = c.req.query('property')
  
  return c.html(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Book Now</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
</head>
<body class="bg-gray-50">
    <div id="loading" class="fixed inset-0 bg-white z-50 flex items-center justify-center">
        <div class="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500"></div>
    </div>

    <div id="content" class="hidden">
        <!-- Header -->
        <div class="bg-gradient-to-r from-blue-700 to-indigo-700 text-white py-6 px-4">
            <div class="max-w-4xl mx-auto">
                <a href="/hotel/paradise-resort" class="text-white/80 hover:text-white mb-2 inline-block">
                    <i class="fas fa-arrow-left mr-2"></i>Back to hotel
                </a>
                <h1 class="text-3xl font-bold" id="offeringTitle">Loading...</h1>
                <p class="text-white/80" id="offeringLocation"></p>
            </div>
        </div>

        <!-- Main Content -->
        <div class="max-w-4xl mx-auto px-4 py-6">
            <!-- Offering Details -->
            <div class="bg-white rounded-xl shadow-lg overflow-hidden mb-6">
                <img id="offeringImage" src="" alt="" class="w-full h-64 object-cover">
                <div class="p-6">
                    <div class="flex items-center gap-2 mb-4" id="offeringMeta"></div>
                    <h2 class="text-2xl font-bold mb-3">About</h2>
                    <p class="text-gray-600 mb-6" id="offeringDescription"></p>
                    
                    <div id="eventDetails" class="hidden mb-6">
                        <h3 class="font-bold text-lg mb-2">Event Details</h3>
                        <div class="space-y-2 text-gray-700">
                            <div><i class="fas fa-calendar mr-2 text-blue-500"></i><span id="eventDate"></span></div>
                            <div><i class="fas fa-clock mr-2 text-blue-500"></i><span id="eventTime"></span></div>
                        </div>
                    </div>

                    <div class="border-t pt-6">
                        <h3 class="font-bold text-lg mb-4">Book Your Experience</h3>
                        <form id="bookingForm" class="space-y-4">
                            <div class="grid md:grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-sm font-medium mb-2">Your Name</label>
                                    <input type="text" id="guestName" required class="w-full px-4 py-2 border rounded-lg">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium mb-2">Phone Number</label>
                                    <input type="tel" id="guestPhone" required class="w-full px-4 py-2 border rounded-lg">
                                </div>
                            </div>
                            <div>
                                <label class="block text-sm font-medium mb-2">Email</label>
                                <input type="email" id="guestEmail" required class="w-full px-4 py-2 border rounded-lg">
                            </div>
                            <div id="restaurantFields" class="hidden">
                                <label class="block text-sm font-medium mb-2">Preferred Date & Time</label>
                                <input type="datetime-local" id="bookingDateTime" class="w-full px-4 py-2 border rounded-lg">
                            </div>
                            <div>
                                <label class="block text-sm font-medium mb-2">Number of Guests</label>
                                <input type="number" id="numGuests" min="1" value="2" required class="w-full px-4 py-2 border rounded-lg">
                            </div>
                            <div>
                                <label class="block text-sm font-medium mb-2">Special Requests (Optional)</label>
                                <textarea id="specialRequests" rows="3" class="w-full px-4 py-2 border rounded-lg"></textarea>
                            </div>
                            
                            <div class="bg-blue-50 p-4 rounded-lg">
                                <div class="flex justify-between items-center mb-2">
                                    <span class="font-medium">Price per person:</span>
                                    <span class="text-xl font-bold text-blue-600" id="priceDisplay"></span>
                                </div>
                                <div class="flex justify-between items-center text-gray-700">
                                    <span>Total:</span>
                                    <span class="text-2xl font-bold" id="totalPrice">$0</span>
                                </div>
                            </div>

                            <button type="submit" class="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700">
                                <i class="fas fa-check-circle mr-2"></i>Confirm Booking
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script>
        let offeringData = null;
        const offeringId = '${offering_id}';
        const propertyId = '${property_id}';

        async function init() {
            try {
                const response = await fetch('/api/hotel-offerings/' + propertyId);
                const data = await response.json();
                const offerings = data.offerings || [];
                offeringData = offerings.find(o => o.offering_id == offeringId);

                if (!offeringData) {
                    alert('Offering not found');
                    window.location.href = '/hotel/paradise-resort';
                    return;
                }

                renderOffering();
                document.getElementById('loading').classList.add('hidden');
                document.getElementById('content').classList.remove('hidden');
            } catch (error) {
                console.error('Error loading offering:', error);
                alert('Failed to load offering details');
            }
        }

        function renderOffering() {
            document.getElementById('offeringTitle').textContent = offeringData.title;
            document.getElementById('offeringLocation').textContent = offeringData.location || '';
            document.getElementById('offeringImage').src = (offeringData.images && offeringData.images[0]) || '/static/placeholder.jpg';
            document.getElementById('offeringDescription').textContent = offeringData.full_description || offeringData.short_description;
            document.getElementById('priceDisplay').textContent = (offeringData.currency || 'USD') + ' ' + (offeringData.price || '0');

            // Show event details if it's an event
            if (offeringData.offering_type === 'event' && offeringData.event_date) {
                document.getElementById('eventDetails').classList.remove('hidden');
                const date = new Date(offeringData.event_date);
                document.getElementById('eventDate').textContent = date.toLocaleDateString();
                if (offeringData.event_start_time) {
                    document.getElementById('eventTime').textContent = offeringData.event_start_time + (offeringData.event_end_time ? ' - ' + offeringData.event_end_time : '');
                }
            }

            // Show restaurant-specific fields
            if (offeringData.offering_type === 'restaurant') {
                document.getElementById('restaurantFields').classList.remove('hidden');
            }

            updateTotalPrice();
        }

        function updateTotalPrice() {
            const numGuests = parseInt(document.getElementById('numGuests').value) || 1;
            const pricePerPerson = parseFloat(offeringData.price) || 0;
            const total = numGuests * pricePerPerson;
            document.getElementById('totalPrice').textContent = (offeringData.currency || 'USD') + ' ' + total.toFixed(2);
        }

        document.getElementById('numGuests').addEventListener('input', updateTotalPrice);

        document.getElementById('bookingForm').addEventListener('submit', async (e) => {
            e.preventDefault();

            const bookingData = {
                offering_id: offeringData.offering_id,
                property_id: propertyId,
                guest_name: document.getElementById('guestName').value,
                guest_email: document.getElementById('guestEmail').value,
                guest_phone: document.getElementById('guestPhone').value,
                num_guests: parseInt(document.getElementById('numGuests').value),
                booking_date: document.getElementById('bookingDateTime')?.value || new Date().toISOString(),
                special_requests: document.getElementById('specialRequests').value,
                total_amount: parseFloat(document.getElementById('totalPrice').textContent.replace(/[^0-9.]/g, ''))
            };

            try {
                const response = await fetch('/api/offering-booking', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(bookingData)
                });

                const result = await response.json();
                if (result.success) {
                    alert('Booking confirmed! We will contact you shortly.');
                    window.location.href = '/hotel/paradise-resort';
                } else {
                    alert('Booking failed: ' + (result.error || 'Unknown error'));
                }
            } catch (error) {
                console.error('Booking error:', error);
                alert('Failed to submit booking. Please try again.');
            }
        });

        init();
    </script>
</body>
</html>
  `)
})

// GUEST WELCOME PAGE - QR Code Entry
// ============================================

app.get('/welcome/:property_slug/:room_token', async (c) => {
  const { property_slug, room_token } = c.req.param()
  
  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome - Paradise Resort</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <style>
          body { font-family: 'Inter', system-ui, sans-serif; }
          .gradient-bg { background: linear-gradient(135deg, #0EA5E9 0%, #10B981 100%); }
          .activity-card:hover { transform: translateY(-4px); box-shadow: 0 10px 20px rgba(0,0,0,0.1); }
        </style>
    </head>
    <body class="bg-gray-50">
        <div id="loading" class="fixed inset-0 bg-white z-50 flex items-center justify-center">
            <div class="text-center">
                <div class="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500 mx-auto"></div>
                <p class="mt-4 text-gray-600">Loading...</p>
            </div>
        </div>

        <div id="content" class="hidden">
            <div class="gradient-bg text-white py-8 px-4 sticky top-0 z-10 shadow-lg">
                <div class="max-w-6xl mx-auto">
                    <h1 class="text-3xl font-bold" id="propertyName">Paradise Resort</h1>
                    <p class="text-sm opacity-90">Room <span id="roomNumber">---</span></p>
                </div>
            </div>

            <div class="max-w-6xl mx-auto px-4 py-8">
                <h2 class="text-2xl font-bold mb-6">Featured Activities</h2>
                <div id="activities" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"></div>
                
                <div class="mt-12 text-center">
                    <a href="/browse?property=1&token=" id="browseAll" class="inline-block bg-blue-500 hover:bg-blue-600 text-white px-8 py-3 rounded-lg text-lg font-semibold">
                        Browse All Activities
                    </a>
                </div>
            </div>
        </div>

        <script>
        let sessionToken = '';
        
        async function init() {
            try {
                const response = await fetch('/api/welcome/${property_slug}/${room_token}');
                const data = await response.json();
                
                if (data.error) {
                    alert('Invalid QR code');
                    return;
                }
                
                sessionToken = data.session_token;
                document.getElementById('propertyName').textContent = data.property.name;
                document.getElementById('roomNumber').textContent = data.room.number;
                document.getElementById('browseAll').href += sessionToken;
                
                displayActivities(data.featured_activities);
                
                document.getElementById('loading').classList.add('hidden');
                document.getElementById('content').classList.remove('hidden');
            } catch (error) {
                console.error(error);
                alert('Error loading page');
            }
        }
        
        function displayActivities(activities) {
            const html = activities.map(a => \`
                <div class="activity-card bg-white rounded-lg shadow-lg overflow-hidden transition cursor-pointer" 
                     onclick="bookActivity(\${a.activity_id})">
                    <div class="h-48 bg-gradient-to-r from-blue-400 to-green-400"></div>
                    <div class="p-4">
                        <h3 class="text-lg font-bold mb-2">\${a.title_en || a.title}</h3>
                        <p class="text-sm text-gray-600 mb-3">\${a.vendor_name}</p>
                        <p class="text-sm text-gray-700 mb-4">\${(a.short_description_en || a.short_description || '').substring(0, 100)}...</p>
                        <div class="flex justify-between items-center">
                            <span class="text-2xl font-bold text-blue-600">\${a.currency} \${a.price}</span>
                            <button class="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600">
                                Book
                            </button>
                        </div>
                    </div>
                </div>
            \`).join('');
            
            document.getElementById('activities').innerHTML = html;
        }
        
        function bookActivity(id) {
            alert('Booking activity ' + id + '. Full booking interface will be available in the next update!\\n\\nFor now, you can use the API directly to create bookings.');
        }
        
        window.addEventListener('DOMContentLoaded', init);
        </script>
    </body>
    </html>
  `)
})

// ============================================
// BROWSE ACTIVITIES PAGE
// ============================================

app.get('/browse', async (c) => {
  const propertyId = c.req.query('property') || '1'
  const token = c.req.query('token') || ''
  
  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Browse Activities - Paradise Resort</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <style>
          body { font-family: 'Inter', system-ui, sans-serif; }
          .gradient-bg { background: linear-gradient(135deg, #0EA5E9 0%, #10B981 100%); }
        </style>
    </head>
    <body class="bg-gray-50">
        <div class="gradient-bg text-white py-4 px-4 sticky top-0 z-10 shadow-lg">
            <div class="max-w-6xl mx-auto flex justify-between items-center">
                <h1 class="text-2xl font-bold">Browse Activities</h1>
                <button onclick="window.history.back()" class="bg-white/20 px-4 py-2 rounded-lg">
                    <i class="fas fa-arrow-left"></i> Back
                </button>
            </div>
        </div>

        <div class="max-w-6xl mx-auto px-4 py-8">
            <div class="mb-6 flex gap-4 overflow-x-auto pb-4" id="categories"></div>
            
            <div class="mb-6 flex justify-between items-center">
                <h2 class="text-2xl font-bold">All Activities</h2>
                <select id="sortSelect" onchange="loadActivities()" class="px-4 py-2 border rounded-lg">
                    <option value="popularity">Most Popular</option>
                    <option value="price">Lowest Price</option>
                    <option value="duration">Shortest Duration</option>
                </select>
            </div>
            
            <div id="activities" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"></div>
        </div>

        <script>
        const propertyId = '${propertyId}';
        const token = '${token}';
        let currentCategory = null;
        
        async function init() {
            await loadCategories();
            await loadActivities();
        }
        
        async function loadCategories() {
            const response = await fetch('/api/categories?lang=en');
            const data = await response.json();
            
            const html = '<button onclick="filterCategory(null)" class="flex-shrink-0 px-6 py-3 bg-white rounded-lg shadow">All</button>' +
                data.categories.map(c => \`
                    <button onclick="filterCategory('\${c.slug}')" 
                            class="flex-shrink-0 px-6 py-3 bg-white rounded-lg shadow hover:shadow-lg">
                        <i class="fas \${c.icon_name} text-blue-500"></i> \${c.name}
                    </button>
                \`).join('');
            
            document.getElementById('categories').innerHTML = html;
        }
        
        async function loadActivities() {
            const sort = document.getElementById('sortSelect').value;
            let url = \`/api/activities?property_id=\${propertyId}&sort=\${sort}&lang=en\`;
            if (currentCategory) url += \`&category=\${currentCategory}\`;
            
            const response = await fetch(url);
            const data = await response.json();
            
            const html = data.activities.map(a => \`
                <div class="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition cursor-pointer"
                     onclick="viewActivity(\${a.activity_id})">
                    <div class="h-48 bg-gradient-to-r from-blue-400 to-green-400"></div>
                    <div class="p-4">
                        <div class="flex justify-between items-start mb-2">
                            <h3 class="text-lg font-bold">\${a.title}</h3>
                            \${a.is_featured ? '<span class="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">Featured</span>' : ''}
                        </div>
                        <p class="text-sm text-gray-600 mb-2">\${a.vendor_name}</p>
                        <p class="text-sm text-gray-700 mb-3">\${a.short_description}</p>
                        <div class="flex justify-between items-center text-sm text-gray-600 mb-3">
                            <span><i class="far fa-clock"></i> \${a.duration_minutes} min</span>
                            <span><i class="far fa-user"></i> Max \${a.capacity_per_slot}</span>
                        </div>
                        <div class="flex justify-between items-center">
                            <span class="text-2xl font-bold text-blue-600">\${a.currency} \${a.price}</span>
                            <button class="bg-blue-500 text-white px-4 py-2 rounded-lg">Book</button>
                        </div>
                    </div>
                </div>
            \`).join('');
            
            document.getElementById('activities').innerHTML = html;
        }
        
        function filterCategory(slug) {
            currentCategory = slug;
            loadActivities();
        }
        
        function viewActivity(id) {
            alert('Activity details for ID: ' + id + '\\n\\nFull detail page coming soon!\\n\\nFor now, use API endpoint: /api/activities/' + id);
        }
        
        window.addEventListener('DOMContentLoaded', init);
        </script>
    </body>
    </html>
  `)
})

// ============================================
// HTML PAGE ROUTES
// ============================================

// Vendor login page
app.get('/vendor/login', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Vendor Login - Paradise Resort</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    </head>
    <body class="bg-gray-100">
        <div class="min-h-screen flex items-center justify-center px-4">
            <div class="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
                <h1 class="text-2xl font-bold mb-6 text-center">Vendor Portal Login</h1>
                <form id="loginForm" class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium mb-2">Email</label>
                        <input type="email" id="email" required class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500">
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-2">Password</label>
                        <input type="password" id="password" required class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500">
                    </div>
                    <button type="submit" class="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600">
                        <i class="fas fa-sign-in-alt mr-2"></i>Login
                    </button>
                </form>
            </div>
        </div>
        <script>
          document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            try {
              const response = await fetch('/api/vendor/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
              });
              
              const data = await response.json();
              
              if (data.success) {
                localStorage.setItem('vendor_id', data.vendor_id);
                localStorage.setItem('vendor_token', data.token || data.vendor_id);
                window.location.href = '/vendor/dashboard';
              } else {
                alert('Login failed: ' + (data.error || 'Invalid credentials'));
              }
            } catch (error) {
              console.error('Login error:', error);
              alert('Login failed. Please try again.');
            }
          });
        </script>
    </body>
    </html>
  `)
})

// Admin login page
// ============================================
// GUESTCONNECT PLATFORM SUPER ADMIN
// ============================================

// Super Admin Login
app.get('/superadmin/login', (c) => {
  return c.html(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GuestConnect Platform Admin</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
</head>
<body class="bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 min-h-screen flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div class="text-center mb-8">
            <div class="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full mb-4">
                <i class="fas fa-crown text-white text-3xl"></i>
            </div>
            <h1 class="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">GuestConnect</h1>
            <p class="text-gray-600 mt-2">Platform Super Admin</p>
        </div>

        <form id="loginForm" class="space-y-6">
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input type="email" id="email" required class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent">
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Password</label>
                <input type="password" id="password" required class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent">
            </div>
            <button type="submit" class="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition">
                <i class="fas fa-sign-in-alt mr-2"></i>Login to Platform Admin
            </button>
        </form>

        <div class="mt-6 text-center">
            <a href="/admin/login" class="text-sm text-gray-600 hover:text-purple-600">
                <i class="fas fa-hotel mr-1"></i>Hotel Admin Login
            </a>
        </div>
    </div>

    <script>
        document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            // Super admin credentials (hardcoded for now - you should change this!)
            if (email === 'superadmin@guestconnect.com' && password === 'GuestConnect2024!') {
                localStorage.setItem('superadmin_user', JSON.stringify({
                    user_id: 1,
                    email: email,
                    role: 'superadmin',
                    name: 'Platform Administrator'
                }));
                window.location.href = '/superadmin/dashboard';
            } else {
                alert('Invalid credentials');
            }
        });
    </script>
</body>
</html>
  `)
})

// Super Admin Dashboard
app.get('/superadmin/dashboard', (c) => {
  return c.html(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GuestConnect Platform Admin</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    <style>
      .tab-active { border-bottom: 3px solid #9333EA; color: #9333EA; }
      .hidden { display: none !important; }
      .tab-content { display: block; }
      .tab-btn { cursor: pointer; transition: all 0.3s; }
      .tab-btn:hover { background-color: rgba(147, 51, 234, 0.1); }
      .stat-card { transition: transform 0.2s; }
      .stat-card:hover { transform: translateY(-4px); }
    </style>
</head>
<body class="bg-gray-50">
    <!-- Header -->
    <div class="bg-gradient-to-r from-purple-700 to-blue-700 text-white py-4 px-4 shadow-lg">
        <div class="max-w-7xl mx-auto flex justify-between items-center">
            <div>
                <h1 class="text-2xl font-bold flex items-center">
                    <i class="fas fa-crown mr-3"></i>GuestConnect Platform Admin
                </h1>
                <p class="text-purple-100 text-sm">Manage all hotels and platform settings</p>
            </div>
            <button onclick="logout()" class="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg">
                <i class="fas fa-sign-out-alt mr-2"></i>Logout
            </button>
        </div>
    </div>

    <div class="max-w-7xl mx-auto px-4 py-8">
        <!-- Platform Stats -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div class="stat-card bg-white rounded-xl shadow-lg p-6">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-gray-500 text-sm">Total Hotels</p>
                        <p class="text-3xl font-bold text-purple-600" id="totalHotels">0</p>
                    </div>
                    <div class="bg-purple-100 p-4 rounded-full">
                        <i class="fas fa-hotel text-purple-600 text-2xl"></i>
                    </div>
                </div>
            </div>

            <div class="stat-card bg-white rounded-xl shadow-lg p-6">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-gray-500 text-sm">Total Vendors</p>
                        <p class="text-3xl font-bold text-blue-600" id="totalVendors">0</p>
                    </div>
                    <div class="bg-blue-100 p-4 rounded-full">
                        <i class="fas fa-store text-blue-600 text-2xl"></i>
                    </div>
                </div>
            </div>

            <div class="stat-card bg-white rounded-xl shadow-lg p-6">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-gray-500 text-sm">Total Bookings</p>
                        <p class="text-3xl font-bold text-green-600" id="totalBookings">0</p>
                    </div>
                    <div class="bg-green-100 p-4 rounded-full">
                        <i class="fas fa-calendar-check text-green-600 text-2xl"></i>
                    </div>
                </div>
            </div>

            <div class="stat-card bg-white rounded-xl shadow-lg p-6">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-gray-500 text-sm">Platform Revenue</p>
                        <p class="text-3xl font-bold text-indigo-600" id="totalRevenue">$0</p>
                    </div>
                    <div class="bg-indigo-100 p-4 rounded-full">
                        <i class="fas fa-dollar-sign text-indigo-600 text-2xl"></i>
                    </div>
                </div>
            </div>
        </div>

        <!-- Tabs -->
        <div class="bg-white rounded-lg shadow mb-6">
            <div class="flex overflow-x-auto">
                <button data-tab="hotels" class="tab-btn px-6 py-4 font-semibold tab-active">
                    <i class="fas fa-hotel mr-2"></i>Hotels
                </button>
                <button data-tab="vendors" class="tab-btn px-6 py-4 font-semibold">
                    <i class="fas fa-store mr-2"></i>Vendors
                </button>
                <button data-tab="bookings" class="tab-btn px-6 py-4 font-semibold">
                    <i class="fas fa-calendar-alt mr-2"></i>All Bookings
                </button>
                <button data-tab="analytics" class="tab-btn px-6 py-4 font-semibold">
                    <i class="fas fa-chart-line mr-2"></i>Analytics
                </button>
                <button data-tab="settings" class="tab-btn px-6 py-4 font-semibold">
                    <i class="fas fa-cog mr-2"></i>Platform Settings
                </button>
            </div>
        </div>

        <!-- Hotels Tab -->
        <div id="hotelsTab" class="tab-content">
            <div class="bg-white rounded-lg shadow-lg p-6 mb-6">
                <h2 class="text-2xl font-bold mb-4">
                    <i class="fas fa-plus-circle mr-2 text-purple-600"></i>Add New Hotel
                </h2>
                <form id="addHotelForm" class="grid md:grid-cols-3 gap-4">
                    <input type="text" id="hotelName" placeholder="Hotel Name" required class="px-4 py-2 border rounded-lg">
                    <input type="email" id="hotelEmail" placeholder="Admin Email" required class="px-4 py-2 border rounded-lg">
                    <input type="text" id="hotelSlug" placeholder="URL Slug (e.g., paradise-resort)" required class="px-4 py-2 border rounded-lg">
                    <input type="text" id="hotelPhone" placeholder="Phone" class="px-4 py-2 border rounded-lg">
                    <input type="text" id="hotelLocation" placeholder="Location/City" class="px-4 py-2 border rounded-lg">
                    <button type="submit" class="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700">
                        <i class="fas fa-check mr-2"></i>Add Hotel
                    </button>
                </form>
            </div>

            <div class="bg-white rounded-lg shadow-lg p-6">
                <h2 class="text-2xl font-bold mb-4">All Hotels</h2>
                <div class="overflow-x-auto">
                    <table class="w-full">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-4 py-3 text-left">Hotel Name</th>
                                <th class="px-4 py-3 text-left">Slug</th>
                                <th class="px-4 py-3 text-left">Admin Email</th>
                                <th class="px-4 py-3 text-left">Location</th>
                                <th class="px-4 py-3 text-left">Status</th>
                                <th class="px-4 py-3 text-left">Created</th>
                                <th class="px-4 py-3 text-left">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="hotelsList"></tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- Vendors Tab -->
        <div id="vendorsTab" class="tab-content hidden">
            <div class="bg-white rounded-lg shadow-lg p-6">
                <h2 class="text-2xl font-bold mb-4">All Vendors Across Platform</h2>
                <div id="vendorsList" class="space-y-3"></div>
            </div>
        </div>

        <!-- Bookings Tab -->
        <div id="bookingsTab" class="tab-content hidden">
            <div class="bg-white rounded-lg shadow-lg p-6">
                <h2 class="text-2xl font-bold mb-4">Recent Bookings</h2>
                <div id="bookingsList" class="space-y-3"></div>
            </div>
        </div>

        <!-- Analytics Tab -->
        <div id="analyticsTab" class="tab-content hidden">
            <div class="bg-white rounded-lg shadow-lg p-6">
                <h2 class="text-2xl font-bold mb-4">Platform Analytics</h2>
                <p class="text-gray-600">Analytics dashboard coming soon...</p>
            </div>
        </div>

        <!-- Settings Tab -->
        <div id="settingsTab" class="tab-content hidden">
            <div class="bg-white rounded-lg shadow-lg p-6">
                <h2 class="text-2xl font-bold mb-4">Platform Settings</h2>
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium mb-2">Platform Name</label>
                        <input type="text" value="GuestConnect" class="w-full px-4 py-2 border rounded-lg">
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-2">Default Currency</label>
                        <select class="w-full px-4 py-2 border rounded-lg">
                            <option>USD</option>
                            <option>EUR</option>
                            <option>GBP</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-2">Commission Rate (%)</label>
                        <input type="number" value="10" class="w-full px-4 py-2 border rounded-lg">
                    </div>
                    <button class="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700">
                        <i class="fas fa-save mr-2"></i>Save Settings
                    </button>
                </div>
            </div>
        </div>
    </div>

    <script>
        const user = JSON.parse(localStorage.getItem('superadmin_user') || '{}');
        if (!user.user_id || user.role !== 'superadmin') {
            window.location.href = '/superadmin/login';
        }

        let currentTab = 'hotels';

        function showTab(tab, clickedButton) {
            currentTab = tab;
            document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
            document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('tab-active'));
            document.getElementById(tab + 'Tab').classList.remove('hidden');
            if (clickedButton) {
                clickedButton.classList.add('tab-active');
            }

            if (tab === 'hotels') loadHotels();
            if (tab === 'vendors') loadVendors();
            if (tab === 'bookings') loadBookings();
        }

        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const tab = this.getAttribute('data-tab');
                showTab(tab, this);
            });
        });

        async function loadStats() {
            try {
                const response = await fetch('/api/superadmin/stats');
                const stats = await response.json();
                document.getElementById('totalHotels').textContent = stats.total_hotels || 0;
                document.getElementById('totalVendors').textContent = stats.total_vendors || 0;
                document.getElementById('totalBookings').textContent = stats.total_bookings || 0;
                document.getElementById('totalRevenue').textContent = '$' + (stats.total_revenue || 0).toLocaleString();
            } catch (error) {
                console.error('Load stats error:', error);
            }
        }

        async function loadHotels() {
            try {
                const response = await fetch('/api/superadmin/hotels');
                const hotels = await response.json();
                const list = document.getElementById('hotelsList');
                
                if (!hotels || hotels.length === 0) {
                    list.innerHTML = '<tr><td colspan="7" class="px-4 py-8 text-center text-gray-500">No hotels yet</td></tr>';
                    return;
                }
                
                list.innerHTML = hotels.map(h => '<tr class="border-b hover:bg-gray-50"><td class="px-4 py-3 font-medium">' + h.property_name + '</td><td class="px-4 py-3"><code class="bg-gray-100 px-2 py-1 rounded text-sm">' + h.slug + '</code></td><td class="px-4 py-3">' + (h.contact_email || 'N/A') + '</td><td class="px-4 py-3">' + (h.location || 'N/A') + '</td><td class="px-4 py-3"><span class="px-2 py-1 rounded text-xs ' + (h.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800') + '">' + h.status + '</span></td><td class="px-4 py-3 text-sm text-gray-500">' + new Date(h.created_at).toLocaleDateString() + '</td><td class="px-4 py-3"><a href="/admin/dashboard?property_id=' + h.property_id + '" target="_blank" class="text-purple-600 hover:underline text-sm"><i class="fas fa-external-link-alt mr-1"></i>View Admin</a></td></tr>').join('');
            } catch (error) {
                console.error('Load hotels error:', error);
            }
        }

        async function loadVendors() {
            try {
                const response = await fetch('/api/superadmin/vendors');
                const vendors = await response.json();
                const list = document.getElementById('vendorsList');
                
                if (!vendors || vendors.length === 0) {
                    list.innerHTML = '<p class="text-gray-500 text-center py-8">No vendors yet</p>';
                    return;
                }
                
                list.innerHTML = vendors.map(v => '<div class="border rounded-lg p-4"><div class="flex justify-between items-start"><div><h3 class="font-bold">' + v.business_name + '</h3><p class="text-sm text-gray-600">' + v.email + ' • ' + v.phone + '</p><p class="text-xs text-gray-500 mt-1">Connected to: ' + (v.property_count || 0) + ' hotel(s)</p></div><span class="px-3 py-1 rounded-full text-sm ' + (v.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800') + '">' + v.status + '</span></div></div>').join('');
            } catch (error) {
                console.error('Load vendors error:', error);
            }
        }

        async function loadBookings() {
            try {
                const response = await fetch('/api/superadmin/bookings');
                const bookings = await response.json();
                const list = document.getElementById('bookingsList');
                
                if (!bookings || bookings.length === 0) {
                    list.innerHTML = '<p class="text-gray-500 text-center py-8">No bookings yet</p>';
                    return;
                }
                
                list.innerHTML = bookings.map(b => '<div class="border rounded-lg p-4"><div class="flex justify-between items-start"><div><h3 class="font-bold">' + b.activity_title + '</h3><p class="text-sm text-gray-600">Guest: ' + b.guest_name + ' (' + b.guest_email + ')</p><p class="text-sm text-gray-600">Hotel: ' + b.property_name + '</p><p class="text-xs text-gray-500 mt-1">' + new Date(b.booking_date).toLocaleString() + '</p></div><div class="text-right"><span class="text-lg font-bold text-blue-600">$' + (b.total_amount || 0) + '</span><br><span class="px-2 py-1 rounded text-xs ' + (b.payment_status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800') + '">' + b.payment_status + '</span></div></div></div>').join('');
            } catch (error) {
                console.error('Load bookings error:', error);
            }
        }

        document.getElementById('addHotelForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const hotelData = {
                property_name: document.getElementById('hotelName').value,
                slug: document.getElementById('hotelSlug').value,
                contact_email: document.getElementById('hotelEmail').value,
                contact_phone: document.getElementById('hotelPhone').value,
                location: document.getElementById('hotelLocation').value
            };

            try {
                const response = await fetch('/api/superadmin/hotels', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(hotelData)
                });

                const result = await response.json();
                if (result.success) {
                    alert('Hotel added successfully! Admin credentials:\\nEmail: ' + hotelData.contact_email + '\\nPassword: admin123\\n\\nPlease ask the hotel to change their password.');
                    e.target.reset();
                    loadHotels();
                    loadStats();
                } else {
                    alert('Error: ' + (result.error || 'Failed to add hotel'));
                }
            } catch (error) {
                console.error('Add hotel error:', error);
                alert('Failed to add hotel');
            }
        });

        function logout() {
            localStorage.removeItem('superadmin_user');
            window.location.href = '/superadmin/login';
        }

        loadStats();
        loadHotels();
    </script>
</body>
</html>
  `)
})

// ============================================
// HOTEL ADMIN (existing)
// ============================================

app.get('/admin/login', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Admin Login - Paradise Resort</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    </head>
    <body class="bg-gray-900">
        <div class="min-h-screen flex items-center justify-center px-4">
            <div class="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full">
                <div class="text-center mb-6">
                    <i class="fas fa-shield-alt text-4xl text-blue-600 mb-2"></i>
                    <h1 class="text-2xl font-bold">Admin Portal</h1>
                </div>
                <form id="adminLoginForm" class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium mb-2">Email</label>
                        <input type="email" id="adminEmail" required class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500">
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-2">Password</label>
                        <input type="password" id="adminPassword" required class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500">
                    </div>
                    <button type="submit" class="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-semibold">
                        <i class="fas fa-lock mr-2"></i>Secure Login
                    </button>
                </form>
            </div>
        </div>
        <script>
          document.getElementById('adminLoginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('adminEmail').value;
            const password = document.getElementById('adminPassword').value;
            
            try {
              const response = await fetch('/api/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
              });
              
              const data = await response.json();
              
              if (data.success) {
                localStorage.setItem('admin_user', JSON.stringify(data.user));
                localStorage.setItem('admin_token', data.token || data.user.user_id);
                window.location.href = '/admin/dashboard';
              } else {
                alert('Login failed: ' + (data.error || 'Invalid credentials'));
              }
            } catch (error) {
              console.error('Login error:', error);
              alert('Login failed. Please try again.');
            }
          });
        </script>
    </body>
    </html>
  `)
})

// Vendor Dashboard page
app.get('/vendor/dashboard', (c) => {
  return c.html(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Vendor Dashboard</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
</head>
<body class="bg-gray-50">
    <div class="bg-gradient-to-r from-blue-600 to-green-600 text-white py-4 px-4 shadow-lg">
        <div class="max-w-7xl mx-auto flex justify-between items-center">
            <div><h1 class="text-2xl font-bold">Vendor Portal</h1></div>
            <button onclick="logout()" class="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg"><i class="fas fa-sign-out-alt mr-2"></i>Logout</button>
        </div>
    </div>

    <div class="max-w-7xl mx-auto px-4 py-8">
        <!-- Stats -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div class="bg-white rounded-lg shadow-lg p-6">
                <div class="flex justify-between items-start">
                    <div><p class="text-gray-600 text-sm">Today's Bookings</p><p class="text-3xl font-bold" id="todayBookings">0</p></div>
                    <div class="bg-blue-100 p-3 rounded-lg"><i class="fas fa-calendar-day text-blue-600 text-xl"></i></div>
                </div>
            </div>
            <div class="bg-white rounded-lg shadow-lg p-6">
                <div class="flex justify-between items-start">
                    <div><p class="text-gray-600 text-sm">Total Bookings</p><p class="text-3xl font-bold" id="totalBookings">0</p></div>
                    <div class="bg-green-100 p-3 rounded-lg"><i class="fas fa-list text-green-600 text-xl"></i></div>
                </div>
            </div>
            <div class="bg-white rounded-lg shadow-lg p-6">
                <div class="flex justify-between items-start">
                    <div><p class="text-gray-600 text-sm">Pending Confirmations</p><p class="text-3xl font-bold" id="pendingBookings">0</p></div>
                    <div class="bg-yellow-100 p-3 rounded-lg"><i class="fas fa-clock text-yellow-600 text-xl"></i></div>
                </div>
            </div>
        </div>

        <!-- Bookings History -->
        <div class="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 class="text-2xl font-bold mb-4"><i class="fas fa-history mr-2 text-purple-600"></i>Booking History</h2>
            <div id="bookingsList" class="space-y-3"></div>
        </div>

        <!-- Vendor Profile -->
        <div class="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 class="text-2xl font-bold mb-4"><i class="fas fa-user-circle mr-2 text-indigo-600"></i>My Profile</h2>
            <form id="profileForm" class="space-y-4">
                <div class="flex items-center gap-6 mb-6">
                    <div class="relative">
                        <img id="profileImagePreview" src="https://via.placeholder.com/150" alt="Profile" class="w-32 h-32 rounded-full object-cover border-4 border-gray-200">
                        <label for="profileImageInput" class="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full cursor-pointer hover:bg-blue-700">
                            <i class="fas fa-camera"></i>
                            <input type="file" id="profileImageInput" accept="image/*" class="hidden">
                        </label>
                    </div>
                    <div class="flex-1">
                        <h3 class="text-xl font-bold" id="profileBusinessName">Business Name</h3>
                        <p class="text-gray-600" id="profileEmail">email@example.com</p>
                    </div>
                </div>
                
                <div class="grid md:grid-cols-2 gap-4">
                    <div><label class="block text-sm font-medium mb-2">Business Name</label><input type="text" id="businessNameInput" required class="w-full px-4 py-2 border rounded-lg"></div>
                    <div><label class="block text-sm font-medium mb-2">Phone</label><input type="tel" id="phoneInput" required class="w-full px-4 py-2 border rounded-lg"></div>
                    <div><label class="block text-sm font-medium mb-2">Website</label><input type="url" id="websiteInput" placeholder="https://" class="w-full px-4 py-2 border rounded-lg"></div>
                    <div><label class="block text-sm font-medium mb-2">Years of Experience</label><input type="number" id="yearsExpInput" min="0" class="w-full px-4 py-2 border rounded-lg"></div>
                </div>
                
                <div><label class="block text-sm font-medium mb-2">Description</label><textarea id="descriptionInput" rows="4" placeholder="Tell guests about your business..." class="w-full px-4 py-2 border rounded-lg"></textarea></div>
                
                <div class="grid md:grid-cols-3 gap-4">
                    <div><label class="block text-sm font-medium mb-2">Address</label><input type="text" id="addressInput" class="w-full px-4 py-2 border rounded-lg"></div>
                    <div><label class="block text-sm font-medium mb-2">City</label><input type="text" id="cityInput" class="w-full px-4 py-2 border rounded-lg"></div>
                    <div><label class="block text-sm font-medium mb-2">Country</label><input type="text" id="countryInput" class="w-full px-4 py-2 border rounded-lg"></div>
                </div>
                
                <div><label class="block text-sm font-medium mb-2">Specialties (comma-separated)</label><input type="text" id="specialtiesInput" placeholder="Diving, Snorkeling, PADI Certified" class="w-full px-4 py-2 border rounded-lg"></div>
                
                <div><label class="block text-sm font-medium mb-2">Languages Spoken (comma-separated)</label><input type="text" id="languagesInput" placeholder="English, Arabic, French" class="w-full px-4 py-2 border rounded-lg"></div>
                
                <button type="submit" class="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 font-semibold"><i class="fas fa-save mr-2"></i>Update Profile</button>
            </form>
        </div>

        <!-- Add Activity Form -->
        <div class="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 class="text-2xl font-bold mb-4"><i class="fas fa-plus-circle mr-2 text-blue-600"></i>Add New Activity</h2>
            <form id="addActivityForm" class="space-y-4">
                <div class="grid md:grid-cols-2 gap-4">
                    <div><label class="block text-sm font-medium mb-2">Activity Title</label><input type="text" id="title" required class="w-full px-4 py-2 border rounded-lg"></div>
                    <div><label class="block text-sm font-medium mb-2">Category</label><select id="category" required class="w-full px-4 py-2 border rounded-lg"><option value="">Select category...</option></select></div>
                    <div><label class="block text-sm font-medium mb-2">Price (USD)</label><input type="number" id="price" required class="w-full px-4 py-2 border rounded-lg"></div>
                    <div><label class="block text-sm font-medium mb-2">Duration (minutes)</label><input type="number" id="duration" required class="w-full px-4 py-2 border rounded-lg"></div>
                    <div><label class="block text-sm font-medium mb-2">Capacity per Slot</label><input type="number" id="capacity" required class="w-full px-4 py-2 border rounded-lg"></div>
                    <div><label class="block text-sm font-medium mb-2">Activity Image</label><input type="file" id="activityImage" accept="image/*" class="w-full px-4 py-2 border rounded-lg"><p class="text-xs text-gray-500 mt-1">Upload activity image (optional)</p></div>
                </div>
                <div><label class="block text-sm font-medium mb-2">Short Description</label><textarea id="shortDesc" rows="2" required class="w-full px-4 py-2 border rounded-lg"></textarea></div>
                <div><label class="block text-sm font-medium mb-2">Full Description</label><textarea id="fullDesc" rows="4" required class="w-full px-4 py-2 border rounded-lg"></textarea></div>
                <button type="submit" class="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold"><i class="fas fa-save mr-2"></i>Create Activity</button>
            </form>
        </div>

        <!-- Activities List -->
        <div class="bg-white rounded-lg shadow-lg p-6">
            <h2 class="text-2xl font-bold mb-4"><i class="fas fa-list mr-2 text-green-600"></i>My Activities</h2>
            <div id="activitiesList" class="space-y-4"></div>
        </div>
    </div>

    <script>
      const vendorId = localStorage.getItem('vendor_id');
      if (!vendorId) { window.location.href = '/vendor/login'; }

      async function loadDashboard() {
        try {
          const [bookings, activities, categories, profile] = await Promise.all([
            fetch('/api/vendor/bookings', { headers: { 'X-Vendor-ID': vendorId } }).then(r => r.json()),
            fetch('/api/vendor/activities', { headers: { 'X-Vendor-ID': vendorId } }).then(r => r.json()),
            fetch('/api/categories').then(r => r.json()),
            fetch('/api/vendor/profile', { headers: { 'X-Vendor-ID': vendorId } }).then(r => r.json())
          ]);

          const today = new Date().toISOString().split('T')[0];
          const todayBookings = bookings.bookings.filter(b => b.activity_date === today);
          document.getElementById('todayBookings').textContent = todayBookings.length;
          document.getElementById('totalBookings').textContent = bookings.bookings.length;
          document.getElementById('pendingBookings').textContent = bookings.bookings.filter(b => b.status === 'pending').length;

          const categorySelect = document.getElementById('category');
          categories.categories.forEach(cat => {
            categorySelect.innerHTML += '<option value="' + cat.category_id + '">' + cat.name + '</option>';
          });

          displayBookings(bookings.bookings);
          displayActivities(activities.activities);
          displayProfile(profile.profile);
        } catch (error) {
          console.error('Dashboard load error:', error);
        }
      }

      function displayProfile(profile) {
        document.getElementById('profileBusinessName').textContent = profile.business_name;
        document.getElementById('profileEmail').textContent = profile.email;
        document.getElementById('businessNameInput').value = profile.business_name || '';
        document.getElementById('phoneInput').value = profile.phone || '';
        document.getElementById('websiteInput').value = profile.website || '';
        document.getElementById('descriptionInput').value = profile.description || '';
        document.getElementById('addressInput').value = profile.address || '';
        document.getElementById('cityInput').value = profile.city || '';
        document.getElementById('countryInput').value = profile.country || '';
        document.getElementById('yearsExpInput').value = profile.years_experience || '';
        
        const specialties = profile.specialties ? JSON.parse(profile.specialties) : [];
        document.getElementById('specialtiesInput').value = specialties.join(', ');
        
        const languages = profile.languages_spoken ? JSON.parse(profile.languages_spoken) : [];
        document.getElementById('languagesInput').value = languages.join(', ');
        
        if (profile.profile_image) {
          document.getElementById('profileImagePreview').src = profile.profile_image;
        }
      }

      function displayBookings(bookings) {
        const list = document.getElementById('bookingsList');
        if (bookings.length === 0) {
          list.innerHTML = '<p class="text-gray-500 text-center py-4">No bookings yet</p>';
          return;
        }
        
        list.innerHTML = bookings.slice(0, 10).map(b => \`
          <div class="border rounded-lg p-4 hover:shadow-md transition">
            <div class="flex justify-between items-start">
              <div class="flex-1">
                <h3 class="font-bold">\${b.activity_title}</h3>
                <p class="text-sm text-gray-600">\${b.first_name} \${b.last_name} • \${b.email}</p>
                <div class="flex gap-4 mt-2 text-sm text-gray-600">
                  <span><i class="far fa-calendar mr-1"></i>\${b.activity_date}</span>
                  <span><i class="far fa-clock mr-1"></i>\${b.activity_time}</span>
                  <span><i class="far fa-user mr-1"></i>\${b.num_participants} people</span>
                </div>
              </div>
              <span class="px-3 py-1 rounded-full text-xs \${b.booking_status === 'confirmed' ? 'bg-green-100 text-green-800' : b.booking_status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}">\${b.booking_status}</span>
            </div>
          </div>
        \`).join('');
      }

      function displayActivities(activities) {
        const list = document.getElementById('activitiesList');
        if (activities.length === 0) {
          list.innerHTML = '<p class="text-gray-500 text-center py-8">No activities yet. Create your first activity above!</p>';
          return;
        }
        
        list.innerHTML = activities.map(a => \`
          <div class="border rounded-lg p-4 hover:shadow-md transition">
            <div class="flex justify-between items-start">
              <div class="flex-1">
                <h3 class="text-xl font-bold">\${a.title_en}</h3>
                <p class="text-gray-600 text-sm mt-1">\${a.short_description_en}</p>
                <div class="flex gap-4 mt-3 text-sm text-gray-600">
                  <span><i class="fas fa-tag mr-1"></i>\${a.currency} \${a.price}</span>
                  <span><i class="far fa-clock mr-1"></i>\${a.duration_minutes} min</span>
                  <span><i class="far fa-user mr-1"></i>Max \${a.capacity_per_slot}</span>
                </div>
              </div>
              <span class="px-3 py-1 rounded-full text-sm \${a.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}">\${a.status}</span>
            </div>
          </div>
        \`).join('');
      }

      // Profile form submission
      document.getElementById('profileForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          const specialties = document.getElementById('specialtiesInput').value.split(',').map(s => s.trim()).filter(s => s);
          const languages = document.getElementById('languagesInput').value.split(',').map(s => s.trim()).filter(s => s);
          
          const response = await fetch('/api/vendor/profile', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'X-Vendor-ID': vendorId },
            body: JSON.stringify({
              business_name: document.getElementById('businessNameInput').value,
              phone: document.getElementById('phoneInput').value,
              website: document.getElementById('websiteInput').value,
              description: document.getElementById('descriptionInput').value,
              address: document.getElementById('addressInput').value,
              city: document.getElementById('cityInput').value,
              country: document.getElementById('countryInput').value,
              years_experience: parseInt(document.getElementById('yearsExpInput').value) || null,
              specialties,
              languages_spoken: languages,
              operating_hours: null,
              social_media: null
            })
          });

          const data = await response.json();
          if (data.success) {
            alert('Profile updated successfully!');
            location.reload();
          } else {
            alert('Error: ' + (data.error || 'Failed to update profile'));
          }
        } catch (error) {
          console.error('Profile update error:', error);
          alert('Failed to update profile');
        }
      });

      // Profile image upload
      document.getElementById('profileImageInput').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        try {
          const formData = new FormData();
          formData.append('image', file);
          
          const response = await fetch('/api/vendor/upload-profile-image', {
            method: 'POST',
            headers: { 'X-Vendor-ID': vendorId },
            body: formData
          });
          
          const data = await response.json();
          if (data.success) {
            document.getElementById('profileImagePreview').src = data.image_url;
            alert('Profile image updated!');
          }
        } catch (error) {
          console.error('Image upload error:', error);
          alert('Failed to upload image');
        }
      });

      document.getElementById('addActivityForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          // Handle image upload if present
          const imageFile = document.getElementById('activityImage').files[0];
          let imageUrl = '';
          
          if (imageFile) {
            const formData = new FormData();
            formData.append('image', imageFile);
            
            const uploadResponse = await fetch('/api/vendor/upload-image', {
              method: 'POST',
              headers: { 'X-Vendor-ID': vendorId },
              body: formData
            });
            
            if (uploadResponse.ok) {
              const uploadData = await uploadResponse.json();
              imageUrl = uploadData.image_url;
            }
          }

          const response = await fetch('/api/vendor/activities', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Vendor-ID': vendorId },
            body: JSON.stringify({
              category_id: document.getElementById('category').value,
              title_en: document.getElementById('title').value,
              short_description_en: document.getElementById('shortDesc').value,
              full_description_en: document.getElementById('fullDesc').value,
              price: parseFloat(document.getElementById('price').value),
              duration_minutes: parseInt(document.getElementById('duration').value),
              capacity_per_slot: parseInt(document.getElementById('capacity').value),
              images: imageUrl ? [imageUrl] : [],
              requirements: {},
              includes: [],
              status: 'active'
            })
          });

          const data = await response.json();
          if (data.success) {
            alert('Activity created successfully!');
            window.location.reload();
          } else {
            alert('Error: ' + (data.error || 'Failed to create activity'));
          }
        } catch (error) {
          console.error('Create activity error:', error);
          alert('Failed to create activity');
        }
      });

      function logout() {
        localStorage.removeItem('vendor_id');
        localStorage.removeItem('vendor_token');
        window.location.href = '/vendor/login';
      }

      loadDashboard();
    </script>
</body>
</html>
  `)
})

// Browse Activities page
app.get('/browse', (c) => {
  return c.html(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Browse Activities</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
</head>
<body class="bg-gray-50">
    <div class="bg-gradient-to-r from-blue-500 to-green-500 text-white py-4 px-4 shadow-lg sticky top-0 z-10">
        <div class="max-w-6xl mx-auto flex items-center justify-between">
            <h1 class="text-2xl font-bold"><i class="fas fa-compass mr-2"></i>Browse Activities</h1>
            <span id="roomDisplay" class="text-sm bg-white/20 px-3 py-1 rounded-full"></span>
        </div>
    </div>

    <div class="max-w-6xl mx-auto px-4 py-8">
        <!-- Filters -->
        <div class="bg-white rounded-lg shadow p-4 mb-6">
            <div class="grid md:grid-cols-3 gap-4">
                <select id="categoryFilter" class="px-4 py-2 border rounded-lg"><option value="">All Categories</option></select>
                <select id="sortFilter" class="px-4 py-2 border rounded-lg">
                    <option value="popular">Most Popular</option>
                    <option value="price_low">Price: Low to High</option>
                    <option value="price_high">Price: High to Low</option>
                </select>
                <input type="search" id="searchBox" placeholder="Search activities..." class="px-4 py-2 border rounded-lg">
            </div>
        </div>

        <!-- Activities Grid -->
        <div id="activitiesGrid" class="grid md:grid-cols-3 gap-6"></div>

        <div id="loadingSpinner" class="text-center py-8"><div class="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-500 mx-auto"></div></div>
    </div>

    <script>
      let activities = [];
      let categories = [];
      const sessionToken = new URLSearchParams(window.location.search).get('token') || localStorage.getItem('session_token');
      const propertyId = new URLSearchParams(window.location.search).get('property') || '1';

      async function loadData() {
        try {
          const [activitiesRes, categoriesRes] = await Promise.all([
            fetch('/api/activities?property_id=' + propertyId + '&lang=en'),
            fetch('/api/categories?lang=en')
          ]);

          const activitiesData = await activitiesRes.json();
          const categoriesData = await categoriesRes.json();

          activities = activitiesData.activities;
          categories = categoriesData.categories;

          const categoryFilter = document.getElementById('categoryFilter');
          categories.forEach(cat => {
            categoryFilter.innerHTML += '<option value="' + cat.category_id + '">' + cat.name + '</option>';
          });

          displayActivities();
          document.getElementById('loadingSpinner').style.display = 'none';
        } catch (error) {
          console.error('Load error:', error);
          alert('Failed to load activities');
        }
      }

      function displayActivities() {
        const categoryFilter = document.getElementById('categoryFilter').value;
        const sortFilter = document.getElementById('sortFilter').value;
        const searchText = document.getElementById('searchBox').value.toLowerCase();

        let filtered = activities.filter(a => {
          if (categoryFilter && a.category_id != categoryFilter) return false;
          if (searchText && !a.title.toLowerCase().includes(searchText)) return false;
          return true;
        });

        if (sortFilter === 'price_low') filtered.sort((a, b) => a.price - b.price);
        else if (sortFilter === 'price_high') filtered.sort((a, b) => b.price - a.price);
        else filtered.sort((a, b) => (b.popularity_score || 0) - (a.popularity_score || 0));

        const grid = document.getElementById('activitiesGrid');
        if (filtered.length === 0) {
          grid.innerHTML = '<div class="col-span-3 text-center py-12 text-gray-500"><i class="fas fa-search text-4xl mb-4"></i><p>No activities found</p></div>';
          return;
        }

        grid.innerHTML = filtered.map(a => \`
          <div class="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition cursor-pointer" onclick="viewActivity(\${a.activity_id})">
            <div class="h-48 bg-gradient-to-br from-blue-400 to-green-400 flex items-center justify-center">
              <i class="fas fa-hiking text-white text-6xl opacity-75"></i>
            </div>
            <div class="p-4">
              <h3 class="font-bold text-lg mb-2">\${a.title}</h3>
              <p class="text-gray-600 text-sm mb-3 line-clamp-2">\${a.short_description}</p>
              <div class="flex justify-between items-center mb-3">
                <span class="text-blue-600 font-bold text-xl">\${a.currency} \${a.price}</span>
                <span class="text-gray-600 text-sm"><i class="far fa-clock mr-1"></i>\${a.duration_minutes} min</span>
              </div>
              <div class="text-sm text-gray-600 mb-3">
                <i class="fas fa-store mr-1"></i>\${a.vendor_name}
              </div>
              <button class="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600">
                <i class="fas fa-calendar-check mr-2"></i>View Details & Book
              </button>
            </div>
          </div>
        \`).join('');
      }

      function viewActivity(id) {
        window.location.href = '/activity?id=' + id + '&token=' + sessionToken;
      }

      document.getElementById('categoryFilter').addEventListener('change', displayActivities);
      document.getElementById('sortFilter').addEventListener('change', displayActivities);
      document.getElementById('searchBox').addEventListener('input', displayActivities);

      loadData();
    </script>
</body>
</html>
  `)
})

// Vendor Profile page (public)
app.get('/vendor/:vendor_slug', async (c) => {
  const { DB } = c.env
  const { vendor_slug } = c.req.param()
  const property_id = c.req.query('property') || '1'
  
  try {
    const vendor = await DB.prepare(`
      SELECT v.* FROM vendors v
      JOIN vendor_properties vp ON v.vendor_id = vp.vendor_id
      WHERE v.slug = ? AND vp.property_id = ? AND v.status = 'active'
    `).bind(vendor_slug, property_id).first()
    
    if (!vendor) {
      return c.html('<html><body><h1>Vendor not found</h1></body></html>', 404)
    }
    
    return c.html(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${vendor.business_name} - Vendor Profile</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
</head>
<body class="bg-gray-50">
    <div class="bg-gradient-to-r from-blue-500 to-green-500 text-white py-6 px-4">
        <div class="max-w-6xl mx-auto flex items-center justify-between">
            <button onclick="history.back()" class="px-4 py-2 bg-white/20 rounded-lg hover:bg-white/30"><i class="fas fa-arrow-left mr-2"></i>Back</button>
            <h1 class="text-2xl font-bold">Vendor Profile</h1>
            <div class="w-20"></div>
        </div>
    </div>

    <div class="max-w-6xl mx-auto px-4 py-8">
        <div class="bg-white rounded-lg shadow-xl overflow-hidden mb-6">
            <div class="bg-gradient-to-r from-blue-500 to-green-500 h-32"></div>
            <div class="px-6 pb-6">
                <div class="flex items-end gap-6 -mt-16 mb-6">
                    <img src="${vendor.profile_image || 'https://via.placeholder.com/150'}" alt="${vendor.business_name}" class="w-32 h-32 rounded-full border-4 border-white object-cover">
                    <div class="flex-1 pt-16">
                        <h2 class="text-3xl font-bold">${vendor.business_name}</h2>
                        <div class="flex gap-4 mt-2 text-gray-600">
                            ${vendor.city ? '<span><i class="fas fa-map-marker-alt mr-1"></i>' + vendor.city + (vendor.country ? ', ' + vendor.country : '') + '</span>' : ''}
                            ${vendor.years_experience ? '<span><i class="fas fa-award mr-1"></i>' + vendor.years_experience + ' years experience</span>' : ''}
                            ${vendor.safety_rating ? '<span><i class="fas fa-star mr-1 text-yellow-500"></i>' + vendor.safety_rating + '/5.0</span>' : ''}
                        </div>
                    </div>
                </div>

                ${vendor.description ? '<div class="mb-6"><h3 class="text-xl font-bold mb-3">About Us</h3><p class="text-gray-700">' + vendor.description + '</p></div>' : ''}

                <div class="grid md:grid-cols-2 gap-6 mb-6">
                    <div>
                        <h3 class="text-xl font-bold mb-3">Contact Information</h3>
                        <div class="space-y-2 text-gray-700">
                            ${vendor.phone ? '<p><i class="fas fa-phone mr-2 text-blue-600"></i>' + vendor.phone + '</p>' : ''}
                            ${vendor.email ? '<p><i class="fas fa-envelope mr-2 text-blue-600"></i>' + vendor.email + '</p>' : ''}
                            ${vendor.website ? '<p><i class="fas fa-globe mr-2 text-blue-600"></i><a href="' + vendor.website + '" target="_blank" class="text-blue-600 hover:underline">' + vendor.website + '</a></p>' : ''}
                            ${vendor.address ? '<p><i class="fas fa-map-marker-alt mr-2 text-blue-600"></i>' + vendor.address + '</p>' : ''}
                        </div>
                    </div>

                    <div>
                        <h3 class="text-xl font-bold mb-3">Details</h3>
                        <div class="space-y-2 text-gray-700" id="vendorDetails">
                            <!-- Will be populated by JavaScript -->
                        </div>
                    </div>
                </div>

                <div class="mb-6">
                    <h3 class="text-xl font-bold mb-3">Our Activities</h3>
                    <div id="activitiesList" class="grid md:grid-cols-3 gap-4">
                        <p class="text-gray-500 col-span-3 text-center py-4">Loading activities...</p>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script>
      const vendorSlug = '${vendor_slug}';
      const propertyId = '${property_id}';
      
      async function loadVendorData() {
        try {
          const response = await fetch(\`/api/vendors/\${vendorSlug}?property_id=\${propertyId}\`);
          const data = await response.json();
          
          // Display specialties
          const details = document.getElementById('vendorDetails');
          if (data.vendor.specialties && data.vendor.specialties.length > 0) {
            details.innerHTML += '<p><i class="fas fa-certificate mr-2 text-blue-600"></i><strong>Specialties:</strong> ' + data.vendor.specialties.join(', ') + '</p>';
          }
          
          if (data.vendor.languages_spoken && data.vendor.languages_spoken.length > 0) {
            details.innerHTML += '<p><i class="fas fa-language mr-2 text-blue-600"></i><strong>Languages:</strong> ' + data.vendor.languages_spoken.join(', ') + '</p>';
          }
          
          // Display activities
          const activitiesList = document.getElementById('activitiesList');
          if (data.activities.length === 0) {
            activitiesList.innerHTML = '<p class="text-gray-500 col-span-3 text-center py-4">No activities available</p>';
          } else {
            activitiesList.innerHTML = data.activities.map(a => \`
              <a href="/activity?id=\${a.activity_id}" class="block bg-white border rounded-lg p-4 hover:shadow-lg transition">
                <h4 class="font-bold mb-2">\${a.title}</h4>
                <p class="text-sm text-gray-600 mb-3 line-clamp-2">\${a.short_description}</p>
                <div class="flex justify-between items-center">
                  <span class="text-blue-600 font-bold">\${a.currency} \${a.price}</span>
                  <span class="text-sm text-gray-600">\${a.duration_minutes} min</span>
                </div>
              </a>
            \`).join('');
          }
        } catch (error) {
          console.error('Load vendor data error:', error);
        }
      }
      
      loadVendorData();
    </script>
</body>
</html>
    `)
  } catch (error) {
    console.error('Vendor profile page error:', error)
    return c.html('<html><body><h1>Error</h1><p>Failed to load vendor profile</p></body></html>', 500)
  }
})

// Activity Detail page
app.get('/activity', (c) => {
  return c.html(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Activity Details</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
</head>
<body class="bg-gray-50">
    <div id="loading" class="fixed inset-0 bg-white z-50 flex items-center justify-center">
        <div class="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500"></div>
    </div>

    <div id="content" class="hidden">
        <div class="bg-gradient-to-r from-blue-500 to-green-500 text-white py-4 px-4 sticky top-0 z-10 shadow-lg">
            <div class="max-w-4xl mx-auto flex items-center justify-between">
                <button onclick="history.back()" class="px-4 py-2 bg-white/20 rounded-lg hover:bg-white/30"><i class="fas fa-arrow-left mr-2"></i>Back</button>
                <h1 class="text-xl font-bold">Activity Details</h1>
                <div class="w-20"></div>
            </div>
        </div>

        <div class="max-w-4xl mx-auto px-4 py-8">
            <div class="bg-white rounded-lg shadow-lg p-6 mb-6">
                <h2 id="activityTitle" class="text-3xl font-bold mb-2"></h2>
                <p id="vendorName" class="text-gray-600 mb-4"></p>
                <div class="flex items-end gap-4 mb-4">
                    <div><span id="price" class="text-4xl font-bold text-blue-600"></span><span class="text-gray-600">/person</span></div>
                    <div class="flex gap-4 text-sm text-gray-600">
                        <span><i class="far fa-clock mr-1"></i><span id="duration"></span></span>
                        <span><i class="far fa-user mr-1"></i>Max <span id="capacity"></span></span>
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <button onclick="startBooking()" class="bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-lg text-lg font-semibold">
                        <i class="fas fa-calendar-check mr-2"></i>Book Now
                    </button>
                    <button onclick="showCallbackForm()" class="bg-green-500 hover:bg-green-600 text-white py-3 rounded-lg text-lg font-semibold">
                        <i class="fas fa-phone mr-2"></i>Request Callback
                    </button>
                </div>
            </div>

            <div class="bg-white rounded-lg shadow-lg p-6 mb-6">
                <h3 class="text-xl font-bold mb-3">About This Activity</h3>
                <p id="description" class="text-gray-700"></p>
            </div>
        </div>

        <!-- Callback Request Modal -->
        <div id="callbackModal" class="hidden fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div class="bg-white rounded-lg max-w-md w-full p-6">
                <div class="flex items-center justify-between mb-4">
                    <h2 class="text-2xl font-bold">Request Callback</h2>
                    <button onclick="closeCallbackModal()" class="text-gray-500 hover:text-gray-700"><i class="fas fa-times text-2xl"></i></button>
                </div>
                <form id="callbackForm" class="space-y-4">
                    <div><input type="text" id="cbFirstName" placeholder="First Name" required class="w-full px-4 py-2 border rounded-lg"></div>
                    <div><input type="text" id="cbLastName" placeholder="Last Name" required class="w-full px-4 py-2 border rounded-lg"></div>
                    <div><input type="tel" id="cbPhone" placeholder="Phone Number" required class="w-full px-4 py-2 border rounded-lg"></div>
                    <div><input type="email" id="cbEmail" placeholder="Email (optional)" class="w-full px-4 py-2 border rounded-lg"></div>
                    <div>
                        <select id="cbPreferredTime" class="w-full px-4 py-2 border rounded-lg">
                            <option value="anytime">Anytime</option>
                            <option value="morning">Morning (9AM-12PM)</option>
                            <option value="afternoon">Afternoon (12PM-5PM)</option>
                            <option value="evening">Evening (5PM-8PM)</option>
                        </select>
                    </div>
                    <div><textarea id="cbMessage" placeholder="Your message or questions (optional)" rows="3" class="w-full px-4 py-2 border rounded-lg"></textarea></div>
                    <button type="submit" class="w-full bg-green-500 text-white py-3 rounded-lg hover:bg-green-600 font-semibold">
                        <i class="fas fa-paper-plane mr-2"></i>Submit Request
                    </button>
                </form>
            </div>
        </div>

        <!-- Booking Modal -->
        <div id="bookingModal" class="hidden fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div class="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
                <div class="flex items-center justify-between mb-6">
                    <h2 class="text-2xl font-bold">Book This Activity</h2>
                    <button onclick="closeBookingModal()" class="text-gray-500 hover:text-gray-700"><i class="fas fa-times text-2xl"></i></button>
                </div>
                
                <div id="step1" class="space-y-4">
                    <h3 class="text-lg font-semibold">Select Date & Time</h3>
                    <div><label class="block text-sm font-medium mb-2">Date</label><input type="date" id="bookingDate" class="w-full px-4 py-2 border rounded-lg"></div>
                    <div id="timeSlots" class="space-y-2"></div>
                    <button onclick="nextStep(2)" class="w-full bg-blue-500 text-white py-3 rounded-lg font-semibold">Continue</button>
                </div>

                <div id="step2" class="hidden space-y-4">
                    <h3 class="text-lg font-semibold">Number of Participants</h3>
                    <div class="flex items-center gap-4">
                        <button onclick="changeParticipants(-1)" class="w-12 h-12 bg-gray-200 rounded-lg text-xl">-</button>
                        <span id="participantsCount" class="text-3xl font-bold">1</span>
                        <button onclick="changeParticipants(1)" class="w-12 h-12 bg-gray-200 rounded-lg text-xl">+</button>
                    </div>
                    <div class="bg-blue-50 p-4 rounded-lg"><p class="text-sm text-gray-700">Total: <span id="totalPrice" class="font-bold text-xl text-blue-600"></span></p></div>
                    <div class="flex gap-4">
                        <button onclick="nextStep(1)" class="flex-1 bg-gray-200 py-3 rounded-lg">Back</button>
                        <button onclick="nextStep(3)" class="flex-1 bg-blue-500 text-white py-3 rounded-lg">Continue</button>
                    </div>
                </div>

                <div id="step3" class="hidden space-y-4">
                    <h3 class="text-lg font-semibold">Your Information</h3>
                    <input type="text" id="firstName" placeholder="First Name" required class="w-full px-4 py-2 border rounded-lg">
                    <input type="text" id="lastName" placeholder="Last Name" required class="w-full px-4 py-2 border rounded-lg">
                    <input type="email" id="email" placeholder="Email" required class="w-full px-4 py-2 border rounded-lg">
                    <input type="tel" id="phone" placeholder="Phone" required class="w-full px-4 py-2 border rounded-lg">
                    <textarea id="notes" placeholder="Special requests (optional)" class="w-full px-4 py-2 border rounded-lg" rows="3"></textarea>
                    <div class="flex gap-4">
                        <button onclick="nextStep(2)" class="flex-1 bg-gray-200 py-3 rounded-lg">Back</button>
                        <button onclick="nextStep(4)" class="flex-1 bg-blue-500 text-white py-3 rounded-lg">Continue</button>
                    </div>
                </div>

                <div id="step4" class="hidden space-y-4">
                    <h3 class="text-lg font-semibold">Payment Method</h3>
                    <label class="flex items-center p-4 border-2 rounded-lg cursor-pointer hover:border-blue-500">
                        <input type="radio" name="payment" value="pay_at_vendor" checked class="mr-3">
                        <div class="flex-1"><p class="font-semibold">Pay at Venue</p><p class="text-sm text-gray-600">Pay when you arrive</p></div>
                        <i class="fas fa-money-bill-wave text-2xl text-green-500"></i>
                    </label>
                    <div class="flex gap-4">
                        <button onclick="nextStep(3)" class="flex-1 bg-gray-200 py-3 rounded-lg">Back</button>
                        <button onclick="confirmBooking()" class="flex-1 bg-green-500 text-white py-3 rounded-lg"><i class="fas fa-check mr-2"></i>Confirm</button>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script>
      let activity = null;
      let selectedDate = null;
      let selectedTime = null;
      let participants = 1;
      const activityId = new URLSearchParams(window.location.search).get('id');
      const sessionToken = new URLSearchParams(window.location.search).get('token') || localStorage.getItem('session_token');

      async function init() {
        if (!activityId) { alert('Activity not found'); return; }
        try {
          const response = await fetch('/api/activities/' + activityId + '?lang=en');
          const data = await response.json();
          activity = data.activity;

          document.getElementById('activityTitle').textContent = activity.title;
          document.getElementById('vendorName').textContent = activity.vendor_name;
          document.getElementById('price').textContent = activity.currency + ' ' + activity.price;
          document.getElementById('duration').textContent = activity.duration_minutes + ' min';
          document.getElementById('capacity').textContent = activity.capacity_per_slot;
          document.getElementById('description').textContent = activity.full_description;

          const today = new Date().toISOString().split('T')[0];
          document.getElementById('bookingDate').min = today;
          document.getElementById('bookingDate').value = today;

          document.getElementById('loading').classList.add('hidden');
          document.getElementById('content').classList.remove('hidden');
        } catch (error) {
          console.error('Load error:', error);
          alert('Failed to load activity');
        }
      }

      function startBooking() {
        document.getElementById('bookingModal').classList.remove('hidden');
        loadTimeSlots();
      }

      function closeBookingModal() {
        document.getElementById('bookingModal').classList.add('hidden');
      }

      async function loadTimeSlots() {
        const date = document.getElementById('bookingDate').value;
        if (!date) return;
        try {
          const response = await fetch('/api/availability/' + activityId + '?date=' + date);
          const data = await response.json();
          const slotsHtml = data.slots.map(slot => '<button onclick="selectTime(\\'' + slot.time + '\\')" class="w-full p-3 border rounded-lg hover:border-blue-500"><div class="flex justify-between"><span>' + slot.time + '</span><span class="text-sm ' + (slot.available > 0 ? 'text-green-600' : 'text-red-600') + '">' + (slot.available > 0 ? slot.available + ' spots' : 'Full') + '</span></div></button>').join('');
          document.getElementById('timeSlots').innerHTML = slotsHtml;
        } catch (error) {
          console.error('Load slots error:', error);
        }
      }

      function selectTime(time) {
        selectedTime = time;
        document.querySelectorAll('#timeSlots button').forEach(btn => btn.classList.remove('border-blue-500', 'border-2'));
        event.target.closest('button').classList.add('border-blue-500', 'border-2');
      }

      function nextStep(step) {
        if (step === 2 && !selectedTime) { alert('Please select a time slot'); return; }
        document.querySelectorAll('[id^="step"]').forEach(el => el.classList.add('hidden'));
        document.getElementById('step' + step).classList.remove('hidden');
        if (step === 2) updateTotalPrice();
      }

      function changeParticipants(delta) {
        participants = Math.max(1, Math.min(activity.capacity_per_slot, participants + delta));
        document.getElementById('participantsCount').textContent = participants;
        updateTotalPrice();
      }

      function updateTotalPrice() {
        const total = activity.price * participants;
        document.getElementById('totalPrice').textContent = activity.currency + ' ' + total;
      }

      async function confirmBooking() {
        const firstName = document.getElementById('firstName').value;
        const lastName = document.getElementById('lastName').value;
        const email = document.getElementById('email').value;
        const phone = document.getElementById('phone').value;
        if (!firstName || !lastName || !email || !phone) { alert('Please fill all fields'); return; }

        try {
          const response = await fetch('/api/bookings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              session_token: sessionToken,
              activity_id: activityId,
              activity_date: document.getElementById('bookingDate').value,
              activity_time: selectedTime,
              num_participants: participants,
              payment_method: 'pay_at_vendor',
              guest_notes: document.getElementById('notes').value,
              guest_info: { first_name: firstName, last_name: lastName, email, phone }
            })
          });

          const data = await response.json();
          if (data.success) {
            alert('Booking confirmed! Reference: ' + data.booking_reference);
            window.location.href = '/browse?token=' + sessionToken;
          } else {
            alert('Booking failed: ' + (data.error || 'Unknown error'));
          }
        } catch (error) {
          console.error('Booking error:', error);
          alert('Failed to create booking');
        }
      }

      function showCallbackForm() {
        document.getElementById('callbackModal').classList.remove('hidden');
      }

      function closeCallbackModal() {
        document.getElementById('callbackModal').classList.add('hidden');
      }

      document.getElementById('callbackForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          const response = await fetch('/api/callback-request', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              property_id: 1,
              first_name: document.getElementById('cbFirstName').value,
              last_name: document.getElementById('cbLastName').value,
              phone: document.getElementById('cbPhone').value,
              email: document.getElementById('cbEmail').value || null,
              preferred_time: document.getElementById('cbPreferredTime').value,
              message: document.getElementById('cbMessage').value || null
            })
          });

          const data = await response.json();
          if (data.success) {
            alert('Callback request submitted! We will contact you soon.');
            closeCallbackModal();
            document.getElementById('callbackForm').reset();
          } else {
            alert('Error: ' + (data.error || 'Failed to submit request'));
          }
        } catch (error) {
          console.error('Callback request error:', error);
          alert('Failed to submit request');
        }
      });

      document.getElementById('bookingDate').addEventListener('change', loadTimeSlots);
      init();
    </script>
</body>
</html>
  `)
})

// SIMPLE TEST DASHBOARD
app.get('/admin/test', async (c) => {
  const { DB } = c.env
  const rooms = await DB.prepare(`SELECT * FROM rooms WHERE property_id = 1 ORDER BY room_number`).all()
  
  return c.html(`
<!DOCTYPE html>
<html>
<head>
    <title>Simple Test</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="p-8">
    <h1 class="text-3xl font-bold mb-4">SIMPLE API TEST</h1>
    <div class="bg-white p-6 rounded shadow">
        <h2 class="text-xl mb-4">Rooms from Database:</h2>
        <div id="roomsList"></div>
    </div>
    <script>
        async function loadRooms() {
            const response = await fetch('/api/admin/rooms?property_id=1');
            const rooms = await response.json();
            const list = document.getElementById('roomsList');
            list.innerHTML = rooms.map(r => \`
                <div class="border p-4 mb-2">
                    <strong>Room \${r.room_number}</strong> (\${r.room_type})
                    <br>QR: \${r.qr_code_data}
                </div>
            \`).join('');
        }
        loadRooms();
    </script>
</body>
</html>
  `)
})

// Admin Dashboard page
app.get('/admin/dashboard', (c) => {
  return c.html(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Dashboard</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    <style>
      .tab-active { border-bottom: 3px solid #3B82F6; color: #3B82F6; }
      .hidden { display: none !important; }
      .tab-content { display: block; }
      .tab-btn { cursor: pointer; transition: all 0.3s; }
      .tab-btn:hover { background-color: rgba(59, 130, 246, 0.1); }
    </style>
</head>
<body class="bg-gray-50">
    <div class="bg-gradient-to-r from-blue-700 to-indigo-700 text-white py-4 px-4 shadow-lg">
        <div class="max-w-7xl mx-auto flex justify-between items-center">
            <div><h1 class="text-2xl font-bold">Admin Dashboard</h1></div>
            <button onclick="logout()" class="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg"><i class="fas fa-sign-out-alt mr-2"></i>Logout</button>
        </div>
    </div>

    <div class="max-w-7xl mx-auto px-4 py-8">
        <!-- Tabs -->
        <div class="bg-white rounded-lg shadow mb-6">
            <div class="flex overflow-x-auto">
                <button data-tab="rooms" class="tab-btn px-6 py-4 font-semibold tab-active"><i class="fas fa-qrcode mr-2"></i>Rooms & QR Codes</button>
                <button data-tab="vendors" class="tab-btn px-6 py-4 font-semibold"><i class="fas fa-store mr-2"></i>Vendors</button>
                <button data-tab="regcode" class="tab-btn px-6 py-4 font-semibold"><i class="fas fa-key mr-2"></i>Vendor Code</button>
                <button data-tab="offerings" class="tab-btn px-6 py-4 font-semibold"><i class="fas fa-utensils mr-2"></i>Hotel Offerings</button>
                <button data-tab="activities" class="tab-btn px-6 py-4 font-semibold"><i class="fas fa-hiking mr-2"></i>Activities</button>
                <button data-tab="callbacks" class="tab-btn px-6 py-4 font-semibold"><i class="fas fa-phone mr-2"></i>Callbacks</button>
                <button data-tab="settings" class="tab-btn px-6 py-4 font-semibold"><i class="fas fa-cog mr-2"></i>Design Settings</button>
            </div>
        </div>

        <!-- Rooms Tab -->
        <div id="roomsTab" class="tab-content">
            <div class="bg-white rounded-lg shadow-lg p-6 mb-6">
                <h2 class="text-2xl font-bold mb-4"><i class="fas fa-door-open mr-2 text-blue-600"></i>Add New Room & Generate QR Code</h2>
                <form id="addRoomForm" class="grid md:grid-cols-3 gap-4">
                    <input type="text" id="roomNumber" placeholder="Room Number (e.g., 101)" required class="px-4 py-2 border rounded-lg">
                    <select id="roomType" required class="px-4 py-2 border rounded-lg">
                        <option value="">Select Type...</option>
                        <option value="Standard">Standard</option>
                        <option value="Deluxe">Deluxe</option>
                        <option value="Suite">Suite</option>
                        <option value="Villa">Villa</option>
                    </select>
                    <button type="submit" class="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"><i class="fas fa-plus mr-2"></i>Create Room & QR Code</button>
                </form>
            </div>

            <div class="bg-white rounded-lg shadow-lg p-6">
                <h2 class="text-2xl font-bold mb-4">Rooms & QR Codes</h2>
                <div id="roomsList" class="space-y-3"></div>
            </div>
        </div>

        <!-- Vendors Tab -->
        <div id="vendorsTab" class="tab-content hidden">
            <div class="bg-white rounded-lg shadow-lg p-6 mb-6">
                <h2 class="text-2xl font-bold mb-4"><i class="fas fa-user-plus mr-2 text-green-600"></i>Add New Vendor</h2>
                <form id="addVendorForm" class="space-y-4">
                    <div class="grid md:grid-cols-2 gap-4">
                        <input type="text" id="businessName" placeholder="Business Name" required class="px-4 py-2 border rounded-lg">
                        <input type="email" id="vendorEmail" placeholder="Email" required class="px-4 py-2 border rounded-lg">
                        <input type="text" id="vendorPhone" placeholder="Phone" required class="px-4 py-2 border rounded-lg">
                        <input type="password" id="vendorPassword" placeholder="Password" required class="px-4 py-2 border rounded-lg">
                    </div>
                    <button type="submit" class="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700"><i class="fas fa-check mr-2"></i>Add Vendor</button>
                </form>
            </div>

            <div class="bg-white rounded-lg shadow-lg p-6">
                <h2 class="text-2xl font-bold mb-4">All Vendors</h2>
                <div id="vendorsList" class="space-y-3"></div>
            </div>
        </div>

        <!-- Registration Code Tab -->
        <div id="regcodeTab" class="tab-content hidden">
            <div class="bg-white rounded-lg shadow-lg p-6">
                <h2 class="text-2xl font-bold mb-4"><i class="fas fa-key mr-2 text-purple-600"></i>Vendor Registration Code</h2>
                <p class="text-gray-600 mb-4">Share this code with vendors so they can self-register to your hotel</p>
                
                <div class="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 mb-6">
                    <div class="flex justify-between items-center mb-4">
                        <div>
                            <p class="text-sm text-gray-600 mb-2">Current Registration Code</p>
                            <p class="text-4xl font-bold text-blue-600" id="regCode">Loading...</p>
                        </div>
                        <button onclick="regenerateRegCode()" class="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700">
                            <i class="fas fa-sync mr-2"></i>Regenerate Code
                        </button>
                    </div>
                    <p class="text-sm text-gray-600">Expires: <span id="regCodeExpiry">Loading...</span></p>
                </div>
                
                <div class="bg-gray-50 rounded-lg p-4">
                    <h3 class="font-bold mb-2">How it works:</h3>
                    <ol class="list-decimal list-inside space-y-2 text-sm text-gray-700">
                        <li>Share this registration code with your vendors</li>
                        <li>Vendors visit the registration page at <code class="bg-white px-2 py-1 rounded">/vendor/register</code></li>
                        <li>They enter the code along with their business details</li>
                        <li>Once registered, they can immediately add activities to your hotel</li>
                    </ol>
                </div>
            </div>
        </div>

        <!-- Hotel Offerings Tab -->
        <div id="offeringsTab" class="tab-content hidden">
            <div class="bg-white rounded-lg shadow-lg p-6 mb-6">
                <h2 class="text-2xl font-bold mb-4"><i class="fas fa-plus-circle mr-2 text-green-600"></i>Add New Hotel Offering</h2>
                <form id="addOfferingForm" class="space-y-4">
                    <div class="grid md:grid-cols-2 gap-4">
                        <select id="offeringType" required class="px-4 py-2 border rounded-lg">
                            <option value="">Select Type...</option>
                            <option value="restaurant">Restaurant</option>
                            <option value="event">Event</option>
                            <option value="spa">Spa/Wellness</option>
                            <option value="service">Other Service</option>
                        </select>
                        <input type="text" id="offeringTitle" placeholder="Title (English)" required class="px-4 py-2 border rounded-lg">
                    </div>
                    <textarea id="offeringDescription" placeholder="Short description" required class="w-full px-4 py-2 border rounded-lg" rows="2"></textarea>
                    <textarea id="offeringFullDescription" placeholder="Full description" class="w-full px-4 py-2 border rounded-lg" rows="3"></textarea>
                    <div class="grid md:grid-cols-3 gap-4">
                        <input type="number" id="offeringPrice" placeholder="Price" step="0.01" class="px-4 py-2 border rounded-lg">
                        <input type="text" id="offeringLocation" placeholder="Location" class="px-4 py-2 border rounded-lg">
                        <input type="number" id="offeringDuration" placeholder="Duration (minutes)" class="px-4 py-2 border rounded-lg">
                    </div>
                    <div class="grid md:grid-cols-2 gap-4">
                        <input type="text" id="offeringImages" placeholder="Image URL (comma-separated for multiple)" class="px-4 py-2 border rounded-lg">
                        <label class="flex items-center px-4 py-2 border rounded-lg">
                            <input type="checkbox" id="offeringRequiresBooking" class="mr-2">
                            <span>Requires Booking</span>
                        </label>
                    </div>
                    
                    <!-- Event-specific fields (hidden by default) -->
                    <div id="eventFields" class="hidden grid md:grid-cols-3 gap-4">
                        <input type="date" id="eventDate" placeholder="Event Date" class="px-4 py-2 border rounded-lg">
                        <input type="time" id="eventStartTime" placeholder="Start Time" class="px-4 py-2 border rounded-lg">
                        <input type="time" id="eventEndTime" placeholder="End Time" class="px-4 py-2 border rounded-lg">
                    </div>
                    
                    <button type="submit" class="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700">
                        <i class="fas fa-check mr-2"></i>Add Offering
                    </button>
                </form>
            </div>

            <div class="bg-white rounded-lg shadow-lg p-6">
                <h2 class="text-2xl font-bold mb-4">All Hotel Offerings</h2>
                <div class="mb-4 flex gap-2">
                    <button onclick="filterOfferings('all')" class="offering-filter-btn px-4 py-2 rounded bg-blue-500 text-white" data-type="all">All</button>
                    <button onclick="filterOfferings('restaurant')" class="offering-filter-btn px-4 py-2 rounded bg-gray-200" data-type="restaurant">Restaurants</button>
                    <button onclick="filterOfferings('event')" class="offering-filter-btn px-4 py-2 rounded bg-gray-200" data-type="event">Events</button>
                    <button onclick="filterOfferings('spa')" class="offering-filter-btn px-4 py-2 rounded bg-gray-200" data-type="spa">Spa</button>
                </div>
                <div id="offeringsList" class="space-y-3"></div>
            </div>
        </div>

        <!-- Activities Tab -->
        <div id="activitiesTab" class="tab-content hidden">
            <div class="bg-white rounded-lg shadow-lg p-6">
                <h2 class="text-2xl font-bold mb-4">All Activities</h2>
                <div id="activitiesList" class="space-y-3"></div>
            </div>
        </div>

        <!-- Callbacks Tab -->
        <div id="callbacksTab" class="tab-content hidden">
            <div class="bg-white rounded-lg shadow-lg p-6">
                <h2 class="text-2xl font-bold mb-4"><i class="fas fa-phone mr-2 text-orange-600"></i>Callback Requests</h2>
                <div id="callbacksList" class="space-y-3"></div>
            </div>
        </div>

        <!-- Settings Tab -->
        <div id="settingsTab" class="tab-content hidden">
            <div class="bg-white rounded-lg shadow-lg p-6">
                <h2 class="text-2xl font-bold mb-6"><i class="fas fa-cog mr-2 text-purple-600"></i>Hotel Design Settings</h2>
                
                <!-- Hotel Homepage Link -->
                <div class="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h3 class="text-lg font-semibold mb-2 text-blue-800"><i class="fas fa-link mr-2"></i>Your Hotel Homepage</h3>
                    <div class="flex items-center gap-4">
                        <input type="text" id="homepageUrl" readonly class="flex-1 px-4 py-2 border rounded-lg bg-white font-mono text-sm" />
                        <button onclick="copyHomepageUrl()" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                            <i class="fas fa-copy mr-2"></i>Copy Link
                        </button>
                        <a id="visitHomepage" href="#" target="_blank" class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                            <i class="fas fa-external-link-alt mr-2"></i>Visit
                        </a>
                    </div>
                </div>

                <form id="settingsForm" class="space-y-6">
                    <!-- Basic Information Section -->
                    <div class="border-b pb-6">
                        <h3 class="text-xl font-semibold mb-4 text-gray-800"><i class="fas fa-hotel mr-2"></i>Basic Information</h3>
                        
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div class="md:col-span-2">
                                <label class="block text-sm font-medium mb-2">Hotel Name</label>
                                <input type="text" id="hotelName" class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Paradise Resort & Spa" required />
                                <p class="text-xs text-gray-500 mt-1">This name appears on your homepage and everywhere</p>
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium mb-2">Tagline / Slogan</label>
                                <input type="text" id="hotelTagline" class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Discover all we have to offer" />
                                <p class="text-xs text-gray-500 mt-1">Appears below hotel name on hero</p>
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium mb-2">Contact Email</label>
                                <input type="email" id="hotelEmail" class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="info@hotel.com" />
                                <p class="text-xs text-gray-500 mt-1">Displayed in footer</p>
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium mb-2">Contact Phone</label>
                                <input type="tel" id="hotelPhone" class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="+1 234 567 8900" />
                                <p class="text-xs text-gray-500 mt-1">Displayed in footer</p>
                            </div>
                            
                            <div class="md:col-span-2">
                                <label class="block text-sm font-medium mb-2">Address</label>
                                <input type="text" id="hotelAddress" class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="123 Beach Road, Paradise City" />
                                <p class="text-xs text-gray-500 mt-1">Full hotel address</p>
                            </div>
                        </div>
                    </div>

                    <!-- Branding Section -->
                    <div class="border-b pb-6">
                        <h3 class="text-xl font-semibold mb-4 text-gray-800"><i class="fas fa-palette mr-2"></i>Visual Branding</h3>
                        
                        <div class="space-y-6">
                            <div>
                                <label class="block text-sm font-medium mb-2">Hotel Logo URL</label>
                                <input type="url" id="brandLogoUrl" class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="https://example.com/logo.png" />
                                <p class="text-xs text-gray-500 mt-1">Recommended: PNG or SVG, transparent background, max height 80px</p>
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium mb-2">Hero Background Image URL</label>
                                <input type="url" id="heroImageUrl" class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="https://example.com/hero.jpg" />
                                <p class="text-xs text-gray-500 mt-1">Recommended: 1920x600px, high quality, landscape orientation</p>
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium mb-2">Hero Image Effect</label>
                                <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    <label class="cursor-pointer">
                                        <input type="radio" name="heroImageEffect" value="none" class="peer sr-only" checked />
                                        <div class="border-2 border-gray-300 rounded-lg p-3 text-center peer-checked:border-blue-600 peer-checked:bg-blue-50 hover:border-blue-400 transition">
                                            <div class="w-full h-12 bg-gradient-to-r from-blue-400 to-green-400 rounded mb-2"></div>
                                            <span class="text-xs font-medium">Original</span>
                                        </div>
                                    </label>
                                    
                                    <label class="cursor-pointer">
                                        <input type="radio" name="heroImageEffect" value="grayscale" class="peer sr-only" />
                                        <div class="border-2 border-gray-300 rounded-lg p-3 text-center peer-checked:border-blue-600 peer-checked:bg-blue-50 hover:border-blue-400 transition">
                                            <div class="w-full h-12 bg-gradient-to-r from-gray-400 to-gray-500 rounded mb-2"></div>
                                            <span class="text-xs font-medium">Grayscale</span>
                                        </div>
                                    </label>
                                    
                                    <label class="cursor-pointer">
                                        <input type="radio" name="heroImageEffect" value="sepia" class="peer sr-only" />
                                        <div class="border-2 border-gray-300 rounded-lg p-3 text-center peer-checked:border-blue-600 peer-checked:bg-blue-50 hover:border-blue-400 transition">
                                            <div class="w-full h-12 bg-gradient-to-r from-yellow-700 to-orange-600 rounded mb-2"></div>
                                            <span class="text-xs font-medium">Sepia</span>
                                        </div>
                                    </label>
                                    
                                    <label class="cursor-pointer">
                                        <input type="radio" name="heroImageEffect" value="blur" class="peer sr-only" />
                                        <div class="border-2 border-gray-300 rounded-lg p-3 text-center peer-checked:border-blue-600 peer-checked:bg-blue-50 hover:border-blue-400 transition">
                                            <div class="w-full h-12 bg-gradient-to-r from-blue-300 to-purple-300 rounded mb-2 opacity-60"></div>
                                            <span class="text-xs font-medium">Blur</span>
                                        </div>
                                    </label>
                                </div>
                                <p class="text-xs text-gray-500 mt-2">Choose how your hero background image appears</p>
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium mb-2">Hero Overlay Opacity</label>
                                <div class="flex items-center gap-4">
                                    <input type="range" id="heroOverlayOpacity" min="0" max="100" value="30" class="flex-1" />
                                    <span id="heroOverlayValue" class="text-sm font-medium w-12 text-center">30%</span>
                                </div>
                                <p class="text-xs text-gray-500 mt-1">Dark overlay to improve text readability (0% = no overlay, 100% = completely dark)</p>
                            </div>
                        </div>
                    </div>

                    <!-- Colors Section -->
                    <div class="border-b pb-6">
                        <h3 class="text-xl font-semibold mb-4 text-gray-800"><i class="fas fa-fill-drip mr-2"></i>Color Scheme</h3>
                        
                        <div class="space-y-6">
                            <div>
                                <label class="block text-sm font-medium mb-2">Primary Color</label>
                                <div class="flex gap-2 mb-2">
                                    <input type="color" id="primaryColor" class="w-16 h-10 border rounded cursor-pointer" />
                                    <input type="text" id="primaryColorText" class="flex-1 px-4 py-2 border rounded-lg font-mono text-sm" placeholder="#3B82F6" />
                                </div>
                                <label class="flex items-center text-sm text-gray-600 cursor-pointer">
                                    <input type="checkbox" id="primaryGradient" class="mr-2" />
                                    <span>Use gradient (Primary → Secondary)</span>
                                </label>
                                <div id="primaryGradientPreview" class="hidden mt-2 h-8 rounded-lg" style="background: linear-gradient(135deg, #3B82F6, #10B981);"></div>
                                <p class="text-xs text-gray-500 mt-1">Main brand color (headers, buttons)</p>
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium mb-2">Secondary Color</label>
                                <div class="flex gap-2 mb-2">
                                    <input type="color" id="secondaryColor" class="w-16 h-10 border rounded cursor-pointer" />
                                    <input type="text" id="secondaryColorText" class="flex-1 px-4 py-2 border rounded-lg font-mono text-sm" placeholder="#10B981" />
                                </div>
                                <p class="text-xs text-gray-500 mt-1">Secondary elements & gradient partner</p>
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium mb-2">Accent Color</label>
                                <div class="flex gap-2 mb-2">
                                    <input type="color" id="accentColor" class="w-16 h-10 border rounded cursor-pointer" />
                                    <input type="text" id="accentColorText" class="flex-1 px-4 py-2 border rounded-lg font-mono text-sm" placeholder="#F59E0B" />
                                </div>
                                <p class="text-xs text-gray-500 mt-1">Highlights and badges</p>
                            </div>
                        </div>
                    </div>

                    <!-- Layout Section -->
                    <div class="border-b pb-6">
                        <h3 class="text-xl font-semibold mb-4 text-gray-800"><i class="fas fa-th-large mr-2"></i>Layout Style</h3>
                        
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <label class="relative cursor-pointer group">
                                <input type="radio" name="layoutStyle" value="modern" class="peer sr-only" />
                                <div class="border-2 border-gray-300 rounded-lg p-4 peer-checked:border-blue-600 peer-checked:bg-blue-50 hover:border-blue-400 transition">
                                    <div class="text-center mb-3">
                                        <i class="fas fa-layer-group text-3xl mb-2 text-blue-600"></i>
                                        <h4 class="font-semibold">Modern</h4>
                                        <p class="text-xs text-gray-500 mt-1">Clean cards with shadows</p>
                                    </div>
                                    <!-- Mini Preview -->
                                    <div class="bg-gray-100 p-3 rounded space-y-2">
                                        <div class="bg-white rounded-xl shadow-md p-2 h-16"></div>
                                        <div class="bg-white rounded-xl shadow-md p-2 h-12"></div>
                                    </div>
                                </div>
                            </label>
                            
                            <label class="relative cursor-pointer group">
                                <input type="radio" name="layoutStyle" value="elegant" class="peer sr-only" />
                                <div class="border-2 border-gray-300 rounded-lg p-4 peer-checked:border-blue-600 peer-checked:bg-blue-50 hover:border-blue-400 transition">
                                    <div class="text-center mb-3">
                                        <i class="fas fa-gem text-3xl mb-2 text-purple-600"></i>
                                        <h4 class="font-semibold">Elegant</h4>
                                        <p class="text-xs text-gray-500 mt-1">Luxury with borders</p>
                                    </div>
                                    <!-- Mini Preview -->
                                    <div class="bg-gray-100 p-3 rounded space-y-2">
                                        <div class="bg-white rounded-sm border-2 border-gray-300 p-2 h-16"></div>
                                        <div class="bg-white rounded-sm border-2 border-gray-300 p-2 h-12"></div>
                                    </div>
                                </div>
                            </label>
                            
                            <label class="relative cursor-pointer group">
                                <input type="radio" name="layoutStyle" value="minimal" class="peer sr-only" />
                                <div class="border-2 border-gray-300 rounded-lg p-4 peer-checked:border-blue-600 peer-checked:bg-blue-50 hover:border-blue-400 transition">
                                    <div class="text-center mb-3">
                                        <i class="fas fa-minus text-3xl mb-2 text-gray-600"></i>
                                        <h4 class="font-semibold">Minimal</h4>
                                        <p class="text-xs text-gray-500 mt-1">Simple and flat</p>
                                    </div>
                                    <!-- Mini Preview -->
                                    <div class="bg-gray-100 p-3 rounded space-y-2">
                                        <div class="bg-white rounded-md p-2 h-16 border border-gray-200"></div>
                                        <div class="bg-white rounded-md p-2 h-12 border border-gray-200"></div>
                                    </div>
                                </div>
                            </label>
                        </div>
                    </div>

                    <!-- Typography Section -->
                    <div class="border-b pb-6">
                        <h3 class="text-xl font-semibold mb-4 text-gray-800"><i class="fas fa-font mr-2"></i>Typography</h3>
                        
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label class="block text-sm font-medium mb-2">Font Family</label>
                                <select id="fontFamily" class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500">
                                    <option value="inter">Inter (Modern Sans)</option>
                                    <option value="poppins">Poppins (Geometric)</option>
                                    <option value="playfair">Playfair Display (Elegant Serif)</option>
                                    <option value="montserrat">Montserrat (Bold Sans)</option>
                                    <option value="lora">Lora (Classic Serif)</option>
                                </select>
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium mb-2">Button Style</label>
                                <select id="buttonStyle" class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500">
                                    <option value="rounded">Rounded</option>
                                    <option value="square">Square</option>
                                    <option value="pill">Pill (Fully Rounded)</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <!-- UI Elements Section -->
                    <div class="border-b pb-6">
                        <h3 class="text-xl font-semibold mb-4 text-gray-800"><i class="fas fa-cube mr-2"></i>UI Elements</h3>
                        
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label class="block text-sm font-medium mb-2">Card Style</label>
                                <select id="cardStyle" class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500">
                                    <option value="shadow">Shadow</option>
                                    <option value="border">Border Only</option>
                                    <option value="elevated">Elevated</option>
                                    <option value="flat">Flat</option>
                                </select>
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium mb-2">Header Style</label>
                                <select id="headerStyle" class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500">
                                    <option value="transparent">Transparent Overlay</option>
                                    <option value="solid">Solid Background</option>
                                    <option value="gradient">Gradient</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <!-- Homepage Layout Control Section -->
                    <div class="border-b pb-6">
                        <h3 class="text-xl font-semibold mb-4 text-gray-800"><i class="fas fa-th-list mr-2"></i>Homepage Layout Control</h3>
                        <p class="text-sm text-gray-600 mb-4">Control what appears on your homepage and in what order</p>
                        
                        <!-- Hotel Map -->
                        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                            <h4 class="font-semibold mb-3 text-gray-800"><i class="fas fa-map mr-2 text-blue-600"></i>Hotel/Resort Map</h4>
                            <div class="space-y-3">
                                <div>
                                    <label class="block text-sm font-medium mb-2">Hotel Map Image URL</label>
                                    <input type="url" id="hotelMapUrl" class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="https://example.com/hotel-map.jpg" />
                                    <p class="text-xs text-gray-500 mt-1">Upload your hotel/resort map (floor plan, grounds map, etc.)</p>
                                </div>
                                
                                <label class="flex items-center cursor-pointer">
                                    <input type="checkbox" id="showHotelMap" class="mr-2 w-4 h-4" />
                                    <span class="text-sm font-medium">Show Hotel Map on Homepage</span>
                                </label>
                            </div>
                        </div>
                        
                        <!-- Section Visibility -->
                        <div class="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
                            <h4 class="font-semibold mb-3 text-gray-800"><i class="fas fa-eye mr-2 text-green-600"></i>Section Visibility</h4>
                            <p class="text-xs text-gray-500 mb-3">Toggle which sections appear on your homepage</p>
                            <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                                <label class="flex items-center cursor-pointer p-3 bg-white rounded border hover:border-blue-400 transition">
                                    <input type="checkbox" id="showRestaurants" class="mr-2 w-4 h-4" checked />
                                    <span class="text-sm font-medium">🍽️ Restaurants</span>
                                </label>
                                
                                <label class="flex items-center cursor-pointer p-3 bg-white rounded border hover:border-blue-400 transition">
                                    <input type="checkbox" id="showEvents" class="mr-2 w-4 h-4" checked />
                                    <span class="text-sm font-medium">🎉 Events</span>
                                </label>
                                
                                <label class="flex items-center cursor-pointer p-3 bg-white rounded border hover:border-blue-400 transition">
                                    <input type="checkbox" id="showSpa" class="mr-2 w-4 h-4" checked />
                                    <span class="text-sm font-medium">💆 Spa</span>
                                </label>
                                
                                <label class="flex items-center cursor-pointer p-3 bg-white rounded border hover:border-blue-400 transition">
                                    <input type="checkbox" id="showService" class="mr-2 w-4 h-4" checked />
                                    <span class="text-sm font-medium">🛎️ Services</span>
                                </label>
                                
                                <label class="flex items-center cursor-pointer p-3 bg-white rounded border hover:border-blue-400 transition">
                                    <input type="checkbox" id="showActivities" class="mr-2 w-4 h-4" checked />
                                    <span class="text-sm font-medium">🏃 Activities</span>
                                </label>
                            </div>
                        </div>
                        
                        <!-- Section Order -->
                        <div class="bg-purple-50 border border-purple-200 rounded-lg p-4">
                            <h4 class="font-semibold mb-3 text-gray-800"><i class="fas fa-sort mr-2 text-purple-600"></i>Section Order</h4>
                            <p class="text-xs text-gray-500 mb-3">Drag to reorder how sections appear on your homepage</p>
                            <div id="sectionOrderList" class="space-y-2">
                                <!-- Will be populated dynamically -->
                            </div>
                            <p class="text-xs text-gray-400 mt-3"><i class="fas fa-info-circle mr-1"></i>Drag sections up/down to change their display order</p>
                        </div>
                    </div>

                    <!-- Preview & Save -->
                    <div class="flex gap-4">
                        <button type="button" onclick="previewDesign()" class="flex-1 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-semibold">
                            <i class="fas fa-eye mr-2"></i>Preview Changes
                        </button>
                        <button type="submit" class="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold">
                            <i class="fas fa-save mr-2"></i>Save Design Settings
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <script>
      const user = JSON.parse(localStorage.getItem('admin_user') || '{}');
      if (!user.user_id) { window.location.href = '/admin/login'; }

      let currentTab = 'rooms';
      
      function showTab(tab, clickedButton) {
        currentTab = tab;
        document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('tab-active'));
        document.getElementById(tab + 'Tab').classList.remove('hidden');
        if (clickedButton) {
          clickedButton.classList.add('tab-active');
        }
        
        if (tab === 'rooms') loadRooms();
        if (tab === 'vendors') loadVendors();
        if (tab === 'regcode') loadRegCode();
        if (tab === 'offerings') loadOfferings();
        if (tab === 'activities') loadActivities();
        if (tab === 'callbacks') loadCallbacks();
        if (tab === 'settings') loadSettings();
      }
      
      // Add event listeners to tab buttons
      document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
          const tab = this.getAttribute('data-tab');
          showTab(tab, this);
        });
      });

      async function loadRegCode() {
        try {
          const response = await fetch('/api/admin/registration-code?property_id=1');
          const data = await response.json();
          document.getElementById('regCode').textContent = data.registration_code;
          const expiry = new Date(data.expires_at);
          document.getElementById('regCodeExpiry').textContent = expiry.toLocaleDateString();
        } catch (error) {
          console.error('Load reg code error:', error);
        }
      }

      async function regenerateRegCode() {
        if (!confirm('Regenerate registration code? The old code will no longer work.')) return;
        try {
          const response = await fetch('/api/admin/regenerate-registration-code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ property_id: 1 })
          });
          const data = await response.json();
          if (data.success) {
            alert('New registration code generated!');
            loadRegCode();
          }
        } catch (error) {
          console.error('Regenerate code error:', error);
        }
      }

      async function loadCallbacks() {
        try {
          const response = await fetch('/api/admin/callback-requests?property_id=1');
          const data = await response.json();
          const list = document.getElementById('callbacksList');
          
          if (data.requests.length === 0) {
            list.innerHTML = '<p class="text-gray-500 text-center py-4">No callback requests</p>';
            return;
          }
          
          list.innerHTML = data.requests.map(r => \`
            <div class="border rounded-lg p-4 hover:shadow-md transition">
              <div class="flex justify-between items-start">
                <div>
                  <h3 class="font-bold">\${r.first_name} \${r.last_name}</h3>
                  <p class="text-sm text-gray-600"><i class="fas fa-phone mr-1"></i>\${r.phone}</p>
                  \${r.email ? '<p class="text-sm text-gray-600"><i class="fas fa-envelope mr-1"></i>' + r.email + '</p>' : ''}
                  <p class="text-sm text-gray-600 mt-2">Preferred: \${r.preferred_time}</p>
                  \${r.message ? '<p class="text-sm mt-2">' + r.message + '</p>' : ''}
                </div>
                <span class="px-3 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">\${r.status}</span>
              </div>
              <p class="text-xs text-gray-400 mt-2">\${new Date(r.created_at).toLocaleString()}</p>
            </div>
          \`).join('');
        } catch (error) {
          console.error('Load callbacks error:', error);
        }
      }

      async function loadRooms() {
        try {
          console.log('🔄 Loading rooms...');
          const response = await fetch('/api/admin/rooms?property_id=1');
          console.log('📡 Response status:', response.status);
          const rooms = await response.json();
          console.log('📦 Rooms received:', rooms.length, rooms);
          const list = document.getElementById('roomsList');
          console.log('📍 List element:', list);
          
          if (!list) {
            console.error('❌ roomsList element not found!');
            return;
          }
          
          if (!rooms || rooms.length === 0) {
            list.innerHTML = '<p class="text-gray-500 p-4">No rooms found. Add rooms below.</p>';
            return;
          }
          
          list.innerHTML = rooms.map(r => '<div class="border rounded-lg p-4 flex justify-between items-center hover:shadow-md transition"><div><span class="font-bold text-lg">Room ' + r.room_number + '</span><span class="text-gray-600 ml-3">' + r.room_type + '</span></div><div class="flex gap-2"><a href="/hotel/paradise-resort" target="_blank" class="bg-blue-100 text-blue-700 px-4 py-2 rounded hover:bg-blue-200"><i class="fas fa-external-link-alt mr-2"></i>Test QR</a><button onclick="regenerateQR(' + r.room_id + ')" class="bg-yellow-100 text-yellow-700 px-4 py-2 rounded hover:bg-yellow-200"><i class="fas fa-sync mr-2"></i>Regenerate QR</button></div></div>').join('');
        } catch (error) {
          console.error('Load rooms error:', error);
        }
      }

      async function loadVendors() {
        try {
          const response = await fetch('/api/admin/vendors?property_id=1');
          const vendors = await response.json();
          const list = document.getElementById('vendorsList');
          
          list.innerHTML = vendors.map(v => '<div class="border rounded-lg p-4 flex justify-between items-center hover:shadow-md transition"><div><div class="font-bold text-lg">' + v.business_name + '</div><div class="text-sm text-gray-600">' + v.email + ' • ' + v.phone + '</div></div><div class="flex gap-2"><span class="px-3 py-1 rounded-full text-sm ' + (v.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800') + '">' + v.status + '</span><button onclick="removeVendor(' + v.vendor_id + ')" class="bg-red-100 text-red-700 px-4 py-2 rounded hover:bg-red-200"><i class="fas fa-trash mr-2"></i>Remove</button></div></div>').join('');
        } catch (error) {
          console.error('Load vendors error:', error);
        }
      }

      async function loadActivities() {
        try {
          const response = await fetch('/api/admin/activities?property_id=1');
          const activities = await response.json();
          const list = document.getElementById('activitiesList');
          
          if (!activities || activities.length === 0) {
            list.innerHTML = '<p class="text-gray-500 text-center py-4">No activities yet. Add vendors to start!</p>';
            return;
          }
          
          list.innerHTML = activities.map(a => \`
            <div class="border rounded-lg p-4 hover:shadow-md transition">
              <div class="flex justify-between items-start">
                <div>
                  <h3 class="text-lg font-bold">\${a.title_en}</h3>
                  <p class="text-sm text-gray-600">by \${a.business_name} • \${a.category_name}</p>
                  <div class="flex gap-4 mt-2 text-sm text-gray-600">
                    <span><i class="fas fa-tag mr-1"></i>USD \${a.price}</span>
                    <span><i class="far fa-clock mr-1"></i>\${a.duration_minutes} min</span>
                    <span><i class="fas fa-users mr-1"></i>Capacity: \${a.capacity_per_slot}</span>
                  </div>
                </div>
                <div class="flex flex-col gap-2 items-end">
                  <span class="px-3 py-1 rounded-full text-sm \${a.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}">\${a.status}</span>
                  <button onclick="deactivateActivity(\${a.activity_id})" class="text-red-600 hover:text-red-800 text-sm">
                    <i class="fas fa-ban mr-1"></i>Deactivate
                  </button>
                </div>
              </div>
            </div>
          \`).join('');
        } catch (error) {
          console.error('Load activities error:', error);
        }
      }

      async function deactivateActivity(activityId) {
        if (!confirm('Deactivate this activity? It will no longer be visible to guests.')) return;
        try {
          const response = await fetch('/api/admin/activities/' + activityId, {
            method: 'DELETE'
          });
          const data = await response.json();
          if (data.success) {
            alert('Activity deactivated!');
            loadActivities();
          }
        } catch (error) {
          console.error('Deactivate activity error:', error);
          alert('Failed to deactivate activity');
        }
      }

      // Hotel Offerings Management
      let allOfferings = [];
      let currentOfferingFilter = 'all';
      
      async function loadOfferings() {
        try {
          const response = await fetch('/api/hotel-offerings/1');
          const data = await response.json();
          allOfferings = data.offerings || [];
          displayOfferings();
        } catch (error) {
          console.error('Load offerings error:', error);
        }
      }
      
      function displayOfferings() {
        const filteredOfferings = currentOfferingFilter === 'all' 
          ? allOfferings 
          : allOfferings.filter(o => o.offering_type === currentOfferingFilter);
        
        const list = document.getElementById('offeringsList');
        if (filteredOfferings.length === 0) {
          list.innerHTML = '<p class="text-gray-500">No offerings found</p>';
          return;
        }
        
        list.innerHTML = filteredOfferings.map(o => {
          const typeColors = {
            restaurant: 'bg-blue-100 text-blue-700',
            event: 'bg-purple-100 text-purple-700',
            spa: 'bg-green-100 text-green-700',
            service: 'bg-gray-100 text-gray-700'
          };
          
          return \`
            <div class="border rounded-lg p-4 hover:shadow-md">
              <div class="flex justify-between items-start mb-2">
                <div>
                  <h3 class="font-bold text-lg">\${o.title}</h3>
                  <span class="inline-block px-2 py-1 rounded text-xs \${typeColors[o.offering_type] || typeColors.service}">
                    \${o.offering_type.toUpperCase()}
                  </span>
                </div>
                <div class="flex gap-2">
                  \${o.offering_type === 'restaurant' ? \`<a href="/admin/restaurant/\${o.offering_id}" class="text-green-600 hover:text-green-800" title="Manage Tables"><i class="fas fa-chair"></i></a>\` : ''}
                  <button onclick="editOffering(\${o.offering_id})" class="text-blue-600 hover:text-blue-800">
                    <i class="fas fa-edit"></i>
                  </button>
                  <button onclick="deleteOffering(\${o.offering_id})" class="text-red-600 hover:text-red-800">
                    <i class="fas fa-trash"></i>
                  </button>
                </div>
              </div>
              <p class="text-sm text-gray-600 mb-2">\${o.short_description}</p>
              <div class="flex flex-wrap gap-3 text-sm text-gray-700">
                <span><i class="fas fa-dollar-sign mr-1"></i>\${o.currency} \${o.price || 'Free'}</span>
                <span><i class="fas fa-map-marker-alt mr-1"></i>\${o.location || 'N/A'}</span>
                \${o.duration_minutes ? \`<span><i class="fas fa-clock mr-1"></i>\${o.duration_minutes} min</span>\` : ''}
                \${o.event_date ? \`<span><i class="fas fa-calendar mr-1"></i>\${o.event_date}</span>\` : ''}
              </div>
            </div>
          \`;
        }).join('');
      }
      
      function filterOfferings(type) {
        currentOfferingFilter = type;
        document.querySelectorAll('.offering-filter-btn').forEach(btn => {
          if (btn.dataset.type === type) {
            btn.className = 'offering-filter-btn px-4 py-2 rounded bg-blue-500 text-white';
          } else {
            btn.className = 'offering-filter-btn px-4 py-2 rounded bg-gray-200';
          }
        });
        displayOfferings();
      }
      
      async function deleteOffering(offeringId) {
        if (!confirm('Delete this offering?')) return;
        try {
          const response = await fetch('/api/admin/offerings/' + offeringId, {
            method: 'DELETE'
          });
          const data = await response.json();
          if (data.success) {
            alert('Offering deleted!');
            loadOfferings();
          }
        } catch (error) {
          console.error('Delete offering error:', error);
          alert('Failed to delete offering');
        }
      }
      
      async function editOffering(offeringId) {
        const offering = allOfferings.find(o => o.offering_id === offeringId);
        if (!offering) return;
        
        // Populate form with existing data
        document.getElementById('offeringType').value = offering.offering_type;
        document.getElementById('offeringTitle').value = offering.title_en;
        document.getElementById('offeringDescription').value = offering.short_description_en;
        document.getElementById('offeringFullDescription').value = offering.full_description_en || '';
        document.getElementById('offeringPrice').value = offering.price || '';
        document.getElementById('offeringLocation').value = offering.location || '';
        document.getElementById('offeringDuration').value = offering.duration_minutes || '';
        document.getElementById('offeringImages').value = offering.images ? offering.images.join(', ') : '';
        document.getElementById('offeringRequiresBooking').checked = offering.requires_booking === 1;
        
        if (offering.offering_type === 'event') {
          document.getElementById('eventFields').classList.remove('hidden');
          document.getElementById('eventDate').value = offering.event_date || '';
          document.getElementById('eventStartTime').value = offering.event_start_time || '';
          document.getElementById('eventEndTime').value = offering.event_end_time || '';
        }
        
        // Change form submit to update instead of create
        const form = document.getElementById('addOfferingForm');
        form.onsubmit = async (e) => {
          e.preventDefault();
          const images = document.getElementById('offeringImages').value.split(',').map(url => url.trim()).filter(Boolean);
          
          try {
            const response = await fetch('/api/admin/offerings/' + offeringId, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                title_en: document.getElementById('offeringTitle').value,
                short_description_en: document.getElementById('offeringDescription').value,
                full_description_en: document.getElementById('offeringFullDescription').value,
                price: parseFloat(document.getElementById('offeringPrice').value) || 0,
                location: document.getElementById('offeringLocation').value,
                duration_minutes: parseInt(document.getElementById('offeringDuration').value) || null,
                requires_booking: document.getElementById('offeringRequiresBooking').checked ? 1 : 0,
                images: JSON.stringify(images),
                event_date: document.getElementById('eventDate').value || null,
                event_start_time: document.getElementById('eventStartTime').value || null,
                event_end_time: document.getElementById('eventEndTime').value || null
              })
            });
            
            const data = await response.json();
            if (data.success) {
              alert('Offering updated successfully!');
              form.reset();
              document.getElementById('eventFields').classList.add('hidden');
              // Reset form back to create mode
              form.onsubmit = null;
              loadOfferings();
            }
          } catch (error) {
            console.error('Update offering error:', error);
            alert('Failed to update offering');
          }
        };
        
        // Scroll to form
        form.scrollIntoView({ behavior: 'smooth' });
      }


      // Show/hide event-specific fields based on offering type
      document.getElementById('offeringType').addEventListener('change', (e) => {
        const eventFields = document.getElementById('eventFields');
        if (e.target.value === 'event') {
          eventFields.classList.remove('hidden');
        } else {
          eventFields.classList.add('hidden');
        }
      });

      document.getElementById('addRoomForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          const response = await fetch('/api/admin/rooms', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              property_id: 1,
              room_number: document.getElementById('roomNumber').value,
              room_type: document.getElementById('roomType').value
            })
          });
          const data = await response.json();
          if (data.success) {
            alert('Room created with QR code!');
            document.getElementById('addRoomForm').reset();
            loadRooms();
          }
        } catch (error) {
          console.error('Add room error:', error);
          alert('Failed to create room');
        }
      });

      document.getElementById('addOfferingForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          const images = document.getElementById('offeringImages').value.split(',').map(url => url.trim()).filter(Boolean);
          
          const response = await fetch('/api/admin/offerings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              property_id: 1,
              offering_type: document.getElementById('offeringType').value,
              title_en: document.getElementById('offeringTitle').value,
              short_description_en: document.getElementById('offeringDescription').value,
              full_description_en: document.getElementById('offeringFullDescription').value,
              price: parseFloat(document.getElementById('offeringPrice').value) || 0,
              location: document.getElementById('offeringLocation').value,
              duration_minutes: parseInt(document.getElementById('offeringDuration').value) || null,
              requires_booking: document.getElementById('offeringRequiresBooking').checked ? 1 : 0,
              images: JSON.stringify(images),
              event_date: document.getElementById('eventDate').value || null,
              event_start_time: document.getElementById('eventStartTime').value || null,
              event_end_time: document.getElementById('eventEndTime').value || null
            })
          });
          
          const data = await response.json();
          if (data.success) {
            alert('Hotel offering added successfully!');
            document.getElementById('addOfferingForm').reset();
            document.getElementById('eventFields').classList.add('hidden');
            loadOfferings();
          }
        } catch (error) {
          console.error('Add offering error:', error);
          alert('Failed to add offering');
        }
      });

      document.getElementById('addVendorForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          const response = await fetch('/api/admin/vendors', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              property_id: 1,
              business_name: document.getElementById('businessName').value,
              email: document.getElementById('vendorEmail').value,
              phone: document.getElementById('vendorPhone').value,
              password: document.getElementById('vendorPassword').value
            })
          });
          const data = await response.json();
          if (data.success) {
            alert('Vendor added successfully!');
            document.getElementById('addVendorForm').reset();
            loadVendors();
          }
        } catch (error) {
          console.error('Add vendor error:', error);
          alert('Failed to add vendor');
        }
      });

      async function regenerateQR(roomId) {
        if (!confirm('Regenerate QR code for this room?')) return;
        try {
          const response = await fetch('/api/admin/rooms/' + roomId + '/regenerate-qr', { method: 'POST' });
          const data = await response.json();
          if (data.success) {
            alert('QR code regenerated!');
            loadRooms();
          }
        } catch (error) {
          console.error('Regenerate QR error:', error);
        }
      }

      async function removeVendor(vendorId) {
        if (!confirm('Remove this vendor? This will deactivate all their activities.')) return;
        try {
          const response = await fetch('/api/admin/vendors/' + vendorId, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ property_id: 1 })
          });
          const data = await response.json();
          if (data.success) {
            alert('Vendor removed successfully');
            loadVendors();
          }
        } catch (error) {
          console.error('Remove vendor error:', error);
          alert('Failed to remove vendor');
        }
      }

      async function loadSettings() {
        try {
          const response = await fetch('/api/admin/property-settings?property_id=1');
          const settings = await response.json();
          
          // Set homepage URL
          const homepageUrl = window.location.origin + '/hotel/' + settings.slug;
          document.getElementById('homepageUrl').value = homepageUrl;
          document.getElementById('visitHomepage').href = homepageUrl;
          
          // Load current settings
          document.getElementById('hotelName').value = settings.name || '';
          document.getElementById('hotelTagline').value = settings.tagline || '';
          document.getElementById('hotelEmail').value = settings.contact_email || '';
          document.getElementById('hotelPhone').value = settings.contact_phone || '';
          document.getElementById('hotelAddress').value = settings.address || '';
          
          document.getElementById('brandLogoUrl').value = settings.brand_logo_url || '';
          document.getElementById('heroImageUrl').value = settings.hero_image_url || '';
          document.getElementById('heroOverlayOpacity').value = settings.hero_overlay_opacity || 30;
          document.getElementById('heroOverlayValue').textContent = (settings.hero_overlay_opacity || 30) + '%';
          
          // Set hero image effect radio
          const effectRadios = document.querySelectorAll('input[name="heroImageEffect"]');
          effectRadios.forEach(radio => {
            if (radio.value === (settings.hero_image_effect || 'none')) {
              radio.checked = true;
            }
          });
          
          // Hero overlay opacity slider
          document.getElementById('heroOverlayOpacity').addEventListener('input', (e) => {
            document.getElementById('heroOverlayValue').textContent = e.target.value + '%';
          });
          
          document.getElementById('primaryColor').value = settings.primary_color || '#3B82F6';
          document.getElementById('primaryColorText').value = settings.primary_color || '#3B82F6';
          document.getElementById('secondaryColor').value = settings.secondary_color || '#10B981';
          document.getElementById('secondaryColorText').value = settings.secondary_color || '#10B981';
          document.getElementById('accentColor').value = settings.accent_color || '#F59E0B';
          document.getElementById('accentColorText').value = settings.accent_color || '#F59E0B';
          
          document.getElementById('fontFamily').value = settings.font_family || 'inter';
          document.getElementById('buttonStyle').value = settings.button_style || 'rounded';
          document.getElementById('cardStyle').value = settings.card_style || 'shadow';
          document.getElementById('headerStyle').value = settings.header_style || 'transparent';
          
          // Set layout style radio
          const layoutRadios = document.querySelectorAll('input[name="layoutStyle"]');
          layoutRadios.forEach(radio => {
            if (radio.value === (settings.layout_style || 'modern')) {
              radio.checked = true;
            }
          });
          
          // Sync color pickers with text inputs
          document.getElementById('primaryColor').addEventListener('input', (e) => {
            document.getElementById('primaryColorText').value = e.target.value;
          });
          document.getElementById('primaryColorText').addEventListener('input', (e) => {
            document.getElementById('primaryColor').value = e.target.value;
          });
          
          document.getElementById('secondaryColor').addEventListener('input', (e) => {
            document.getElementById('secondaryColorText').value = e.target.value;
          });
          document.getElementById('secondaryColorText').addEventListener('input', (e) => {
            document.getElementById('secondaryColor').value = e.target.value;
          });
          
          document.getElementById('accentColor').addEventListener('input', (e) => {
            document.getElementById('accentColorText').value = e.target.value;
            updateGradientPreview();
          });
          document.getElementById('accentColorText').addEventListener('input', (e) => {
            document.getElementById('accentColor').value = e.target.value;
            updateGradientPreview();
          });
          
          // Gradient checkbox
          document.getElementById('primaryGradient').checked = settings.use_gradient === 1;
          if (settings.use_gradient === 1) {
            document.getElementById('primaryGradientPreview').classList.remove('hidden');
          }
          
          document.getElementById('primaryGradient').addEventListener('change', (e) => {
            if (e.target.checked) {
              document.getElementById('primaryGradientPreview').classList.remove('hidden');
              updateGradientPreview();
            } else {
              document.getElementById('primaryGradientPreview').classList.add('hidden');
            }
          });
          
          updateGradientPreview();
          
          // Load homepage layout settings
          document.getElementById('hotelMapUrl').value = settings.hotel_map_url || '';
          document.getElementById('showHotelMap').checked = settings.show_hotel_map === 1;
          document.getElementById('showRestaurants').checked = settings.show_restaurants === 1;
          document.getElementById('showEvents').checked = settings.show_events === 1;
          document.getElementById('showSpa').checked = settings.show_spa === 1;
          document.getElementById('showService').checked = settings.show_service === 1;
          document.getElementById('showActivities').checked = settings.show_activities === 1;
          
          // Load section order
          const sectionOrder = settings.homepage_section_order ? 
            JSON.parse(settings.homepage_section_order) : 
            ['restaurants', 'events', 'spa', 'service', 'activities'];
          renderSectionOrder(sectionOrder);
          
        } catch (error) {
          console.error('Load settings error:', error);
          alert('Failed to load settings');
        }
      }
      
      function renderSectionOrder(order) {
        const sectionNames = {
          'restaurants': '🍽️ Restaurants',
          'events': '🎉 Events',
          'spa': '💆 Spa & Wellness',
          'service': '🛎️ Hotel Services',
          'activities': '🏃 Activities & Experiences'
        };
        
        const list = document.getElementById('sectionOrderList');
        list.innerHTML = '';
        
        order.forEach((section, index) => {
          const item = document.createElement('div');
          item.className = 'flex items-center gap-3 bg-white p-3 rounded-lg border border-gray-300 cursor-move hover:border-purple-400 transition';
          item.draggable = true;
          item.dataset.section = section;
          
          item.innerHTML = '<i class="fas fa-grip-vertical text-gray-400"></i>' +
                          '<span class="flex-1 font-medium">' + (index + 1) + '. ' + sectionNames[section] + '</span>' +
                          '<i class="fas fa-arrows-alt-v text-gray-400"></i>';
          
          // Drag events
          item.addEventListener('dragstart', handleDragStart);
          item.addEventListener('dragover', handleDragOver);
          item.addEventListener('drop', handleDrop);
          item.addEventListener('dragend', handleDragEnd);
          
          list.appendChild(item);
        });
      }
      
      let draggedElement = null;
      
      function handleDragStart(e) {
        draggedElement = this;
        this.style.opacity = '0.5';
      }
      
      function handleDragOver(e) {
        e.preventDefault();
        return false;
      }
      
      function handleDrop(e) {
        e.preventDefault();
        if (draggedElement !== this) {
          const allItems = Array.from(document.getElementById('sectionOrderList').children);
          const draggedIndex = allItems.indexOf(draggedElement);
          const targetIndex = allItems.indexOf(this);
          
          if (draggedIndex < targetIndex) {
            this.parentNode.insertBefore(draggedElement, this.nextSibling);
          } else {
            this.parentNode.insertBefore(draggedElement, this);
          }
          
          updateSectionNumbers();
        }
        return false;
      }
      
      function handleDragEnd() {
        this.style.opacity = '1';
        draggedElement = null;
      }
      
      function updateSectionNumbers() {
        const items = document.getElementById('sectionOrderList').children;
        Array.from(items).forEach((item, index) => {
          const span = item.querySelector('span');
          const text = span.textContent;
          span.textContent = (index + 1) + text.substring(text.indexOf('.'));
        });
      }
      
      function getSectionOrder() {
        const items = document.getElementById('sectionOrderList').children;
        return Array.from(items).map(item => item.dataset.section);
      }
      
      function updateGradientPreview() {
        const primary = document.getElementById('primaryColorText').value || '#3B82F6';
        const secondary = document.getElementById('secondaryColorText').value || '#10B981';
        const preview = document.getElementById('primaryGradientPreview');
        preview.style.background = 'linear-gradient(135deg, ' + primary + ', ' + secondary + ')';
      }
      
      function copyHomepageUrl() {
        const input = document.getElementById('homepageUrl');
        input.select();
        document.execCommand('copy');
        alert('Homepage URL copied to clipboard!');
      }
      
      function previewDesign() {
        const homepageUrl = document.getElementById('visitHomepage').href;
        window.open(homepageUrl, '_blank');
      }
      
      document.getElementById('settingsForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const layoutStyle = document.querySelector('input[name="layoutStyle"]:checked').value;
        const heroEffect = document.querySelector('input[name="heroImageEffect"]:checked').value;
        
        const settings = {
          property_id: 1,
          name: document.getElementById('hotelName').value,
          tagline: document.getElementById('hotelTagline').value,
          contact_email: document.getElementById('hotelEmail').value,
          contact_phone: document.getElementById('hotelPhone').value,
          address: document.getElementById('hotelAddress').value,
          brand_logo_url: document.getElementById('brandLogoUrl').value,
          hero_image_url: document.getElementById('heroImageUrl').value,
          hero_image_effect: heroEffect,
          hero_overlay_opacity: parseInt(document.getElementById('heroOverlayOpacity').value),
          primary_color: document.getElementById('primaryColorText').value,
          secondary_color: document.getElementById('secondaryColorText').value,
          accent_color: document.getElementById('accentColorText').value,
          layout_style: layoutStyle,
          font_family: document.getElementById('fontFamily').value,
          button_style: document.getElementById('buttonStyle').value,
          card_style: document.getElementById('cardStyle').value,
          header_style: document.getElementById('headerStyle').value,
          use_gradient: document.getElementById('primaryGradient').checked ? 1 : 0,
          hotel_map_url: document.getElementById('hotelMapUrl').value,
          show_hotel_map: document.getElementById('showHotelMap').checked ? 1 : 0,
          show_restaurants: document.getElementById('showRestaurants').checked ? 1 : 0,
          show_events: document.getElementById('showEvents').checked ? 1 : 0,
          show_spa: document.getElementById('showSpa').checked ? 1 : 0,
          show_service: document.getElementById('showService').checked ? 1 : 0,
          show_activities: document.getElementById('showActivities').checked ? 1 : 0,
          homepage_section_order: JSON.stringify(getSectionOrder())
        };
        
        try {
          const response = await fetch('/api/admin/property-settings', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settings)
          });
          
          if (response.ok) {
            alert('Design settings saved successfully! Visit your homepage to see the changes.');
          } else {
            alert('Failed to save settings');
          }
        } catch (error) {
          console.error('Save settings error:', error);
          alert('Failed to save settings');
        }
      });

      function logout() {
        localStorage.removeItem('admin_user');
        localStorage.removeItem('admin_token');
        window.location.href = '/admin/login';
      }

      loadRooms();
    </script>
</body>
</html>
  `)
})

// ============================================
// DEFAULT ROUTE - Guest Landing Page
// ============================================

// Property-specific homepage
app.get('/:property_slug?', async (c) => {
  const { DB } = c.env
  const property_slug = c.req.param('property_slug') || 'paradise-resort'
  
  try {
    const property = await DB.prepare(`
      SELECT * FROM properties WHERE slug = ? AND status = 'active'
    `).bind(property_slug).first()
    
    if (!property) {
      return c.html('<html><body><h1>Property not found</h1><p>Please check the URL or visit <a href="/">homepage</a></p></body></html>', 404)
    }
    
    const primaryColor = property.primary_color || '#0EA5E9'
    const secondaryColor = property.secondary_color || '#10B981'
    
    return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${property.name} - Activity Booking</title>
        <meta name="description" content="Book amazing resort activities instantly">
        <link rel="manifest" href="/static/manifest.json">
        <meta name="theme-color" content="${primaryColor}">
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <style>
          body { font-family: 'Inter', system-ui, sans-serif; }
          .gradient-bg { background: linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%); }
        </style>
    </head>
    <body class="bg-gray-50">
        <div class="min-h-screen">
            <!-- Hero Section -->
            <div class="gradient-bg text-white py-20 px-4">
                <div class="max-w-4xl mx-auto text-center">
                    <i class="fas fa-umbrella-beach text-6xl mb-6"></i>
                    <h1 class="text-5xl font-bold mb-4">${property.name}</h1>
                    <p class="text-xl mb-8">Discover & Book Amazing Activities</p>
                    <div class="bg-white/20 backdrop-blur-sm rounded-lg p-6 max-w-md mx-auto">
                        <i class="fas fa-qrcode text-4xl mb-4"></i>
                        <p class="text-lg mb-2">Scan the QR code in your room</p>
                        <div class="mt-4 space-y-2">
                            <a href="/browse?property=${property.property_id}" class="block bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100">Browse All Activities</a>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Features Section -->
            <div class="max-w-6xl mx-auto py-16 px-4">
                <div class="grid md:grid-cols-3 gap-8">
                    <div class="text-center p-6">
                        <div class="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                            <i class="fas fa-water text-blue-600 text-2xl"></i>
                        </div>
                        <h3 class="text-xl font-bold mb-2">Water Sports</h3>
                        <p class="text-gray-600">Diving, snorkeling, and more aquatic adventures</p>
                    </div>
                    <div class="text-center p-6">
                        <div class="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                            <i class="fas fa-spa text-green-600 text-2xl"></i>
                        </div>
                        <h3 class="text-xl font-bold mb-2">Spa & Wellness</h3>
                        <p class="text-gray-600">Relax with massages and beauty treatments</p>
                    </div>
                    <div class="text-center p-6">
                        <div class="bg-yellow-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                            <i class="fas fa-binoculars text-yellow-600 text-2xl"></i>
                        </div>
                        <h3 class="text-xl font-bold mb-2">Desert Safari</h3>
                        <p class="text-gray-600">Explore the desert with thrilling adventures</p>
                    </div>
                </div>
            </div>

            <!-- How It Works -->
            <div class="bg-white py-16 px-4">
                <div class="max-w-4xl mx-auto">
                    <h2 class="text-3xl font-bold text-center mb-12">How It Works</h2>
                    <div class="space-y-8">
                        <div class="flex items-start gap-4">
                            <div class="bg-blue-500 text-white w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-bold">1</div>
                            <div>
                                <h3 class="text-xl font-bold mb-2">Scan QR Code</h3>
                                <p class="text-gray-600">Use your phone camera to scan the QR code in your room</p>
                            </div>
                        </div>
                        <div class="flex items-start gap-4">
                            <div class="bg-blue-500 text-white w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-bold">2</div>
                            <div>
                                <h3 class="text-xl font-bold mb-2">Browse Activities</h3>
                                <p class="text-gray-600">Explore diving, spa, safari, and dining options</p>
                            </div>
                        </div>
                        <div class="flex items-start gap-4">
                            <div class="bg-blue-500 text-white w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-bold">3</div>
                            <div>
                                <h3 class="text-xl font-bold mb-2">Book Instantly</h3>
                                <p class="text-gray-600">Choose date & time, pay online or at venue, get instant confirmation</p>
                            </div>
                        </div>
                        <div class="flex items-start gap-4">
                            <div class="bg-blue-500 text-white w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-bold">4</div>
                            <div>
                                <h3 class="text-xl font-bold mb-2">Enjoy!</h3>
                                <p class="text-gray-600">Show your confirmation and have an amazing experience</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Footer -->
            <footer class="bg-gray-800 text-white py-8 px-4">
                <div class="max-w-4xl mx-auto text-center">
                    <p class="mb-3">© 2025 ${property.name}. All rights reserved.</p>
                    <div class="mb-3 flex justify-center gap-4">
                        <a href="/vendor/login" class="text-sm text-blue-400 hover:text-blue-300"><i class="fas fa-store mr-1"></i>Vendor Login</a>
                        <a href="/admin/login" class="text-sm text-blue-400 hover:text-blue-300"><i class="fas fa-shield-alt mr-1"></i>Admin Login</a>
                    </div>
                    <p class="text-sm text-gray-400">
                        <a href="#" class="hover:text-white">Privacy Policy</a> | 
                        <a href="#" class="hover:text-white">Terms of Service</a> | 
                        <a href="mailto:info@paradiseresort.com" class="hover:text-white">Contact Us</a>
                    </p>
                </div>
            </footer>
        </div>
    </body>
    </html>
  `)
  } catch (error) {
    console.error('Homepage error:', error)
    return c.html('<html><body><h1>Error</h1><p>Failed to load homepage</p></body></html>', 500)
  }
})

// Restaurant Table Management Page
app.get('/admin/restaurant/:offering_id', (c) => {
  const { offering_id } = c.req.param()
  
  return c.html(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Restaurant Table Management</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    <style>
      .table-item {
        position: absolute;
        cursor: move;
        border: 2px solid #3B82F6;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        background: white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        user-select: none;
      }
      .table-item:hover { box-shadow: 0 4px 8px rgba(0,0,0,0.2); }
      .table-item.selected { border-color: #10B981; border-width: 3px; }
      .table-rectangle { border-radius: 8px; }
      .table-circle { border-radius: 50%; }
      .table-square { border-radius: 8px; }
      #canvas { position: relative; background: #F3F4F6; border: 2px dashed #9CA3AF; }
    </style>
</head>
<body class="bg-gray-50">
    <div class="bg-gradient-to-r from-blue-700 to-indigo-700 text-white py-4 px-4 shadow-lg">
        <div class="max-w-7xl mx-auto flex justify-between items-center">
            <div class="flex items-center gap-4">
                <a href="/admin/dashboard" class="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg">
                    <i class="fas fa-arrow-left mr-2"></i>Back to Dashboard
                </a>
                <h1 class="text-2xl font-bold">Restaurant Table Management</h1>
            </div>
            <span id="restaurantName" class="text-lg"></span>
        </div>
    </div>

    <div class="max-w-7xl mx-auto px-4 py-8">
        <div class="grid md:grid-cols-3 gap-6">
            <!-- Left Panel: Table Controls -->
            <div class="space-y-6">
                <!-- Add Table Form -->
                <div class="bg-white rounded-lg shadow-lg p-6">
                    <h2 class="text-xl font-bold mb-4"><i class="fas fa-plus-circle mr-2 text-blue-600"></i>Add Table</h2>
                    <form id="addTableForm" class="space-y-3">
                        <input type="text" id="tableNumber" placeholder="Table Number (e.g., T1)" required class="w-full px-3 py-2 border rounded-lg text-sm">
                        <input type="text" id="tableName" placeholder="Table Name (optional)" class="w-full px-3 py-2 border rounded-lg text-sm">
                        <input type="number" id="capacity" placeholder="Capacity" required min="1" max="12" class="w-full px-3 py-2 border rounded-lg text-sm">
                        
                        <select id="shape" class="w-full px-3 py-2 border rounded-lg text-sm">
                            <option value="rectangle">Rectangle</option>
                            <option value="circle">Circle</option>
                            <option value="square">Square</option>
                        </select>
                        
                        <select id="tableType" class="w-full px-3 py-2 border rounded-lg text-sm">
                            <option value="standard">Standard</option>
                            <option value="booth">Booth</option>
                            <option value="bar">Bar/High-Top</option>
                            <option value="outdoor">Outdoor</option>
                            <option value="vip">VIP</option>
                        </select>
                        
                        <div class="border rounded-lg p-2 max-h-32 overflow-y-auto">
                            <p class="text-xs font-semibold mb-2">Features:</p>
                            <label class="flex items-center text-sm mb-1"><input type="checkbox" name="features" value="window_view" class="mr-2">Window View</label>
                            <label class="flex items-center text-sm mb-1"><input type="checkbox" name="features" value="beachfront" class="mr-2">Beachfront</label>
                            <label class="flex items-center text-sm mb-1"><input type="checkbox" name="features" value="sunset_view" class="mr-2">Sunset View</label>
                            <label class="flex items-center text-sm mb-1"><input type="checkbox" name="features" value="quiet" class="mr-2">Quiet Section</label>
                            <label class="flex items-center text-sm mb-1"><input type="checkbox" name="features" value="couples" class="mr-2">Couples</label>
                            <label class="flex items-center text-sm mb-1"><input type="checkbox" name="features" value="family_friendly" class="mr-2">Family Friendly</label>
                        </div>
                        
                        <button type="submit" class="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">
                            <i class="fas fa-plus mr-2"></i>Add to Floor Plan
                        </button>
                    </form>
                </div>

                <!-- Selected Table Info -->
                <div id="selectedTableInfo" class="bg-white rounded-lg shadow-lg p-6 hidden">
                    <h2 class="text-xl font-bold mb-4"><i class="fas fa-info-circle mr-2 text-green-600"></i>Selected Table</h2>
                    <div id="tableDetails"></div>
                    <div class="flex gap-2 mt-4">
                        <button onclick="deleteSelectedTable()" class="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700">
                            <i class="fas fa-trash mr-2"></i>Delete
                        </button>
                    </div>
                </div>

                <!-- Tables List -->
                <div class="bg-white rounded-lg shadow-lg p-6">
                    <h2 class="text-xl font-bold mb-4">All Tables (<span id="tableCount">0</span>)</h2>
                    <div id="tablesList" class="space-y-2 max-h-64 overflow-y-auto"></div>
                </div>
            </div>

            <!-- Center: Floor Plan Canvas -->
            <div class="md:col-span-2">
                <div class="bg-white rounded-lg shadow-lg p-6">
                    <div class="flex justify-between items-center mb-4">
                        <h2 class="text-xl font-bold"><i class="fas fa-th mr-2 text-purple-600"></i>Floor Plan Designer</h2>
                        <div class="flex gap-2">
                            <button onclick="saveLayout()" class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                                <i class="fas fa-save mr-2"></i>Save Layout
                            </button>
                            <button onclick="clearCanvas()" class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">
                                <i class="fas fa-eraser mr-2"></i>Clear
                            </button>
                        </div>
                    </div>
                    
                    <div id="canvas" style="width: 100%; height: 600px; overflow: auto;"></div>
                    
                    <div class="mt-4 flex items-center justify-between text-sm text-gray-600">
                        <span><i class="fas fa-chair mr-2"></i>Drag tables to position them</span>
                        <span>Total Capacity: <strong id="totalCapacity">0</strong> seats</span>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script>
      const offeringId = '${offering_id}';
      let tables = [];
      let selectedTable = null;
      let isDragging = false;
      let dragOffset = { x: 0, y: 0 };

      async function init() {
        await loadRestaurant();
        await loadTables();
      }

      async function loadRestaurant() {
        try {
          const response = await fetch('/api/hotel-offerings/1');
          const data = await response.json();
          const restaurant = data.offerings.find(o => o.offering_id == offeringId);
          if (restaurant) {
            document.getElementById('restaurantName').textContent = restaurant.title;
            document.title = \`\${restaurant.title} - Table Management\`;
          }
        } catch (error) {
          console.error('Load restaurant error:', error);
        }
      }

      async function loadTables() {
        try {
          const response = await fetch('/api/restaurant/' + offeringId + '/tables');
          const data = await response.json();
          tables = data.tables || [];
          renderTables();
          updateTablesList();
        } catch (error) {
          console.error('Load tables error:', error);
        }
      }

      function renderTables() {
        const canvas = document.getElementById('canvas');
        canvas.innerHTML = '';
        
        let totalCap = 0;
        
        tables.forEach(table => {
          totalCap += table.capacity;
          const div = document.createElement('div');
          div.className = \`table-item table-\${table.shape}\`;
          div.id = \`table-\${table.table_id}\`;
          div.style.left = table.position_x + 'px';
          div.style.top = table.position_y + 'px';
          div.style.width = table.width + 'px';
          div.style.height = table.height + 'px';
          div.innerHTML = \`<div class="text-center"><div class="text-sm">\${table.table_number}</div><div class="text-xs text-gray-600">\${table.capacity}p</div></div>\`;
          
          div.addEventListener('mousedown', (e) => startDrag(e, table));
          div.addEventListener('click', (e) => {
            e.stopPropagation();
            selectTable(table);
          });
          
          canvas.appendChild(div);
        });
        
        document.getElementById('tableCount').textContent = tables.length;
        document.getElementById('totalCapacity').textContent = totalCap;
      }

      function startDrag(e, table) {
        e.preventDefault();
        isDragging = true;
        selectedTable = table;
        const div = document.getElementById(\`table-\${table.table_id}\`);
        const rect = div.getBoundingClientRect();
        dragOffset.x = e.clientX - rect.left;
        dragOffset.y = e.clientY - rect.top;
        
        document.addEventListener('mousemove', onDrag);
        document.addEventListener('mouseup', stopDrag);
      }

      function onDrag(e) {
        if (!isDragging || !selectedTable) return;
        
        const canvas = document.getElementById('canvas');
        const canvasRect = canvas.getBoundingClientRect();
        const x = e.clientX - canvasRect.left - dragOffset.x;
        const y = e.clientY - canvasRect.top - dragOffset.y;
        
        selectedTable.position_x = Math.max(0, Math.min(x, canvasRect.width - selectedTable.width));
        selectedTable.position_y = Math.max(0, Math.min(y, canvasRect.height - selectedTable.height));
        
        const div = document.getElementById(\`table-\${selectedTable.table_id}\`);
        div.style.left = selectedTable.position_x + 'px';
        div.style.top = selectedTable.position_y + 'px';
      }

      function stopDrag() {
        if (isDragging && selectedTable) {
          updateTablePosition(selectedTable);
        }
        isDragging = false;
        document.removeEventListener('mousemove', onDrag);
        document.removeEventListener('mouseup', stopDrag);
      }

      async function updateTablePosition(table) {
        try {
          await fetch('/api/admin/restaurant/table/' + table.table_id, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(table)
          });
        } catch (error) {
          console.error('Update position error:', error);
        }
      }

      function selectTable(table) {
        document.querySelectorAll('.table-item').forEach(el => el.classList.remove('selected'));
        document.getElementById(\`table-\${table.table_id}\`).classList.add('selected');
        selectedTable = table;
        
        const infoPanel = document.getElementById('selectedTableInfo');
        const details = document.getElementById('tableDetails');
        
        details.innerHTML = \`
          <div class="space-y-2 text-sm">
            <div><strong>Number:</strong> \${table.table_number}</div>
            <div><strong>Name:</strong> \${table.table_name || 'N/A'}</div>
            <div><strong>Capacity:</strong> \${table.capacity} seats</div>
            <div><strong>Type:</strong> \${table.table_type}</div>
            <div><strong>Shape:</strong> \${table.shape}</div>
            <div><strong>Features:</strong> \${table.features.length > 0 ? table.features.join(', ') : 'None'}</div>
          </div>
        \`;
        
        infoPanel.classList.remove('hidden');
      }

      function updateTablesList() {
        const list = document.getElementById('tablesList');
        list.innerHTML = tables.map(t => \`
          <div class="flex items-center justify-between p-2 border rounded hover:bg-gray-50 cursor-pointer" onclick='selectTable(\${JSON.stringify(t)})'>
            <div>
              <div class="font-semibold text-sm">\${t.table_number}</div>
              <div class="text-xs text-gray-600">\${t.capacity} seats</div>
            </div>
            <span class="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">\${t.table_type}</span>
          </div>
        \`).join('');
      }

      document.getElementById('addTableForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const features = Array.from(document.querySelectorAll('input[name="features"]:checked')).map(cb => cb.value);
        
        try {
          const response = await fetch('/api/admin/restaurant/table', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              offering_id: offeringId,
              table_number: document.getElementById('tableNumber').value,
              table_name: document.getElementById('tableName').value || null,
              capacity: parseInt(document.getElementById('capacity').value),
              shape: document.getElementById('shape').value,
              table_type: document.getElementById('tableType').value,
              features: features,
              position_x: 50,
              position_y: 50,
              width: document.getElementById('shape').value === 'circle' ? 100 : 120,
              height: document.getElementById('shape').value === 'circle' ? 100 : 80
            })
          });
          
          const data = await response.json();
          if (data.success) {
            alert('Table added successfully!');
            document.getElementById('addTableForm').reset();
            await loadTables();
          }
        } catch (error) {
          console.error('Add table error:', error);
          alert('Failed to add table');
        }
      });

      async function deleteSelectedTable() {
        if (!selectedTable) return;
        if (!confirm(\`Delete table \${selectedTable.table_number}?\`)) return;
        
        try {
          const response = await fetch('/api/admin/restaurant/table/' + selectedTable.table_id, {
            method: 'DELETE'
          });
          
          const data = await response.json();
          if (data.success) {
            alert('Table deleted!');
            selectedTable = null;
            document.getElementById('selectedTableInfo').classList.add('hidden');
            await loadTables();
          }
        } catch (error) {
          console.error('Delete table error:', error);
          alert('Failed to delete table');
        }
      }

      function saveLayout() {
        alert('Layout auto-saves when you move tables!');
      }

      function clearCanvas() {
        if (!confirm('Delete all tables? This cannot be undone.')) return;
        // Implementation for bulk delete
        alert('Please delete tables individually for now');
      }

      init();
    </script>
</body>
</html>
  `)
})

export default app
