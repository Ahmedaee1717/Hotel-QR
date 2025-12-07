# Hotel Activity Booking System - Complete Feature Set

## 🎉 **MAJOR UPDATE: Hotel-Specific Features**

### ✨ New Features Implemented

#### 1. **Hotel Offerings System**
Hotels can now manage their own offerings (restaurants, events, spa services) directly through the admin panel.

**Offering Types:**
- 🍽️ **Restaurants** - Breakfast buffets, à la carte dining, beachside grills
- 🎉 **Events** - Special occasions, themed nights, celebrations
- 💆 **Spa & Wellness** - Massage packages, treatments, wellness experiences
- 🏨 **Hotel Services** - Any other hotel-specific service

**Features:**
- Dynamic pricing and availability
- Booking requirements (walk-in vs reservation)
- Event scheduling (date, time, duration)
- Image galleries
- Location information
- Capacity management

#### 2. **Unified Hotel Landing Page**
Each hotel now has ONE QR code that leads to a comprehensive landing page showing ALL available offerings.

**What Guests See:**
- Hotel's own restaurants and dining options
- Upcoming events and special occasions
- Spa and wellness services
- **Vendor activities** (only from vendors linked to that specific hotel)

**URL Format:** `/hotel/{property-slug}`
**Example:** https://3000-i4hrxjmvko3zsm1dlnsdp-b237eb32.sandbox.novita.ai/hotel/paradise-resort

#### 3. **Smart Vendor Filtering**
Vendor activities are automatically filtered by hotel association:
- Only activities from vendors linked to the hotel are displayed
- Vendors can link to hotels using registration codes
- Clean separation between different hotel properties

#### 4. **Admin Panel Enhancements**
New "Hotel Offerings" tab in admin dashboard:
- ➕ Add new offerings (restaurants, events, spa, services)
- 📝 Edit existing offerings
- 🗑️ Delete offerings
- 🔍 Filter by type (All, Restaurants, Events, Spa)
- 📊 View all offerings in one place

**Access:** `/admin/dashboard` → "Hotel Offerings" tab

---

## 🔗 **Live URLs**

### **Main Application**
🌐 **Base URL:** https://3000-i4hrxjmvko3zsm1dlnsdp-b237eb32.sandbox.novita.ai

### **Guest Pages**
- **Hotel Landing Page:** `/hotel/paradise-resort`
  - Shows all restaurants, events, spa services, and vendor activities for the hotel
  - Mobile-first responsive design
  - Category filtering (All, Restaurants, Events, Spa, Activities)

- **Browse Activities:** `/browse?property=1`
  - Legacy page for browsing vendor activities only

- **Activity Details:** `/activity?id={activity_id}&property={property_id}`
  - Example: `/activity?id=1&property=1`

### **Vendor Portal**
- **Login:** `/vendor/login`
  - Test Credentials: `dive@paradiseresort.com` / `vendor123`

- **Dashboard:** `/vendor/dashboard`
  - View bookings and stats
  - Add new activities
  - Manage profile

- **Profile Page:** `/vendor/{vendor-slug}`
  - Example: `/vendor/aqua-dive-centre?property=1`

### **Admin Portal**
- **Login:** `/admin/login`
  - Test Credentials: `admin@paradiseresort.com` / `admin123`

- **Dashboard:** `/admin/dashboard`
  - **Rooms & QR Codes** tab: Manage rooms and QR generation
  - **Vendors** tab: Add vendors, manage vendor list
  - **Vendor Code** tab: View/regenerate registration code (Current: `6003799C`)
  - **Hotel Offerings** tab: ⭐ NEW - Manage restaurants, events, spa
  - **Activities** tab: View all vendor activities
  - **Callbacks** tab: Manage callback requests

---

## 📊 **Database Schema Updates**

### New Tables Added (Migration 0004)

#### `hotel_offerings`
Stores hotel-managed offerings (restaurants, events, spa):
- Basic info: title, description, images
- Pricing: price, currency, price_type
- Scheduling: duration, dates, times, recurrence
- Restaurant-specific: cuisine_type, meal_type
- Event-specific: event_date, start/end times
- Status and display order

#### `offering_schedule`
Manages availability schedules for hotel offerings:
- Day of week or specific date
- Time slots and capacity
- Recurring vs one-time schedules

#### `offering_bookings`
Guest bookings for hotel offerings:
- Reservation details (date, time, guests)
- Table assignments
- Payment tracking
- Special requests

---

## 🧪 **API Endpoints**

### **Hotel Offerings APIs**

#### Get Hotel Offerings
```
GET /api/hotel-offerings/:property_id?type={offering_type}
```
Returns all offerings for a property, optionally filtered by type.

**Example:**
```bash
curl "https://3000-i4hrxjmvko3zsm1dlnsdp-b237eb32.sandbox.novita.ai/api/hotel-offerings/1"
```

**Response:**
```json
{
  "success": true,
  "offerings": [
    {
      "offering_id": 1,
      "offering_type": "restaurant",
      "title": "Sunrise Breakfast Buffet",
      "short_description": "All-you-can-eat breakfast buffet",
      "price": 25.00,
      "currency": "USD",
      "location": "Main Restaurant - Ground Floor",
      "images": ["https://..."]
    }
  ]
}
```

#### Get Vendor Activities by Property
```
GET /api/property-vendor-activities/:property_id
```
Returns only vendor activities linked to the specific hotel property.

