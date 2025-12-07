

# 🍽️ Restaurant Table Booking & Scheduling System

## Overview
Comprehensive solution for all-inclusive resorts to manage overcrowded buffets and provide scheduled dining experiences with visual table selection.

---

## 🎯 **Problem Solved**

### Issues in All-Inclusive Resorts (Especially Egypt):
1. **Overcrowded buffets** at peak meal times
2. **Long wait times** for tables
3. **Poor guest experience** due to chaos
4. **No control** over dining flow
5. **Difficult capacity management**

### Our Solution:
✅ **Time slot scheduling** - Breakfast, lunch, dinner slots  
✅ **Visual table selection** - Guests pick their preferred table  
✅ **Capacity tracking** - Prevent overbooking  
✅ **Custom table layouts** - Each restaurant draws own floor plan  
✅ **Real-time availability** - See which tables are free  
✅ **Booking management** - Track reservations, check-ins, completions

---

## 📊 **Database Schema**

### New Tables Created (Migration 0005):

#### 1. `restaurant_tables`
Stores individual tables for each restaurant:
```sql
- table_id, offering_id (restaurant)
- table_number, table_name
- capacity (seats)
- position_x, position_y (visual layout coordinates)
- width, height, shape (rectangle/circle/square)
- table_type (standard/booth/bar/outdoor/vip)
- features (JSON: window_view, beachfront, quiet, etc.)
```

#### 2. `dining_sessions`
Time slots for meal service:
```sql
- session_id, offering_id
- session_date, session_time
- session_type (breakfast/lunch/dinner/brunch)
- duration_minutes (how long guests have table)
- max_capacity, current_bookings
- status (available/full/closed)
```

#### 3. `table_reservations`
Guest table bookings:
```sql
- reservation_id
- session_id, table_id, guest_id
- reservation_date, reservation_time
- num_guests, duration_minutes
- special_requests, dietary_requirements
- status (confirmed/seated/completed/cancelled)
- checked_in_at, completed_at
```

#### 4. `session_templates`
Recurring schedule templates:
```sql
- template_id, offering_id
- template_name, day_of_week
- session_type, start_time, end_time
- slot_interval_minutes (e.g., every 30 mins)
- slot_duration_minutes (e.g., 90 min booking)
```

#### 5. `restaurant_layouts`
Saved floor plan configurations:
```sql
- layout_id, offering_id
- layout_data (JSON: complete table positions)
- canvas_width, canvas_height
- background_image (floor plan image URL)
```

---

## 🏗️ **Sample Data Included**

### **Sunrise Breakfast Buffet** (Offering ID: 1)
- **18 Tables Total**
  - 6 Window tables (couples & families)
  - 8 Center tables (including large family tables)
  - 4 Quiet corner tables (intimate seating)
- **Capacity:** 80 guests
- **Schedule:** 6:00 AM - 10:30 AM (30-minute slots)
- **Duration:** 90 minutes per booking

### **Azure Beach Grill** (Offering ID: 2)
- **12 Tables Total**
  - 6 Beachfront premium tables (sunset view)
  - 6 Covered terrace tables
- **Capacity:** 40 guests
- **Schedule:** 12:00 PM - 4:00 PM (30-minute slots)
- **Duration:** 120 minutes per booking

### **Le Jardin Fine Dining** (Offering ID: 3)
- **11 Tables Total**
  - 4 VIP tables (private, romantic)
  - 6 Garden view tables
  - 1 Chef's table (exclusive, 6 seats)
- **Capacity:** 30 guests
- **Schedule:** 6:00 PM - 10:00 PM (15-minute slots, closed Mondays)
- **Duration:** 150 minutes (2.5 hours) per booking

---

## 🎨 **Table Features & Types**

### Table Types:
- `standard` - Regular dining tables
- `booth` - Booth seating
- `bar` - Bar/high-top seating
- `outdoor` - Outdoor/patio seating
- `vip` - Premium/exclusive tables

