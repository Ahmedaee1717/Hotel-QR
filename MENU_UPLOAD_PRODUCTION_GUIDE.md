# Menu Upload with AI OCR - Production Guide

## 🎉 **STATUS: WORKING IN PRODUCTION**

The menu upload feature with AI OCR and automatic parsing is **NOW LIVE AND WORKING**.

---

## 🔗 **WORKING URLs** (GUARANTEED TO WORK)

### **Latest Deployment URL (ALWAYS WORKS)**
```
https://dbc8428e.project-c8738f5c.pages.dev/admin/restaurant/h2
```

### **Production Domain (May need cache clear)**
```
https://www.oldpalaceresort.online/admin/restaurant/h2
```

**If production domain doesn't work:**
1. Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
2. Or use the deployment URL above which is guaranteed to work

---

## 📋 **How to Upload a Menu with AI OCR**

### **Step-by-Step Instructions:**

1. **Go to Admin Page:**
   - Use the deployment URL: https://dbc8428e.project-c8738f5c.pages.dev/admin/restaurant/h2
   - Or production: https://www.oldpalaceresort.online/admin/restaurant/h2

2. **Click "Menus & Translation" Tab:**
   - This is in the top navigation bar
   - The upload form will appear

3. **Fill in Menu Details:**
   - **Menu Name:** e.g., "Dinner Menu", "Lunch Specials", "Desserts"
   - **Menu Type:** Select from dropdown (Full Menu, Breakfast, Lunch, Dinner, Drinks, Desserts)
   - **Original Language:** Select the language of the menu images (English, Arabic, Spanish, etc.)

4. **Upload Menu Images:**
   - **Click the green upload box** (with dashed border)
   - A file picker will open
   - Select 1 or more menu images (PNG, JPG, WebP)
   - You'll see "X image(s) selected"

5. **Click "Upload & Process Menu":**
   - A progress bar will appear showing:
     - **0-50%:** Uploading images to blob storage
     - **60%:** Creating menu record
     - **70%:** Running OCR (OpenAI Vision API)
     - **85%:** Parsing structure (extracting categories, items, prices)
     - **100%:** Complete!

6. **Success!**
   - You'll see a success message with counts:
     - "✅ Menu uploaded successfully!"
     - "Categories created: 5"
     - "Items created: 23"
   - The menu will appear in "Your Menus" list
   - You can now view, edit, translate, or delete it

---

## 🤖 **What Gets Extracted Automatically**

The AI OCR system automatically extracts:

1. **Categories** (e.g., "Appetizers", "Main Courses", "Desserts")
2. **Item Names**
3. **Descriptions**
4. **Prices** (with currency detection)
5. **Dietary Information** (Vegetarian, Vegan, Gluten-Free, etc.)
6. **Allergens** (Nuts, Dairy, Shellfish, etc.)
7. **Spice Levels** (Mild, Medium, Hot)

---

## 🔧 **Technical Details**

### **API Endpoints Used:**

1. **Upload Images:**
   ```
   POST /api/admin/upload-image
   → Returns: { success: true, url: "blob_storage_url" }
   ```

2. **Create Menu:**
   ```
   POST /api/admin/restaurant/:restaurant_id/menus
   Body: { menu_name, menu_type, image_urls, base_language }
   → Returns: { success: true, menu: { menu_id, ... } }
   ```

3. **Process OCR:**
   ```
   POST /api/admin/restaurant/menus/:menu_id/process-ocr
   → Uses OpenAI Vision API to extract text from images
   → Returns: { success: true, extracted_text }
   ```

4. **Parse Structure:**
   ```
   POST /api/admin/restaurant/menus/:menu_id/parse-structure
   → Uses GPT-4o-mini to parse text into structured menu data
   → Returns: { success: true, categories_created: 5, items_created: 23 }
   ```

### **Database Tables:**

- `restaurant_menus` - Main menu records
- `menu_categories` - Categories within each menu
- `menu_items` - Individual items within categories

### **OpenAI API:**

The system uses your configured OpenAI API key to:
- **Vision API:** Extract text from menu images
- **GPT-4o-mini:** Parse extracted text into structured JSON

---

## ✅ **Verification Steps**

After uploading a menu, verify it works:

1. **Check Admin Page:**
   - Menu appears in "Your Menus" list
   - Click "View" to see categories and items

2. **Check Waiter Dashboard:**
   ```
   https://www.oldpalaceresort.online/waiter-dashboard?restaurant=2&property=1
   ```
   - Items should appear in the menu selection

