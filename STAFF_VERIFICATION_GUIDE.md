# Staff Verification Guide - QR + Face Recognition Scanner

## 🎯 Staff Scanner URLs for Production

### **Primary Scanner: QR + Face Recognition (Unified)**
**URL**: https://31b2897e.project-c8738f5c.pages.dev/staff/verify-pass

**Purpose**: Complete guest verification with both QR code scanning and facial recognition in one unified interface.

**Features**:
- ✅ **Step 1**: Scan guest's QR code
- ✅ **Step 2**: Verify guest's face matches enrollment
- ✅ **Real-time verification**: Instant pass validation
- ✅ **Security**: Rotating QR codes + biometric matching
- ✅ **Audit trail**: All verifications logged with timestamp
- ✅ **Mobile-optimized**: Works on tablets and smartphones

---

### **Alternative: Face-Only Scanner**
**URL**: https://31b2897e.project-c8738f5c.pages.dev/staff-face-scanner

**Purpose**: Quick facial recognition check without QR code (for guests who prefer face-only verification).

**Features**:
- ✅ **No QR needed**: Just scan guest face
- ✅ **Face matching**: Instant face recognition against enrolled guests
- ✅ **Fallback option**: If face doesn't match, staff can check QR code
- ✅ **Fast check-in**: One-step verification

---

## 📱 How Staff Use the Scanner

### **Unified QR + Face Scanner** (Recommended)

#### **Step-by-Step Process**:

1. **Open Scanner**:
   - Navigate to: https://31b2897e.project-c8738f5c.pages.dev/staff/verify-pass
   - Staff sees "Staff Pass Verification - Facial Recognition"

2. **Scan QR Code** (Step 1):
   - Guest shows their digital pass on phone
   - Staff points device camera at QR code
   - System automatically scans and validates pass
   - Shows: Pass details, guest name, tier, validity dates

3. **Verify Face** (Step 2):
   - If guest has enrolled face biometrics:
     - Staff points camera at guest's face
     - System captures face and matches against enrollment
     - Shows match score and verification result
   - If guest hasn't enrolled face:
     - System shows "No face enrolled"
     - QR verification alone is sufficient

4. **Verification Result**:
   - ✅ **Success**: Green checkmark, "Guest Verified"
   - ❌ **Failed**: Red X with reason (expired pass, face mismatch, etc.)
   - 📊 **Logged**: All verifications saved to audit trail

---

### **Face-Only Scanner** (Alternative)

#### **Step-by-Step Process**:

1. **Open Scanner**:
   - Navigate to: https://31b2897e.project-c8738f5c.pages.dev/staff-face-scanner
   - Staff sees "Face Check-In Scanner"

2. **Scan Face**:
   - Staff points camera at guest's face
   - System searches all enrolled faces in database
   - Matches against enrolled guests

3. **Verification Result**:
   - ✅ **Match Found**: Shows guest name, pass details, tier
   - ❌ **No Match**: "Face does not match any enrolled guest. Please check QR code."

---

## 🔒 Security Features

### **Rotating QR Codes**
- Each digital pass has a unique `qr_secret`
- QR codes can be rotated/regenerated if compromised
- Time-based validation (valid_from to valid_until dates)

### **Biometric Matching**
- Face embeddings stored securely in database
- Match threshold: Configurable (typically 0.6-0.7 similarity)
- GDPR/BIPA compliant: Guest consent required and logged

### **Audit Trail**
All verifications logged with:
- Timestamp
- Staff member ID
- Verification method (QR, Face, or Both)
- Match score (for face verification)
- Pass ID and guest details
- Location/device information

---

## 📊 Verification Workflow

```
Guest arrives at venue
    ↓
Staff opens scanner on tablet/phone
    ↓
┌─────────────────────────────────┐
│  UNIFIED SCANNER (Recommended)  │
├─────────────────────────────────┤
│ Step 1: Scan QR Code            │
│  → Validates pass status        │
│  → Shows guest details          │
│                                 │
│ Step 2: Verify Face (if enrolled) │
│  → Captures face photo          │
│  → Matches against enrollment   │
│  → Shows match score            │
└─────────────────────────────────┘
    ↓
✅ Verification Result
    ↓
Guest granted access / denied entry
    ↓
Audit log created automatically
```

---

## 🎨 Guest Digital Pass Display

When guests receive their pass, they can view it at:
**Format**: https://31b2897e.project-c8738f5c.pages.dev/guest-pass/[PASS_REFERENCE]

**Example**: https://31b2897e.project-c8738f5c.pages.dev/guest-pass/PASS-1734567890-ABC123