### Table Features (JSON array):
- `window_view` - Tables with window views
- `beachfront` - Direct beach access
- `sunset_view` - Sunset viewing location
- `garden_view` - Garden/greenery views
- `couples` - Romantic 2-person tables
- `family_friendly` - Large family tables
- `highchair_available` - Highchair support
- `quiet` - Quieter sections
- `private` - Private/secluded
- `romantic` - Romance setting
- `covered` - Weather protection
- `chefs_table` - Kitchen view
- `exclusive` - VIP exclusive

### Table Shapes (for visual rendering):
- `rectangle` - Standard rectangular
- `square` - Square tables
- `circle` - Round tables

---

## 🔧 **Admin Features**

### 1. **Table Layout Designer**
Admins can design restaurant floor plans:
- Drag-and-drop table placement
- Set table capacity (2, 4, 6, 8 seats)
- Assign table numbers/names
- Add features (window view, beachfront, etc.)
- Visual canvas with coordinates
- Save/load layouts

### 2. **Schedule Management**
Create meal time slots:
- Define breakfast/lunch/dinner hours
- Set slot intervals (every 15, 30, 60 minutes)
- Set booking duration (90, 120, 150 minutes)
- Create templates for recurring schedules
- Day-specific schedules (e.g., no dinner Mondays)

### 3. **Capacity Control**
Prevent overcrowding:
- Set max capacity per session
- Track current bookings in real-time
- Automatic status updates (available/full/closed)
- Override controls for special situations

### 4. **Booking Management**
View and manage reservations:
- See all bookings by date/time/table
- Check-in guests when they arrive
- Mark tables as completed
- Handle cancellations
- View dietary requirements and special requests

---

## 👥 **Guest Experience**

### Step-by-Step Booking Flow:

#### 1. **Select Restaurant**
Guest browses hotel landing page and selects a restaurant.

#### 2. **Choose Date & Meal Time**
- Calendar view showing available dates
- Meal type filter (breakfast/lunch/dinner)
- Time slot selection with availability indicators

#### 3. **Visual Table Selection**
- Interactive floor plan showing all tables
- **Available tables** - Green/clickable
- **Occupied tables** - Red/grayed out
- **Selected table** - Highlighted
- Table details on hover:
  - Capacity (seats)
  - Features (window view, beachfront, etc.)
  - Table number/name

#### 4. **Enter Details**
- Number of guests (validated against table capacity)
- Special requests (celebration, quiet area, etc.)
- Dietary requirements (vegetarian, allergies, etc.)

#### 5. **Confirmation**
- Booking reference number
- Reservation details summary
- Email confirmation (if implemented)
- Reminder option

---

## 📱 **Mobile-First Design**

All interfaces optimized for mobile:
- Touch-friendly table selection
- Swipe-able time slots
- Responsive floor plans
- Easy date picker
- Large touch targets

---

## 🚀 **API Endpoints** (To Be Implemented)

### Guest APIs:
```
GET  /api/restaurant/:offering_id/availability?date={date}&meal_type={type}
GET  /api/restaurant/:offering_id/tables?session_id={id}
POST /api/restaurant/book
GET  /api/my-reservations?guest_id={id}
POST /api/reservation/:id/cancel
```

### Admin APIs:
```
GET    /api/admin/restaurant/:offering_id/tables
POST   /api/admin/restaurant/table
PUT    /api/admin/restaurant/table/:id
DELETE /api/admin/restaurant/table/:id

GET    /api/admin/restaurant/:offering_id/sessions?date={date}
POST   /api/admin/restaurant/session
PUT    /api/admin/restaurant/session/:id

GET    /api/admin/restaurant/reservations?offering_id={id}&date={date}
POST   /api/admin/reservation/:id/check-in
POST   /api/admin/reservation/:id/complete
POST   /api/admin/reservation/:id/cancel

POST   /api/admin/restaurant/layout
GET    /api/admin/restaurant/:offering_id/layout
```

---

## 📈 **Capacity Management**

### Overbooking Prevention:
1. **Real-time tracking** of seats booked per session
2. **Automatic session closure** when capacity reached
3. **Table-specific validation** - Can't book 6 people at 4-seat table
4. **Buffer management** - Optional capacity buffer (e.g., 80% max)

### Analytics:
- Peak hours identification
- Popular tables tracking
- No-show rates
- Average dining duration
- Capacity utilization percentage

---