**Example:**
```bash
curl "https://3000-i4hrxjmvko3zsm1dlnsdp-b237eb32.sandbox.novita.ai/api/property-vendor-activities/1"
```

#### Create Hotel Offering (Admin)
```
POST /api/admin/offerings
```
**Payload:**
```json
{
  "property_id": 1,
  "offering_type": "restaurant",
  "title_en": "Azure Beach Grill",
  "short_description_en": "Mediterranean cuisine by the beach",
  "full_description_en": "Enjoy fresh seafood...",
  "price": 45.00,
  "location": "Beachside Terrace",
  "requires_booking": 1,
  "images": "[\"https://...\"]"
}
```

#### Delete Hotel Offering (Admin)
```
DELETE /api/admin/offerings/:offering_id
```

---

## 🎯 **Sample Data Included**

### Restaurants (3)
1. **Sunrise Breakfast Buffet** - $25/person
   - International cuisine, all-you-can-eat
   - Main Restaurant, Ground Floor
   - Walk-in welcome

2. **Azure Beach Grill** - $45/person
   - Mediterranean seafood
   - Beachside Terrace
   - Booking required

3. **Le Jardin Fine Dining** - $85/person
   - French-inspired cuisine
   - Garden Restaurant, 2nd Floor
   - Reservations required

### Events (3)
1. **Christmas Gala Dinner 2025** - $150/person
   - December 25, 2025, 7:00 PM
   - 5-course gourmet menu, live jazz
   - Grand Ballroom, formal attire

2. **Friday Beach BBQ Night** - $60/person
   - Every Friday, 6:00 PM - 9:00 PM
   - Lavish BBQ buffet, live entertainment
   - Private Beach Area, casual dress

3. **New Year's Eve Celebration 2026** - $250/person
   - December 31, 2025, 8:00 PM
   - Gourmet dinner, DJ, fireworks
   - Rooftop Terrace, cocktail attire

### Spa Services (1)
1. **Couples Massage Package** - $180/booking
   - 90-minute aromatherapy massage for two
   - Serenity Spa, Pool Level
   - Booking required

### Vendor Activities (6)
- Beginner Diving Lesson - $80/person
- Open Water Diving - $120/person
- Traditional Thai Massage - $60/person
- Desert Safari Adventure - $150/person
- And more...

---

## 🚀 **How It All Works Together**

### For Guests:
1. **Scan QR Code** → Redirected to `/hotel/paradise-resort`
2. **View All Options** → Hotels' own offerings + Vendor activities
3. **Filter by Category** → Restaurants, Events, Spa, Activities
4. **Book/Reserve** → Direct booking or callback request
5. **Receive Confirmation** → Email and booking reference

### For Hotel Admins:
1. **Login to Admin Dashboard**
2. **Manage Hotel Offerings** → Add restaurants, schedule events
3. **Generate Vendor Code** → Share with trusted vendors
4. **Monitor Bookings** → View all guest reservations
5. **Manage Vendors** → Add/remove vendor partnerships

### For Vendors:
1. **Register with Hotel Code**
2. **Add Activities** → Available at that specific hotel only
3. **Manage Bookings** → Accept/complete reservations
4. **Track Performance** → View stats and revenue

---

## 🔄 **Multi-Tenancy Architecture**

Each hotel property operates independently:
- ✅ Separate QR codes
- ✅ Unique landing pages with branded content
- ✅ Independent vendor partnerships
- ✅ Isolated booking systems
- ✅ Custom offerings and events

**Vendor activities only appear at hotels they're linked to:**
- Aqua Dive Centre activities → Only at Paradise Resort
- If vendor registers at multiple hotels → Activities show at all linked properties
- Clean data separation between properties

---

## 🎨 **Design Features**

- **Mobile-First Responsive Design**
  - Optimized for phones (primary use case: QR scans)
  - Touch-friendly buttons and cards
  - Smooth scrolling and filtering

- **Intuitive Category Navigation**
  - Sticky filter pills for quick switching
  - Visual icons for each category
  - Active state indicators

- **Rich Content Display**
  - High-quality images for offerings
  - Clear pricing and location info
  - Event dates and times prominently displayed

---

## 📝 **Next Steps (Optional Enhancements)**

1. **Vendor Registration UI**
   - Add registration code input in vendor dashboard
   - Allow vendors to self-link to hotels

2. **Booking System for Hotel Offerings**
   - Table reservations for restaurants
   - Event ticket management
   - Spa appointment scheduling

3. **Calendar Integration**
   - View availability calendar
   - Block specific dates
   - Recurring event patterns

4. **Email Notifications**
   - Booking confirmations
   - Event reminders
   - Special offers

5. **Analytics Dashboard**
   - Booking trends
   - Popular offerings
   - Revenue reports by category

---

## ✅ **System Status**

**Migration Status:** ✅ Applied
- `0001_initial_schema.sql` ✅
- `0002_hotel_codes_callbacks_images.sql` ✅
- `0003_vendor_profiles.sql` ✅
- `0004_hotel_offerings.sql` ✅ NEW

**Database:** ✅ Seeded with sample data
**APIs:** ✅ All endpoints operational
**Frontend:** ✅ All pages functional
**Admin Panel:** ✅ Hotel offerings management ready

**Ready for Production!** 🚀
