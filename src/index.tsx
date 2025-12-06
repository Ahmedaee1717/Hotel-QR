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

// Serve static files
app.use('/static/*', serveStatic({ root: './public' }))

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
        working_hours: vendor.working_hours ? JSON.parse(vendor.working_hours) : {}
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
  const property_id = c.req.header('X-Property-ID')

  try {
    const rooms = await DB.prepare(`
      SELECT * FROM rooms WHERE property_id = ?
      ORDER BY room_number
    `).bind(property_id).all()

    return c.json({ rooms: rooms.results })
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

  try {
    const vendors = await DB.prepare(`
      SELECT 
        v.*,
        c.name_en as category_name
      FROM vendors v
      LEFT JOIN categories c ON v.category_id = c.category_id
      ORDER BY v.created_at DESC
    `).all()

    return c.json({ vendors: vendors.results })
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

// ============================================
// DEFAULT ROUTE - Guest Landing Page
// ============================================

app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Paradise Resort - Activity Booking</title>
        <meta name="description" content="Book amazing resort activities instantly">
        <link rel="manifest" href="/static/manifest.json">
        <meta name="theme-color" content="#0EA5E9">
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <style>
          body { font-family: 'Inter', system-ui, sans-serif; }
          .gradient-bg { background: linear-gradient(135deg, #0EA5E9 0%, #10B981 100%); }
        </style>
    </head>
    <body class="bg-gray-50">
        <div class="min-h-screen">
            <!-- Hero Section -->
            <div class="gradient-bg text-white py-20 px-4">
                <div class="max-w-4xl mx-auto text-center">
                    <i class="fas fa-umbrella-beach text-6xl mb-6"></i>
                    <h1 class="text-5xl font-bold mb-4">Paradise Resort</h1>
                    <p class="text-xl mb-8">Discover & Book Amazing Activities</p>
                    <div class="bg-white/20 backdrop-blur-sm rounded-lg p-6 max-w-md mx-auto">
                        <i class="fas fa-qrcode text-4xl mb-4"></i>
                        <p class="text-lg mb-2">Scan the QR code in your room</p>
                        <p class="text-sm opacity-90">Or visit: yourresort.com/welcome</p>
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
                    <p class="mb-2">© 2025 Paradise Resort & Spa. All rights reserved.</p>
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
})

export default app