## 🎯 **Use Cases**

### All-Inclusive Resort (Egypt Example):

**Before:**
- ❌ 200 guests arrive at breakfast buffet at 8 AM
- ❌ 45-minute wait for tables
- ❌ Chaos and frustration
- ❌ Cold food from waiting
- ❌ Staff overwhelmed

**After with Our System:**
- ✅ Guests book breakfast time: 7:00, 7:30, 8:00, 8:30 slots
- ✅ Choose their preferred table (window, quiet, family)
- ✅ Spread arrivals: 20 guests per 30-minute slot
- ✅ No waiting - table ready on arrival
- ✅ Organized, pleasant experience
- ✅ Staff can prepare properly

### Fine Dining Restaurant:

**Features Used:**
- ✅ 15-minute slot intervals for precise timing
- ✅ VIP table selection
- ✅ Longer booking duration (2.5 hours)
- ✅ Special occasion notes
- ✅ Dietary requirements tracking
- ✅ Chef's table exclusivity

### Beachfront Casual Dining:

**Features Used:**
- ✅ Beachfront table premium selection
- ✅ Sunset view tables highlighted
- ✅ Covered terrace for weather
- ✅ Flexible 2-hour bookings
- ✅ Walk-ins with real-time availability

---

## 💡 **Advanced Features** (Future Enhancements)

### 1. **Smart Recommendations**
- Suggest tables based on party size
- Recommend less crowded time slots
- Feature-based matching (couples → romantic tables)

### 2. **Waitlist Management**
- Join waitlist when session full
- Auto-notify when table becomes available
- Priority for returning guests

### 3. **Dynamic Pricing** (Optional)
- Premium tables cost more (beachfront, sunset view)
- Peak hour surcharges
- Early bird discounts

### 4. **Table Combining**
- Automatically suggest combining small tables for large groups
- Visual indication of combinable tables

### 5. **Accessibility Features**
- Wheelchair-accessible table indicators
- Easy-access entrance tables
- Special needs accommodation

### 6. **Integration Features**
- Calendar sync (Google/Apple Calendar)
- SMS reminders
- QR code check-in at restaurant entrance
- Digital menu pre-selection

---

## 🔐 **Security & Validation**

- ✅ Guest authentication required for bookings
- ✅ Duplicate booking prevention (same guest, same time)
- ✅ Capacity validation (can't exceed table capacity)
- ✅ Time conflict detection
- ✅ Session availability checks
- ✅ Cancellation policy enforcement
- ✅ Admin-only management access

---

## 📊 **Current Status**

### ✅ Completed:
- Database schema (migration 0005)
- Sample table layouts (3 restaurants, 41 tables)
- Session templates (breakfast/lunch/dinner)
- Sample dining sessions (today + tomorrow)
- Table features and types defined

### 🔄 In Progress:
- Admin table layout designer UI
- Guest table selection interface
- Booking flow implementation

### 📋 Next Steps:
1. Build visual table designer for admins
2. Create guest-facing booking interface
3. Implement real-time availability API
4. Add booking confirmation system
5. Build check-in/management dashboard
6. Test overcrowding prevention

---

## 🎉 **Benefits for Resorts**

### For Management:
- 📊 Better capacity utilization
- 📈 Reduced operational chaos
- 💰 Potential premium table revenue
- 📉 Lower no-show rates
- 🎯 Data-driven scheduling decisions

### For Guests:
- ⏰ No waiting in lines
- 🪑 Choose preferred seating
- 🎯 Guaranteed table at chosen time
- 🌅 Special table features (views, quiet)
- 📱 Convenient mobile booking

### For Staff:
- 📋 Organized service flow
- 👥 Predictable guest arrivals
- 🍽️ Better food preparation timing
- 🧹 Efficient table turnover
- 😊 Less stressful environment

---

## 📞 **Support for Multiple Restaurants**

System supports unlimited restaurants per hotel:
- Each restaurant has own table layout
- Independent scheduling
- Separate capacity management
- Different meal types per venue
- Custom features per restaurant

---

**This system transforms chaotic buffet rushes into organized, pleasant dining experiences while giving guests control over their meal times and seating preferences!** 🍽️✨
