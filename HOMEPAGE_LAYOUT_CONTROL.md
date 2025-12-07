# 🎨 Homepage Layout Control System

## Overview
Complete control system for hotel admins to customize their homepage layout, including section ordering, visibility control, and hotel map display.

## ✅ Features Implemented

### 1. **Section Visibility Control**
Control which sections appear on your homepage:
- ✅ Restaurants Section (toggle on/off)
- ✅ Events Section (toggle on/off)
- ✅ Spa & Wellness Section (toggle on/off)
- ✅ Activities & Experiences Section (toggle on/off)
- ✅ Hotel Map Section (toggle on/off)

**How to use:**
- Go to Admin Panel → Design Settings
- Find "Section Visibility" panel
- Check/uncheck sections to show/hide them
- Save settings to apply changes

### 2. **Drag & Drop Section Ordering**
Reorder how sections appear on your homepage:
- 🎯 **Drag-and-Drop Interface**: Intuitive visual ordering
- 📊 **Live Numbering**: See order numbers update in real-time
- 🔄 **Flexible**: Any order you prefer
- 💾 **Persistent**: Order saved to database

**Default Order:**
1. Restaurants
2. Events
3. Spa & Wellness
4. Activities & Experiences

**How to use:**
1. Go to Admin Panel → Design Settings
2. Find "Section Order" panel (purple box)
3. Click and drag sections up/down to reorder
4. Numbers update automatically
5. Save settings to apply new order

### 3. **Hotel/Resort Map Upload**
Add a visual map of your property:
- 🗺️ **Map Image Upload**: Any hotel/resort map URL
- 👁️ **Visibility Toggle**: Show/hide map on homepage
- 🖱️ **Click to Enlarge**: Opens full-size map in new window
- 📍 **Smart Placement**: Always appears at bottom of page
- 💡 **Helpful Tooltip**: "Click to view full size"

**Supported Map Types:**
- Floor plans
- Grounds/campus maps
- Facility location maps
- Resort layout diagrams
- Interactive property maps

**How to use:**
1. Go to Admin Panel → Design Settings
2. Find "Hotel/Resort Map" panel (blue box)
3. Enter map image URL
4. Check "Show Hotel Map on Homepage"
5. Save settings
6. Map appears at bottom of homepage

### 4. **Category Filter Integration**
Sections respect both:
- ✅ **Visibility Settings**: Admin-controlled show/hide
- ✅ **Category Filters**: Guest-controlled filtering (All, Restaurants, Events, Spa, Activities)

**Smart Behavior:**
- Hidden sections stay hidden even when "All" filter is selected
- Category filters only affect visible sections
- Seamless user experience

## 🎯 Database Schema

### Properties Table - New Columns
```sql
-- Section Visibility (0 = hidden, 1 = visible)
show_restaurants INTEGER DEFAULT 1
show_events INTEGER DEFAULT 1
show_spa INTEGER DEFAULT 1
show_activities INTEGER DEFAULT 1
show_hotel_map INTEGER DEFAULT 0

-- Section Order (JSON array)
homepage_section_order TEXT DEFAULT '["restaurants","events","spa","activities"]'

-- Hotel Map
hotel_map_url TEXT
```

### Migration File
`migrations/0005_add_homepage_layout_control.sql` - Applied automatically

## 📡 API Endpoints

### GET /api/admin/property-settings
**Returns:**
```json
{
  "homepage_section_order": "[\"restaurants\",\"events\",\"spa\",\"activities\"]",
  "show_restaurants": 1,
  "show_events": 1,
  "show_spa": 1,
  "show_activities": 1,
  "show_hotel_map": 0,
  "hotel_map_url": "https://example.com/map.jpg"
}
```

### PUT /api/admin/property-settings
**Accepts:**
```json
{
  "property_id": 1,
  "homepage_section_order": "[\"spa\",\"restaurants\",\"events\",\"activities\"]",
  "show_restaurants": 1,
  "show_events": 0,
  "show_spa": 1,
  "show_activities": 1,
  "show_hotel_map": 1,
  "hotel_map_url": "https://example.com/hotel-map.png"
}
```

## 🎨 Admin Panel UI

