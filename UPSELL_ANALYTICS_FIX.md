# 🎯 UPSELL ANALYTICS FIX - Complete Documentation

## 🔴 THE PROBLEM
Analytics was NOT showing proper upsells from extra-charge menu items added by waiter/front desk staff.

### Root Cause
- **Front Desk Booking System** was storing menu items WITHOUT the `rm_` prefix
- **Waiter Dashboard** was correctly adding `rm_` prefix 
- **Analytics Query** was filtering ONLY for items with `rm_` prefix
- Result: Front desk bookings were INVISIBLE in upsell analytics!

## ✅ THE FIX
Added `rm_` prefix to ALL extra-charge menu items in front desk booking system.

### Changed Files
- `src/index.tsx` (2 endpoints):
  - `/api/front-desk/alacarte-booking` 
  - `/api/front-desk/guest-alacarte-booking`

### Code Change
```typescript
// BEFORE (WRONG - no prefix)
const preorder_items = items.map(i => ({
  item_id: i.item_id,
  quantity: i.quantity || 1
}))

// AFTER (CORRECT - with rm_ prefix for analytics)
const preorder_items = items.map(i => ({
  item_id: `rm_${i.item_id}`,  // Now tracked as upsell!
  quantity: i.quantity || 1
}))
```

## 📊 HOW UPSELL TRACKING WORKS

### Two Menu Systems
1. **Regular Menu** (`menu_items` table) - EXTRA CHARGES
   - Items have prices (cost_to_hotel)
   - Added by waiter or front desk staff
   - Guest interaction = UPSELL ✅
   - Prefix: `rm_` (restaurant menu)

2. **Set Menu** (`alacarte_menu_items` table) - INCLUDED
   - Included with booking (no extra charge)
   - Guest selects during booking
   - NOT counted as upsell ❌
   - No prefix (just numeric IDs)

### Item ID Format
- **Regular menu items (WITH CHARGES)**: `rm_14`, `rm_15`, `rm_16`...
- **Set menu items (INCLUDED)**: `2`, `3`, `4`...

### Analytics Query (Already Correct!)
```sql
SELECT 
  mi.item_name,
  mc.category_name AS category,
  mi.price AS cost_to_hotel,
  COUNT(*) AS times_sold,
  SUM(quantity) AS total_quantity,
  SUM(mi.price * quantity) AS total_revenue
FROM alacarte_vouchers v
CROSS JOIN json_each(v.preorder_item_ids) AS items
INNER JOIN menu_items mi ON mi.item_id = CAST(
  SUBSTR(json_extract(items.value, '$.item_id'), 4) AS INTEGER
)
WHERE json_extract(items.value, '$.item_id') LIKE 'rm_%'  -- Only count upsells!
  AND v.created_by_staff_id IS NOT NULL  -- Only staff-created bookings
  AND mi.price > 0  -- Only items with extra charges
GROUP BY mi.item_id
ORDER BY total_revenue DESC
```

## 🎯 WHAT COUNTS AS UPSELL?

### ✅ COUNTED AS UPSELL
1. **Waiter adds extra items** during service
   - Guest seated at table
   - Waiter recommends "Would you like dessert?"
   - Guest agrees → Staff interaction = UPSELL ✅

2. **Front desk adds extra items** during booking
   - Guest walks in or calls to make reservation
   - Staff suggests "Would you like to add wine?"
   - Guest agrees → Staff interaction = UPSELL ✅

### ❌ NOT COUNTED AS UPSELL
- **Guest self-selects** from set menu during booking
- **Pre-ordered items** included with package
- **Complimentary items** (price = 0)

## 📈 ANALYTICS ENDPOINTS

### Staff Performance Analytics
```
GET /api/analytics/staff-performance
Headers: X-Property-ID: 1
Query Params:
  - period: today|week|month
  - start_date: YYYY-MM-DD (optional)
  - end_date: YYYY-MM-DD (optional)
```

### Response Structure
```json
{
  "success": true,
  "period": "week",
  "date_range": {
    "start": "2024-01-10",
    "end": "2024-01-16"
  },
  "staff_performance": [
    {
      "user_id": 5,
      "staff_name": "John Smith",
      "email": "john@hotel.com",
      "role": "waiter",
      "total_bookings": 45,
      "total_guests": 123,
      "upsell_count": 32,
      "upsell_rate": 71.1,
      "total_upsell_revenue": 456.75,
      "avg_upsell_per_booking": 14.27,
      "active_days": 6
    }
  ],
  "extra_charge_items": [
    {
      "item_name": "House Wine",
      "category": "Beverages",
      "cost_to_hotel": 8.50,
      "times_sold": 78,
      "total_quantity": 156,
      "total_revenue": 1326.00
    }
  ],
  "daily_trend": [
    {
      "reservation_date": "2024-01-16",
      "total_bookings": 23,
      "bookings_with_upsell": 15,
      "daily_revenue": 287.50,
      "active_staff_count": 4
    }
  ],
  "top_upsellers": [
    {
      "user_id": 5,
      "staff_name": "John Smith",
      "upsell_rate": 85.5,
      "total_revenue": 1234.50
    }
  ]
}
```

## 🧪 TESTING THE FIX

### Test Scenario 1: Front Desk Booking with Extra Items
1. Go to: https://www.oldpalaceresort.online/front-desk/alacarte-booking/1
2. Create booking and add extra-charge items (e.g., Coffee, Dessert)
3. Submit booking
4. Check analytics: `/api/analytics/staff-performance?period=today`
5. ✅ Verify: Items appear in `extra_charge_items` section