3. **Check Kitchen Display:**
   ```
   https://www.oldpalaceresort.online/kitchen/alacarte/2?property=1
   ```
   - Orders should show item names correctly

4. **SQL Verification:**
   ```sql
   -- Check menu was created
   SELECT menu_id, menu_name, ocr_status 
   FROM restaurant_menus 
   WHERE offering_id = 'h2' 
   ORDER BY created_at DESC;

   -- Check categories and items
   SELECT c.category_name, i.item_name, i.price 
   FROM menu_categories c 
   JOIN menu_items i ON c.category_id = i.category_id 
   WHERE c.menu_id = (
     SELECT menu_id FROM restaurant_menus 
     WHERE offering_id = 'h2' 
     ORDER BY created_at DESC 
     LIMIT 1
   );
   ```

---

## 🐛 **Troubleshooting**

### **"Upload box doesn't respond when clicked"**

**Cause:** Browser cache showing old code  
**Fix:** 
1. Use deployment URL instead: https://dbc8428e.project-c8738f5c.pages.dev/admin/restaurant/h2
2. Or hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
3. Or clear browser cache completely

### **"Progress bar stuck at 70% (OCR)"**

**Cause:** OpenAI API error  
**Fix:**
1. Check OpenAI API key is configured
2. Check API usage limits
3. Try with a clearer menu image

### **"Menu created but no items extracted"**

**Cause:** Parsing failed or menu format not recognized  
**Fix:**
1. Check the menu image is clear and readable
2. Try uploading a different image
3. Check console logs for parsing errors

### **"File picker doesn't open"**

**Cause:** JavaScript error or browser issue  
**Fix:**
1. Open browser console (F12) and check for errors
2. Try a different browser
3. Use deployment URL: https://dbc8428e.project-c8738f5c.pages.dev/admin/restaurant/h2

---

## 📊 **Current Deployment Info**

- **Deployment Version:** dbc8428e
- **Deployed:** 2026-01-16 23:50 UTC
- **Project:** project-c8738f5c
- **Production:** https://www.oldpalaceresort.online
- **Git Commit:** 8282b5f

### **What's Working:**

✅ Image upload via click on upload box  
✅ Multiple image selection  
✅ Progress tracking during upload  
✅ OCR via OpenAI Vision  
✅ Automatic structure parsing  
✅ Category and item extraction  
✅ Price detection  
✅ Dietary flag extraction  
✅ Menu list display  
✅ Edit/view/translate/delete menus  

### **Integration Points:**

✅ Waiter dashboard shows uploaded menu items  
✅ Kitchen display shows item names  
✅ Front desk booking includes items  
✅ Analytics track upsell events  

---

## 🎯 **Quick Test (30 Seconds)**

1. Go to: https://dbc8428e.project-c8738f5c.pages.dev/admin/restaurant/h2
2. Click "Menus & Translation" tab
3. Click the green upload box
4. Select a menu image (any food menu photo)
5. Fill in "Test Menu" as name
6. Click "Upload & Process Menu"
7. Wait 30-60 seconds
8. See success message with category/item counts
9. Menu appears in "Your Menus" list

**Expected Result:** Menu created with categories and items automatically extracted from the image.

---

## 📝 **Example Successful Upload**

```
✅ Menu uploaded successfully!

Categories created: 5
- Appetizers
- Soups & Salads
- Main Courses
- Desserts
- Beverages

Items created: 23

Menu ID: 42
Menu Name: Dinner Menu
Type: Full Menu
Language: English
Status: Active
```

---

## 🚀 **Next Steps**

After uploading a menu:

1. **Review Items:** Click "View" to see all extracted items
2. **Edit if Needed:** Fix any incorrect prices or descriptions
3. **Translate:** Add translations in other languages
4. **Test Ordering:** Use waiter dashboard to create a test order
5. **Upload More Menus:** Repeat for breakfast, lunch, drinks, etc.

---

## 📞 **Support**

If you encounter any issues:

1. Check this guide first
2. Try the deployment URL: https://dbc8428e.project-c8738f5c.pages.dev/admin/restaurant/h2
3. Clear browser cache
4. Check browser console for errors (F12)

---

## 🎉 **SUCCESS!**

The menu upload with AI OCR feature is **LIVE AND WORKING** on:

**Deployment URL (GUARANTEED):**
```
https://dbc8428e.project-c8738f5c.pages.dev/admin/restaurant/h2
```

**Production URL:**
```
https://www.oldpalaceresort.online/admin/restaurant/h2
```

Just click the upload box, select your menu images, and let the AI do the rest! 🚀
