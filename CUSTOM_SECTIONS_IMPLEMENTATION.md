# Custom Sections & Translations - Implementation Guide

## ✅ COMPLETED (Task 1)
- ✅ Database migration `0008_add_custom_sections.sql` applied
- ✅ `custom_sections` table created
- ✅ Section heading translation columns added to `properties` table
- ✅ Custom sections CRUD APIs created:
  - `GET /api/admin/custom-sections?property_id=1`
  - `POST /api/admin/custom-sections`
  - `PUT /api/admin/custom-sections/:section_id`
  - `DELETE /api/admin/custom-sections/:section_id`
- ✅ `custom_section_key` column added to `hotel_offerings` table

## 🔨 REMAINING TASKS

### Task 2: Translate Section Headings on Homepage

**Location:** `src/index.tsx` around line 2656-2710

**Current (Hardcoded):**
```html
<h2 class="text-2xl font-bold mb-4 flex items-center">
    <i class="fas fa-utensils text-blue-500 mr-3"></i>
    Our Restaurants
</h2>
```

**Update To (Dynamic with Translation):**
```javascript
// In init() function, fetch section translations:
const sectionNames = {
  restaurants: propertyData[`section_restaurants_${currentLanguage}`] || propertyData.section_restaurants_en,
  events: propertyData[`section_events_${currentLanguage}`] || propertyData.section_events_en,
  spa: propertyData[`section_spa_${currentLanguage}`] || propertyData.section_spa_en,
  service: propertyData[`section_service_${currentLanguage}`] || propertyData.section_service_en,
  activities: propertyData[`section_activities_${currentLanguage}`] || propertyData.section_activities_en
};

// Update each section heading:
<h2 class="text-2xl font-bold mb-4 flex items-center">
    <i class="fas fa-utensils text-blue-500 mr-3"></i>
    ${sectionNames.restaurants}
</h2>
```

### Task 3: Translate Category Filter Pills

**Location:** Line 2632-2650

**Add translations object:**
```javascript
const categoryTranslations = {
  en: { all: 'All', restaurant: 'Restaurants', event: 'Events', spa: 'Spa', service: 'Services', activities: 'Activities' },
  ar: { all: 'الكل', restaurant: 'مطاعم', event: 'فعاليات', spa: 'سبا', service: 'خدمات', activities: 'أنشطة' },
  de: { all: 'Alle', restaurant: 'Restaurants', event: 'Veranstaltungen', spa: 'Spa', service: 'Dienstleistungen', activities: 'Aktivitäten' },
  ru: { all: 'Все', restaurant: 'Рестораны', event: 'События', spa: 'Спа', service: 'Услуги', activities: 'Мероприятия' },
  // ... add all 9 languages
};

// Use in pills:
<button onclick="filterOfferings('all')" class="category-pill ...">
    <i class="fas fa-th-large mr-2"></i>${categoryTranslations[currentLanguage].all}
</button>
```

### Task 4: Admin Panel - Custom Sections Management

**Add new tab in admin dashboard** (after line 5330):

```html
<button data-tab="customsections" class="tab-btn px-6 py-4 font-semibold">
    <i class="fas fa-layer-group mr-2"></i>Custom Sections
</button>
```

**Add tab content:**
```html
<div id="customsectionsTab" class="tab-content hidden">
    <div class="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h2 class="text-2xl font-bold mb-4">
            <i class="fas fa-plus-circle mr-2 text-blue-600"></i>
            Add Custom Section
        </h2>
        <form id="addCustomSectionForm" class="space-y-4">
            <div class="grid md:grid-cols-2 gap-4">
                <input type="text" id="sectionKey" placeholder="Section Key (e.g., pool-bar)" required class="px-4 py-2 border rounded-lg">
                <input type="text" id="sectionNameEn" placeholder="Section Name (English)" required class="px-4 py-2 border rounded-lg">
            </div>
            <div class="grid md:grid-cols-3 gap-4">
                <select id="sectionIcon" class="px-4 py-2 border rounded-lg">
                    <option value="fas fa-star">⭐ Star</option>
                    <option value="fas fa-swimming-pool">🏊 Pool</option>
                    <option value="fas fa-cocktail">🍹 Bar</option>
                    <option value="fas fa-child">👶 Kids</option>
                    <option value="fas fa-gamepad">🎮 Gaming</option>
                    <option value="fas fa-dumbbell">🏋️ Fitness</option>
                    <option value="fas fa-utensils">🍽️ Dining</option>
                </select>
                <select id="sectionColor" class="px-4 py-2 border rounded-lg">
                    <option value="blue">Blue</option>
                    <option value="purple">Purple</option>
                    <option value="green">Green</option>
                    <option value="orange">Orange</option>
                    <option value="red">Red</option>
                    <option value="pink">Pink</option>
                </select>
                <input type="number" id="sectionOrder" placeholder="Display Order" value="0" class="px-4 py-2 border rounded-lg">
            </div>
            <button type="submit" class="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
                <i class="fas fa-check mr-2"></i>Create Section
            </button>
        </form>
    </div>
    
    <div class="bg-white rounded-lg shadow-lg p-6">
        <h2 class="text-2xl font-bold mb-4">All Custom Sections</h2>
        <div id="customSectionsList" class="space-y-3"></div>
    </div>
</div>
```

