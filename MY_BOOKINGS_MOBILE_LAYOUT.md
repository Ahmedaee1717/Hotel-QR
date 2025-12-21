# My Bookings - Mobile UI Layout

## 📱 Top Navigation Bar (Mobile View)

```
╔════════════════════════════════════════════╗
║  [←]  My Bookings          Room: 12        ║
║       Alia                 🗓️ 📋 Pass [×]  ║
╚════════════════════════════════════════════╝
```

**Elements:**
- `[←]` Back button (white)
- "My Bookings" title with 📋 icon (white text)
- "Alia" guest name (white, smaller text)
- "Room: 12" (white, right side)
- `🗓️` My Week button (purple background)
- `📋` My Bookings button (green background) ← **NEW!**
- "Pass" button (view digital pass)
- `[×]` Unlink button

---

## 📊 Stats Dashboard (2×2 Grid on Mobile)

```
╔═══════════════════╦═══════════════════╗
║  Total Bookings   ║    Activities     ║
║        5          ║        2          ║
╠═══════════════════╬═══════════════════╣
║     Dining        ║      Other        ║
║        2          ║        1          ║
╚═══════════════════╩═══════════════════╝
```

**Colors:**
- Total: Gray text
- Activities: Blue (#3B82F6)
- Dining: Orange (#F59E0B)
- Other: Purple (#8B5CF6)

---

## 🔍 Filter Tabs (Horizontal Scroll)

```
╔════════════════════════════════════════════╗
║ [All Bookings] [🎯 Activities] [🍽️ Dining]→║
╚════════════════════════════════════════════╝
```

**States:**
- Active: Purple background, white text
- Inactive: White background, colored text
- Swipe left/right to see more filters

**All Filters:**
1. All Bookings (default)
2. 🎯 Activities (blue)
3. 🍽️ Dining (orange)
4. 🏖️ Beach (cyan)
5. 💆 Spa (pink)

---

## 📋 Booking Card (Full Width)

```
╔════════════════════════════════════════════╗
║ 🍽️  [✅ Confirmed]                         ║
║                                            ║
║ Le Jardin Fine Dining                      ║
║                                            ║
║ 📅 Fri, Dec 20                             ║
║ ⏰ 07:30 - 09:30                           ║
║ 📍 Le Jardin Restaurant                    ║
║ 🔢 RES000001                          [ℹ️] ║
╚════════════════════════════════════════════╝
```

**Left Border Colors:**
- Activities: Blue stripe
- Restaurants: Orange stripe
- Beach: Cyan stripe
- Spa: Pink stripe
- Events: Purple stripe

**Interactive Elements:**
- Entire card: Tappable area
- `[ℹ️]` Info button: View full details

---

## 🎯 Complete Mobile Flow

### 1. Guest Links Pass
```
┌─────────────────┐
│ Enter 6-digit  │
│     PIN:       │
│   [123456]     │
│                │
│  [Link Pass]   │
└─────────────────┘
```

### 2. Navigation Bar Updates
```
BEFORE (Unlinked):
[Enter PIN] [Link Pass]

AFTER (Linked):
Alia                Room: 12
🗓️ 📋 Pass [×]
```

### 3. Click "📋 My Bookings"
```
┌─────────────────┐
│  My Bookings   │ ← Opens full page
│    Loading...  │
└─────────────────┘
```

### 4. View All Bookings
```
┌─────────────────┐
│ Stats Dashboard │
├─────────────────┤
│ Filter Tabs     │
├─────────────────┤
│ Booking Card 1  │
│ Booking Card 2  │
│ Booking Card 3  │
│      ...        │
└─────────────────┘
```

### 5. Filter by Type
```
┌─────────────────┐
│ [🍽️ Dining]     │ ← Active filter
├─────────────────┤
│ Le Jardin      │
│ Azure Grill    │
│ (2 results)    │
└─────────────────┘
```

### 6. View Details
```
┌─────────────────┐
│ Click [ℹ️]      │
└────────┬────────┘
         ↓
┌─────────────────┐
│ Full Details   │
│ Page Opens     │
└─────────────────┘
```

---

## 🎨 Color Scheme (Mobile)

### Primary Colors
- **Background**: Light gray (#F9FAFB)
- **Cards**: White (#FFFFFF)
- **Text**: Dark gray (#1F2937)
- **Accent**: Property color (default: #8B5CF6)

### Button Colors
- **My Week**: Purple (#8B5CF6)
- **My Bookings**: Green (#10B981) ← **NEW!**
- **View Pass**: Gray (#6B7280)

### Status Colors
- **Confirmed**: Green (#10B981)
- **Planned**: Orange (#F59E0B)
- **Past**: Gray (#6B7280)

### Type Colors
- **Activity**: Blue (#3B82F6)
- **Restaurant**: Orange (#F59E0B)
- **Beach**: Cyan (#06B6D4)
- **Spa**: Pink (#EC4899)
- **Event**: Purple (#8B5CF6)

---

## 📐 Mobile Dimensions

### Breakpoints
- **Mobile**: 320px - 639px
- **Tablet**: 640px - 1023px
- **Desktop**: 1024px+

### Touch Targets
- **Minimum**: 44px × 44px (Apple guidelines)
- **Buttons**: 48px height
- **Cards**: Full width with 16px padding
- **Spacing**: 16px gaps between elements

### Text Sizes
- **Title**: 24px (1.5rem)
- **Subtitle**: 14px (0.875rem)
- **Body**: 16px (1rem)
- **Caption**: 12px (0.75rem)

### Padding
- **Page**: 16px horizontal
- **Cards**: 16px all sides
- **Sections**: 24px vertical gaps

---

## 🔄 Responsive Behavior

### Mobile (< 640px)
- 2-column stats grid
- Emoji-only buttons (🗓️ 📋)
- Full-width booking cards
- Horizontal scroll filters
- Stacked card content

### Tablet (640px - 1024px)
- 4-column stats grid
- Full button text visible
- Optimized card spacing
- All filters visible
- Improved layout

### Desktop (> 1024px)
- Maximum width: 1152px
- Hover effects enabled
- Spacious layout
- All features visible
- Enhanced interactions

---

## ✅ Mobile Usability Checklist

- ✅ **Thumb-friendly**: All buttons within thumb reach
- ✅ **No tiny text**: Minimum 14px font size
- ✅ **No horizontal scroll**: Except for filter tabs (intentional)
- ✅ **Fast loading**: Optimized for 3G/4G
- ✅ **Clear hierarchy**: Easy to scan
- ✅ **Touch feedback**: Visual response on tap
- ✅ **Readable**: High contrast text
- ✅ **Accessible**: Screen reader friendly
- ✅ **Forgiving**: Large touch targets
- ✅ **Smooth**: No lag or jank

---

## 🎯 Key Mobile Features

### 1. **Quick Access**
- One tap from any page
- Persistent in navigation bar
- Always visible when pass linked

### 2. **Clear Indicators**
- Emoji icons for quick recognition
- Color-coded booking types
- Status badges prominent
- Past bookings dimmed

### 3. **Easy Filtering**
- Horizontal swipe filters
- One-tap category selection
- Active filter highlighted
- Instant results

### 4. **Complete Info**
- All details at a glance
- No need to click for basics
- Optional detail view
- Reference numbers visible

### 5. **Offline-Ready**
- Guest info cached
- Works with poor connection
- Graceful error handling
- Retry on failure

---

## 📱 Testing on Real Devices

### iPhone (Safari)
- ✅ iOS 14+
- ✅ iPhone SE (small screen)
- ✅ iPhone 12/13/14 (standard)
- ✅ iPhone Pro Max (large)

### Android (Chrome)
- ✅ Android 10+
- ✅ Small phones (< 5")
- ✅ Standard phones (5-6")
- ✅ Large phones (6"+)

### Tablets
- ✅ iPad Mini
- ✅ iPad Pro
- ✅ Android tablets

---

## 🎉 Mobile-First Success

**Perfect mobile experience:**
- Clear button placement ✅
- Easy one-thumb operation ✅
- All info visible without scrolling card ✅
- Fast loading and rendering ✅
- Works on small screens (320px+) ✅
- Looks great on large screens too ✅

**Ready for production! 📱**
