# 🧪 UPSELL ANALYTICS - Quick Test Guide

## ✅ THE FIX IS DEPLOYED
**Version**: 29230959  
**Deployed**: 2026-01-16  
**Status**: ✅ LIVE at https://www.oldpalaceresort.online

## 🎯 WHAT WAS FIXED
- **BEFORE**: Front desk bookings did NOT track upsells (items had no `rm_` prefix)
- **AFTER**: ALL extra-charge items now have `rm_` prefix → tracked as upsells!

## 🧪 HOW TO TEST (3 SCENARIOS)

### Scenario 1: Front Desk Creates Booking with Extra Items ⭐
**This is the MAIN fix - test this first!**

1. **Go to Front Desk Portal**:
   ```
   https://www.oldpalaceresort.online/front-desk/alacarte-booking/1
   ```

2. **Create a New Booking**:
   - Select restaurant: "LA Cucina A' la Carte"
   - Enter guest details:
     - Room: 101
     - Guest Name: Test Guest
     - Party Size: 2
   - Select date and time (today or tomorrow)

3. **Add Extra-Charge Items**:
   - Click "Add Items" button
   - Select items from menu (e.g., Coffee, Dessert, Wine)
   - Set quantities
   - Submit booking

4. **Check Analytics** (wait 5 seconds, then):
   ```
   https://www.oldpalaceresort.online/api/analytics/staff-performance?period=today
   ```

5. **✅ VERIFY**:
   ```json
   {
     "extra_charge_items": [
       {
         "item_name": "Coffee",
         "category": "Beverages",
         "cost_to_hotel": 3.50,
         "times_sold": 1,
         "total_quantity": 2,
         "total_revenue": 7.00
       }
     ]
   }
   ```

### Scenario 2: Waiter Adds Extra Items 
**This already worked before - testing to ensure still works!**

1. **Go to Waiter Dashboard**:
   ```
   https://www.oldpalaceresort.online/waiter-dashboard?restaurant=2&property=1
   ```

2. **Seat a Guest**:
   - Click on an available table
   - Enter guest details
   - Seat guest

3. **Add Extra Items**:
   - Click "Add Items"
   - Select items with prices (extra-charge items)
   - Click "Send to Kitchen"

4. **Check Analytics**:
   ```
   https://www.oldpalaceresort.online/api/analytics/staff-performance?period=today
   ```

5. **✅ VERIFY**: Items appear in `extra_charge_items`

### Scenario 3: Check Analytics Dashboard
**View the complete analytics**

1. **API Endpoint**:
   ```bash
   curl 'https://www.oldpalaceresort.online/api/analytics/staff-performance?period=week' \
     -H 'X-Property-ID: 1'
   ```

2. **✅ VERIFY You See**:
   - **Staff Performance**:
     - List of staff members
     - Total bookings per staff
     - Upsell count (bookings with extra items)
     - Upsell rate (% of bookings with upsells)
     - Total revenue per staff
   
   - **Extra Charge Items**:
     - Item names
     - Categories
     - Prices
     - Times sold
     - Total quantity
     - Total revenue
   
   - **Daily Trend**:
     - Date
     - Total bookings
     - Bookings with upsells
     - Daily revenue
     - Active staff count

## 📊 CURRENT STATUS (Before New Bookings)
```
Staff Performance: 3 staff members
Extra Charge Items: 0 items (no upsells yet - normal for fresh deployment)
Daily Trend: 2 days of data
```

## 🎯 EXPECTED AFTER TESTING
After creating test bookings with extra items:
```
Staff Performance: 3+ staff members (including test user)
Extra Charge Items: 1-5 items (coffee, dessert, etc.)
Daily Trend: Shows today with upsells
```

## 🔍 DEBUGGING (If Items Don't Show)

### Check 1: Verify Item Has `rm_` Prefix
```sql
-- Check latest voucher
SELECT 
  voucher_code,
  preorder_item_ids,
  created_by_staff_id
FROM alacarte_vouchers
ORDER BY created_at DESC
LIMIT 1;
```

**Expected**:
```json
{
  "preorder_item_ids": "[{\"item_id\":\"rm_14\",\"quantity\":2}]"
}
```

**If you see** (without rm_):
```json
{
  "preorder_item_ids": "[{\"item_id\":\"14\",\"quantity\":2}]"
}
```
→ Old booking before the fix (expected)

### Check 2: Verify Item Has Price > 0
Items MUST have `cost_to_hotel > 0` to count as upsell.

Check menu items:
```
https://www.oldpalaceresort.online/api/restaurant/2/menu/extra-charge
```

### Check 3: Verify Staff ID is Set
Bookings MUST have `created_by_staff_id` to count as staff-created.

### Check 4: Check Date Range
Analytics filters by date. Use:
- `?period=today` - Today only
- `?period=week` - Last 7 days
- `?period=month` - Last 30 days
- `?start_date=2026-01-16&end_date=2026-01-17` - Custom range

## 📋 QUICK CHECKLIST
- [ ] Front desk can create booking
- [ ] Front desk can add extra-charge items
- [ ] Items appear in analytics after booking
- [ ] Revenue calculated correctly
- [ ] Staff member shows in performance list
- [ ] Upsell rate calculated correctly
- [ ] Daily trend shows today's data
- [ ] Top items ranked by revenue

## 🚀 API ENDPOINTS REFERENCE

### Get Analytics
```
GET /api/analytics/staff-performance
Headers: X-Property-ID: 1
Params: 
  - period: today|week|month
  - start_date: YYYY-MM-DD
  - end_date: YYYY-MM-DD
```

### Get Menu Items
```
GET /api/restaurant/:restaurant_id/menu/extra-charge
Headers: X-Property-ID: 1
```

### Create Front Desk Booking
```
POST /api/front-desk/alacarte-booking
Headers: 
  - Content-Type: application/json
  - X-Property-ID: 1
Body: {
  "guest_name": "Test Guest",
  "room_number": "101",
  "party_size": 2,
  "reservation_date": "2026-01-17",
  "reservation_time": "19:00",
  "restaurant_id": "h2",
  "staff_id": 5,
  "items": [
    { "item_id": "14", "quantity": 2 },
    { "item_id": "15", "quantity": 1 }
  ]
}
```

## 📞 TROUBLESHOOTING

### Problem: Items not showing in analytics
**Solution**:
1. Verify item has `rm_` prefix in database
2. Check item has price > 0
3. Confirm booking has staff_id
4. Use correct date range in query

### Problem: Revenue is 0 or null
**Solution**:
1. Check menu items have `cost_to_hotel` set
2. Verify quantity is stored correctly
3. Ensure price is in correct format (decimal)

### Problem: Staff performance shows 0 upsells
**Solution**:
1. Create a new booking (after deployment)
2. Old bookings (before fix) won't have rm_ prefix
3. Wait 5 seconds after booking, then refresh analytics

## ✅ SUCCESS CRITERIA
The fix is working correctly if:
1. ✅ New front desk bookings have `rm_` prefix on items
2. ✅ Analytics shows items in `extra_charge_items` array
3. ✅ Revenue is calculated correctly
4. ✅ Staff performance shows upsell counts
5. ✅ Daily trends show bookings with upsells

## 📚 FULL DOCUMENTATION
See `/home/user/webapp/UPSELL_ANALYTICS_FIX.md` for complete technical details.

---

**STATUS**: ✅ DEPLOYED & READY FOR TESTING  
**Next Step**: Create a test booking with extra items and verify it appears in analytics!