**Add JavaScript functions:**
```javascript
async function loadCustomSections() {
    const response = await fetch('/api/admin/custom-sections?property_id=1');
    const data = await response.json();
    const list = document.getElementById('customSectionsList');
    
    if (!data.sections || data.sections.length === 0) {
        list.innerHTML = '<p class="text-gray-500">No custom sections yet</p>';
        return;
    }
    
    list.innerHTML = data.sections.map(s => `
        <div class="border rounded-lg p-4">
            <div class="flex justify-between items-center">
                <div>
                    <h3 class="font-bold text-lg">
                        <i class="${s.icon_class} mr-2"></i>
                        ${s.section_name_en}
                    </h3>
                    <p class="text-sm text-gray-600">Key: ${s.section_key}</p>
                </div>
                <button onclick="deleteCustomSection(${s.section_id})" class="bg-red-100 text-red-700 px-4 py-2 rounded hover:bg-red-200">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

document.getElementById('addCustomSectionForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
        property_id: 1,
        section_key: document.getElementById('sectionKey').value,
        section_name_en: document.getElementById('sectionNameEn').value,
        icon_class: document.getElementById('sectionIcon').value,
        color_class: document.getElementById('sectionColor').value,
        display_order: parseInt(document.getElementById('sectionOrder').value),
        is_visible: 1
    };
    
    const response = await fetch('/api/admin/custom-sections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    
    if (response.ok) {
        alert('Custom section created!');
        loadCustomSections();
        e.target.reset();
    }
});
```

### Task 5: Update Hotel Offerings to Link Custom Sections

**Modify offerings creation form** (line ~5400):

Add dropdown to select section:
```html
<select id="offeringSection" class="px-4 py-2 border rounded-lg">
    <option value="">Select Section...</option>
    <option value="restaurant">Restaurants</option>
    <option value="event">Events</option>
    <option value="spa">Spa</option>
    <option value="service">Services</option>
    <!-- Dynamically add custom sections here -->
</select>
```

Update API call to include custom_section_key.

### Task 6: Homepage Dynamic Rendering

**Update `renderContent()` function** (line 3074):

```javascript
async function renderContent() {
    // Fetch custom sections
    const customSectionsResponse = await fetch(`/api/admin/custom-sections?property_id=${propertyData.property_id}`);
    const customSectionsData = await customSectionsResponse.json();
    const customSections = customSectionsData.sections || [];
    
    // Build section order including custom sections
    const defaultOrder = ['restaurants', 'events', 'spa', 'service', 'activities'];
    const customSectionKeys = customSections.map(s => s.section_key);
    const fullSectionOrder = [...defaultOrder, ...customSectionKeys];
    
    // Render each section
    defaultOrder.forEach(key => {
        if (key === 'restaurants') renderRestaurants();
        if (key === 'events') renderEvents();
        if (key === 'spa') renderSpa();
        if (key === 'service') renderServices();
        if (key === 'activities') renderActivities();
    });
    
    // Render custom sections
    customSections.forEach(section => {
        renderCustomSection(section);
    });
}

function renderCustomSection(section) {
    // Filter offerings by custom_section_key
    const offerings = allOfferings.filter(o => o.custom_section_key === section.section_key);
    
    // Create section HTML dynamically
    const container = document.querySelector('.max-w-6xl.mx-auto.px-4.py-6');
    const sectionHTML = `
        <section id="${section.section_key}-section" class="mb-12">
            <h2 class="text-2xl font-bold mb-4 flex items-center">
                <i class="${section.icon_class} text-${section.color_class}-500 mr-3"></i>
                ${section[`section_name_${currentLanguage}`] || section.section_name_en}
            </h2>
            <div id="${section.section_key}-grid" class="grid grid-cols-1 md:grid-cols-2 gap-4">
                ${offerings.map(o => `<!-- Render offering card -->`).join('')}
            </div>
        </section>
    `;
    container.insertAdjacentHTML('beforeend', sectionHTML);
}
```

### Task 7: Update Section Ordering

**Update `renderSectionOrder()` in admin panel** (line 6486):

```javascript
async function renderSectionOrder(order) {
    // Fetch custom sections
    const response = await fetch('/api/admin/custom-sections?property_id=1');
    const data = await response.json();
    const customSections = data.sections || [];
    
    const sectionNames = {
        'restaurants': '🍽️ Restaurants',
        'events': '📅 Events',
        'spa': '💆 Spa & Wellness',
        'service': '🛎️ Hotel Services',
        'activities': '🎯 Activities & Experiences'
    };
    
    // Add custom sections to names
    customSections.forEach(s => {
        sectionNames[s.section_key] = `${getIconEmoji(s.icon_class)} ${s.section_name_en}`;
    });
    
    // Rest of rendering logic...
}
```

## 🚀 DEPLOYMENT STEPS

1. **Apply migration** (Already done ✅)
2. **Rebuild project**: `npm run build`
3. **Restart service**: `pm2 restart webapp`
4. **Test custom sections**:
   - Login to admin panel
   - Go to "Custom Sections" tab
   - Add new section (e.g., "Pool Bar", "Kids Club")
   - Add offerings linked to that section
   - View on homepage

## 📊 CURRENT STATUS

- **Database**: ✅ Ready
- **Backend APIs**: ✅ Complete
- **Frontend Translations**: ⚠️ Needs implementation
- **Admin UI**: ⚠️ Needs implementation
- **Homepage Rendering**: ⚠️ Needs implementation

**Estimated Time to Complete**: 2-3 hours of focused development

This is a major feature requiring careful implementation across database, backend, and frontend layers.