### Section Visibility Panel
- **Visual**: Grid layout with 4 checkboxes
- **Icons**: 🍽️ 🎉 💆 🏃
- **Interactive**: Hover effects on borders
- **Clear Labels**: Restaurant, Events, Spa, Activities

### Section Order Panel
- **Visual**: Purple-bordered panel
- **Drag Handle**: `fa-grip-vertical` icon
- **Order Numbers**: Auto-updating 1, 2, 3, 4...
- **Move Indicator**: `fa-arrows-alt-v` icon
- **Smooth Transitions**: Visual feedback during drag

### Hotel Map Panel
- **Visual**: Blue-bordered panel
- **Map Icon**: `fa-map` icon
- **Input**: URL field for map image
- **Toggle**: Checkbox to show/hide
- **Instructions**: Clear help text

## 🔧 Technical Implementation

### JavaScript Functions

**renderContent()** - Main rendering orchestrator
```javascript
- Gets section order from property settings
- Detaches all sections from DOM
- Re-appends sections in custom order
- Calls individual render functions
- Updates visibility based on settings
```

**renderHotelMap()** - Hotel map renderer
```javascript
- Checks if map should be shown
- Creates interactive image with full-size click handler
- Adds helpful tooltip
- Hides section if map not enabled
```

**updateSectionVisibility()** - Visibility controller
```javascript
- Applies property-level visibility settings
- Respects category filter selections
- Smart combination of both controls
```

**Drag & Drop Functions:**
- `handleDragStart()` - Opacity change, store element
- `handleDragOver()` - Prevent default behavior
- `handleDrop()` - Reorder elements in DOM
- `handleDragEnd()` - Reset opacity
- `updateSectionNumbers()` - Renumber after reorder
- `getSectionOrder()` - Extract order for API save

## 📱 Use Cases

### 1. Restaurant-Focused Property
```
Order: [Restaurants, Events, Activities, Spa]
Visibility: All visible
Map: Show resort dining locations
```

### 2. Wellness Retreat
```
Order: [Spa, Restaurants, Events, Activities]
Visibility: Hide Activities
Map: Show spa facilities and meditation areas
```

### 3. Event Venue
```
Order: [Events, Restaurants, Spa, Activities]
Visibility: Hide Activities, Hide Spa
Map: Show event spaces and halls
```

### 4. Adventure Resort
```
Order: [Activities, Events, Restaurants, Spa]
Visibility: All visible
Map: Show activity locations and trails
```

## 🎯 Benefits

### For Hotel Admins
- **Control**: Full control over homepage layout
- **Branding**: Highlight what matters most
- **Flexibility**: Change order anytime
- **Easy**: Drag-and-drop interface
- **Visual**: See map location guides

### For Guests
- **Relevant**: See what the property prioritizes
- **Easy Navigation**: Find what they need faster
- **Visual Guidance**: Hotel map helps orientation
- **Better UX**: Sections match property strengths

## 🔄 Testing

### Current Configuration
- **Property ID**: 1 (Paradise Resort & Spa)
- **Default Order**: Restaurants → Events → Spa → Activities
- **All Sections**: Visible
- **Hotel Map**: Not configured yet

### Test URLs
- **Admin Panel**: `/admin/dashboard` → Design Settings tab
- **Homepage**: `/hotel/paradise-resort`
- **API Test**: `/api/admin/property-settings?property_id=1`

## 🚀 Next Steps

### Recommended Enhancements
1. **Image Upload**: Direct file upload for hotel map (vs URL)
2. **Interactive Maps**: Clickable zones on map
3. **Map Annotations**: Add labels/markers to maps
4. **Preview Mode**: Live preview before saving
5. **Templates**: Pre-configured layouts for different property types

## 📝 Notes

- ✅ **Backwards Compatible**: Existing properties work with defaults
- ✅ **Mobile Friendly**: Responsive on all devices
- ✅ **Performance**: No impact on page load speed
- ✅ **Data Isolation**: Each property has independent settings
- ✅ **Git Tracked**: All changes committed to version control

---

**Version**: 1.4.0  
**Status**: 🟢 Fully Functional  
**Last Updated**: 2025-12-07  
**Migration**: 0005_add_homepage_layout_control.sql
