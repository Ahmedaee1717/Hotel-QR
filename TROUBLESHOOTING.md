# Troubleshooting Guide - Digital Pass Creation Issue

## Issue: 500 Internal Server Error When Creating Digital Pass

### Problem Description
When trying to create a digital pass from the admin dashboard in production, the POST request to `/api/admin/all-inclusive/passes` returns a 500 Internal Server Error.

### Root Cause
The production database was missing the required tables for the all-inclusive digital pass system:
- `all_inclusive_tiers`
- `digital_passes` 
- `pass_family_members`

### Solution Applied
We manually created the minimal required schema in production:

```sql
-- Created all_inclusive_tiers with 4 default tiers (Standard, Premium, VIP, Diamond)
-- Created digital_passes with QR + Face Recognition fields
-- Created pass_family_members for family tracking
```

### Verification Steps Completed
✅ **Properties exist**: Paradise Resort & Spa (property_id: 1)  
✅ **Tiers exist**: 4 tiers created (Standard, Premium, VIP, Diamond)  
✅ **Admin user exists**: admin@paradiseresort.com (user_id: 1, property_id: 1)  
✅ **Guest-pass route working**: HTML page loads correctly  
✅ **Guest-portal route working**: HTML page accessible  
✅ **Missing columns added**: guest_access_token, verification_preference, qr_code_displayed

### Current Status
- **Database Schema**: ✅ Applied
- **Routes**: ✅ Working
- **Authentication**: ✅ Admin user exists
- **Frontend**: ✅ HTML pages load

### Testing Required
Please test the following in production:

1. **Login to Admin Dashboard**:
   - URL: https://31b2897e.project-c8738f5c.pages.dev/admin/dashboard
   - Email: admin@paradiseresort.com
   - Password: admin123

2. **Create a Digital Pass**:
   - Navigate to "All-Inclusive" section
   - Click "Issue New Pass"
   - Fill in the form:
     - Primary Guest Name: Test Guest
     - Email: test@example.com
     - Phone: (optional)
     - Room Number: 101
     - Tier: Select any tier
     - Adults: 2
     - Children: 0
     - Valid From: Today's date
     - Valid Until: 7 days from now
   - Click "Issue Pass"

3. **Expected Result**:
   - A success modal should appear with "Digital Pass Issued!"
   - You'll see the pass reference (e.g., PASS-1234567890-ABCD)
   - A "Guest Digital Pass" link and "Guest Self-Service Portal" link
   - Click "View Pass (QR + Face)" to see the unified digital pass

4. **Verify Digital Pass Display**:
   - Should show a large QR code
   - Face recognition status (Not Enrolled initially)
   - Pass details (name, tier, validity dates)
   - Apple Wallet & Google Pay buttons
   - Mobile-optimized wallet-style card design

### If Still Experiencing Issues

**Possible Causes**:
1. **Session/Authentication**: Make sure you're logged in to the admin dashboard
2. **Browser Console**: Check for JavaScript errors
3. **Network Tab**: Look for failed API requests and their error messages
4. **Cloudflare Pages Logs**: The 500 error details will be in Cloudflare's logs

**Debug Steps**:
1. Open browser DevTools (F12)
2. Go to Console tab - look for errors
3. Go to Network tab - filter by "Fetch/XHR"
4. Try creating a pass and check the failed request
5. Look at the "Response" tab of the failed request for error details

**Check Cloudflare Logs**:
```bash
npx wrangler pages deployment tail --project-name project-c8738f5c
```

### Additional Notes

**Tailwind CSS Warning** (Non-Critical):
```
Using cdn.tailwindcss.com in production
```
This is a cosmetic warning and does NOT affect functionality. The CDN approach works fine. To remove the warning (optional):
- Install Tailwind as a PostCSS plugin
- Or use Tailwind CLI for build-time processing
- See: https://tailwindcss.com/docs/installation

### Contact Information
If you continue to experience issues, please provide:
1. The exact error message from the browser console
2. The failed request details from Network tab
3. Any error messages displayed in the UI

## Production URLs
- **Main App**: https://31b2897e.project-c8738f5c.pages.dev
- **Admin Dashboard**: https://31b2897e.project-c8738f5c.pages.dev/admin/dashboard
- **Example Pass**: https://31b2897e.project-c8738f5c.pages.dev/guest-pass/[PASS_REFERENCE]
- **Example Portal**: https://31b2897e.project-c8738f5c.pages.dev/guest-portal.html?pass=[PASS_REF]&token=[TOKEN]

## Technical Details

### Database Schema Applied
- **all_inclusive_tiers**: Tier definitions (Standard, Premium, VIP, Diamond)
- **digital_passes**: Core pass data with QR secret, face embedding, biometric consent
- **pass_family_members**: Family member tracking with individual face data

### Key Fields for QR + Face Integration
- `qr_secret`: Rotating secret for QR code generation
- `face_embedding`: Vector for facial recognition matching
- `face_photo_url`: Reference photo for enrollment
- `biometric_consent_given`: GDPR/BIPA compliance flag
- `verification_preference`: 'qr', 'face', or 'both'