### Test Scenario 2: Waiter Adds Extra Items
1. Go to: https://www.oldpalaceresort.online/waiter-dashboard?restaurant=2&property=1
2. Seat a guest at a table
3. Click "Add Items" and select extra-charge items
4. Send to kitchen
5. Check analytics: `/api/analytics/staff-performance?period=today`
6. ✅ Verify: Items appear in `extra_charge_items` section

### Test Scenario 3: Analytics Dashboard
1. Go to staff performance analytics page
2. Select period: "Today" or "This Week"
3. ✅ Verify you see:
   - Staff members with upsell counts
   - Top performing extra-charge items
   - Revenue trends
   - Upsell rates per staff member

## 🔍 DATABASE VERIFICATION

### Check if items have rm_ prefix
```sql
SELECT 
  voucher_code,
  preorder_item_ids,
  created_by_staff_id,
  created_at
FROM alacarte_vouchers
WHERE created_by_staff_id IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;
```

### Expected Result
```json
{
  "preorder_item_ids": "[{\"item_id\":\"rm_14\",\"quantity\":2},{\"item_id\":\"rm_15\",\"quantity\":1}]"
}
```

### Count upsell items in last 7 days
```sql
SELECT 
  COUNT(DISTINCT v.voucher_id) as bookings_with_upsells,
  COUNT(*) as total_upsell_items,
  SUM(mi.price * CAST(json_extract(items.value, '$.quantity') AS INTEGER)) as total_revenue
FROM alacarte_vouchers v
CROSS JOIN json_each(v.preorder_item_ids) AS items
INNER JOIN menu_items mi ON mi.item_id = CAST(
  SUBSTR(json_extract(items.value, '$.item_id'), 4) AS INTEGER
)
WHERE json_extract(items.value, '$.item_id') LIKE 'rm_%'
  AND v.created_by_staff_id IS NOT NULL
  AND v.created_at >= date('now', '-7 days');
```

## 📋 COMPLETE SYSTEM FLOW

### 1. Menu Item Creation (Admin)
```
Admin → Upload menu image → OCR extraction → AI parsing → menu_items table
Item gets item_id: 14, 15, 16...
```

### 2. Item Selection (Front Desk or Waiter)
```
Staff → Select items → Add to booking
System adds rm_ prefix: rm_14, rm_15, rm_16...
Stored in alacarte_vouchers.preorder_item_ids
```

### 3. Analytics Processing
```
Query filters: WHERE item_id LIKE 'rm_%'
Joins: menu_items to get prices
Calculates: revenue, quantity, times sold
Groups by: staff member, item, date
```

### 4. Dashboard Display
```
Staff Performance:
  - Upsell count per staff
  - Upsell rate (% of bookings with upsells)
  - Total revenue per staff
  
Top Items:
  - Most sold extra-charge items
  - Revenue per item
  - Quantity sold
  
Daily Trends:
  - Bookings with upsells per day
  - Revenue trends
  - Active staff count
```

## 🚀 DEPLOYMENT INFO
- **Version**: 29230959
- **Deployment URL**: https://29230959.project-c8738f5c.pages.dev
- **Production URL**: https://www.oldpalaceresort.online
- **Deployed**: 2026-01-16
- **Commit**: ebe7686

## ✅ VERIFICATION CHECKLIST
- [x] Front desk booking adds `rm_` prefix
- [x] Waiter dashboard adds `rm_` prefix
- [x] Analytics query filters for `rm_` prefix
- [x] Extra-charge items appear in analytics
- [x] Staff performance metrics calculated correctly
- [x] Revenue tracking accurate
- [x] Upsell rate calculated per staff member
- [x] Top items ranked by revenue
- [x] Daily trends showing correctly
- [x] Database schema supports queries
- [x] Documentation complete

## 🎯 KEY METRICS NOW TRACKED
1. **Per Staff Member**:
   - Total bookings created
   - Number with upsells
   - Upsell rate (%)
   - Total upsell revenue
   - Average revenue per booking

2. **Per Item**:
   - Times sold
   - Total quantity
   - Total revenue
   - Category

3. **Per Day**:
   - Total bookings
   - Bookings with upsells
   - Daily revenue
   - Active staff count

4. **Top Performers**:
   - Highest upsell rates
   - Highest revenue
   - Most consistent performers

## 🔧 TECHNICAL DETAILS

### Item ID Prefixes
- `rm_` = Restaurant Menu (extra charge items) → **COUNTED AS UPSELL**
- No prefix = Set Menu (included items) → **NOT COUNTED AS UPSELL**

### Why `rm_` Prefix?
1. **Separation**: Distinguishes extra-charge items from included items
2. **Analytics**: Enables filtering in queries
3. **Revenue Tracking**: Only tracks items that generate extra revenue
4. **Staff Performance**: Only counts actual upsell efforts

### Database Tables Involved
- `menu_items` - Regular menu with prices
- `menu_categories` - Menu categories
- `alacarte_vouchers` - Booking records
- `alacarte_vouchers.preorder_item_ids` - JSON array of items with quantities
- `users` - Staff members (created_by_staff_id)

## 📞 SUPPORT
If analytics still not showing upsells:
1. Check if items have `rm_` prefix in database
2. Verify staff_id is set on bookings
3. Confirm items have price > 0
4. Check date range in analytics query
5. Review this document for complete flow

---

**STATUS**: ✅ COMPLETE - All front desk and waiter bookings now properly tracked as upsells in analytics!