### **What Guests See**:
- 📱 **Large QR Code**: For staff scanning
- 👤 **Face Status**: "Active" or "Not Enrolled"
- 🎫 **Pass Details**: Name, tier, validity dates
- 👨‍👩‍👧‍👦 **Family Members**: List with individual face status
- 🍎 **Apple Wallet Button**: Add to Apple Wallet
- 🤖 **Google Pay Button**: Add to Google Pay
- ⚙️ **Self-Service Portal Link**: Manage preferences

---

## 🔧 Staff Requirements

### **Device Requirements**:
- **Camera access**: For QR scanning and face capture
- **Modern browser**: Chrome, Safari, Edge (latest versions)
- **Internet connection**: For real-time verification
- **Screen size**: Works on tablets, smartphones, laptops

### **Permissions Required**:
- Staff must be logged into admin dashboard
- Must have `all_inclusive_verify` permission
- Device camera permissions granted in browser

---

## 📞 Staff Training Points

### **Key Points to Remember**:
1. ✅ **Always scan QR first** (in unified scanner)
2. ✅ **Face verification is optional** (only if guest enrolled)
3. ✅ **Check validity dates** (system shows expired passes in red)
4. ✅ **Match score > 0.6** = Good match (configurable)
5. ✅ **Manual override available** (for legitimate edge cases)
6. ✅ **Privacy**: Guest can withdraw biometric consent anytime

### **Common Scenarios**:

**Scenario 1: Guest with QR + Face enrolled**
- Scan QR → Verify Face → Both must pass → Grant access

**Scenario 2: Guest with QR only (no face enrolled)**
- Scan QR → Pass valid → Grant access (face verification skipped)

**Scenario 3: Guest prefers face-only verification**
- Use face-only scanner → Match found → Grant access

**Scenario 4: Pass expired**
- System shows red "EXPIRED" badge → Deny access → Direct to front desk

**Scenario 5: Face doesn't match**
- QR valid but face mismatch → Manual review → Check guest ID → Override if legitimate

---

## 🆘 Troubleshooting

### **QR Code Won't Scan**:
- ✅ Ensure good lighting
- ✅ Hold camera steady
- ✅ Check guest phone screen brightness
- ✅ Try face-only scanner as backup

### **Face Won't Capture**:
- ✅ Ask guest to look directly at camera
- ✅ Remove sunglasses/hat if worn
- ✅ Ensure good lighting on face
- ✅ Try multiple angles
- ✅ Fall back to QR-only verification

### **System Says "No Match"**:
- ✅ Check if guest has enrolled face (show enrollment status)
- ✅ Verify pass hasn't expired
- ✅ Check if guest withdrew biometric consent
- ✅ Manual verification available for staff

---

## 📈 Admin Dashboard Access

**Admin Dashboard**: https://31b2897e.project-c8738f5c.pages.dev/admin/dashboard
**Login**: admin@paradiseresort.com / admin123

### **Staff Can**:
- View all digital passes
- Issue new passes
- Deactivate passes
- View verification analytics
- Check face match scores
- Export audit logs
- Manage guest consent

---

## 🔗 Quick Reference Links

| Purpose | URL |
|---------|-----|
| **Unified QR + Face Scanner** | https://31b2897e.project-c8738f5c.pages.dev/staff/verify-pass |
| **Face-Only Scanner** | https://31b2897e.project-c8738f5c.pages.dev/staff-face-scanner |
| **Admin Dashboard** | https://31b2897e.project-c8738f5c.pages.dev/admin/dashboard |
| **Guest Pass Example** | https://31b2897e.project-c8738f5c.pages.dev/guest-pass/[REFERENCE] |
| **Guest Self-Service Portal** | https://31b2897e.project-c8738f5c.pages.dev/guest-portal.html |
| **GDPR Compliance Info** | https://31b2897e.project-c8738f5c.pages.dev/biometric-compliance |

---

## 📱 Recommended Setup

### **For Restaurant/Bar Entry Points**:
- **Mount tablet at entrance** with unified QR + Face scanner
- Staff member monitors verification results
- Both QR and face required for high-security areas

### **For Beach/Pool Entry**:
- **Handheld tablet/phone** with face-only scanner
- Quick face recognition for returning guests
- QR fallback for new guests

### **For VIP Areas**:
- **Unified scanner** with both QR + Face mandatory
- Higher match threshold (0.7+)
- Manual review for any failures

---

## 🎓 Next Steps

1. **Train staff** on unified scanner usage
2. **Test with real guests** in controlled environment
3. **Monitor verification analytics** in admin dashboard
4. **Adjust match thresholds** based on real-world results
5. **Collect staff feedback** for improvements

---

**Questions or Issues?**
Contact system administrator or refer to TROUBLESHOOTING.md
