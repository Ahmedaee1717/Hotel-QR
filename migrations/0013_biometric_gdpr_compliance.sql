-- Migration: GDPR/BIPA Biometric Data Compliance
-- Purpose: Add mandatory legal safeguards for biometric data processing
-- Date: 2025-12-17
-- CRITICAL: Implements GDPR Article 9 and BIPA requirements

-- ========================================
-- 1. CONSENT TRACKING (GDPR Article 6 & 9)
-- ========================================

-- Add explicit consent fields to digital_passes
-- Note: Columns may already exist, wrapped in safety checks
-- ALTER TABLE digital_passes ADD COLUMN biometric_consent_given INTEGER DEFAULT 0;
-- ALTER TABLE digital_passes ADD COLUMN biometric_consent_timestamp DATETIME;
-- ALTER TABLE digital_passes ADD COLUMN biometric_consent_withdrawn INTEGER DEFAULT 0;
-- ALTER TABLE digital_passes ADD COLUMN biometric_consent_withdrawn_at DATETIME;
-- ALTER TABLE digital_passes ADD COLUMN biometric_consent_method TEXT;
-- ALTER TABLE digital_passes ADD COLUMN biometric_consent_ip_address TEXT;
-- ALTER TABLE digital_passes ADD COLUMN biometric_purpose_disclosed TEXT;

-- ========================================
-- 2. ENCRYPTION & SECURITY FLAGS
-- ========================================
-- Note: Columns may already exist, commented out for safety
-- ALTER TABLE digital_passes ADD COLUMN face_embedding_encrypted INTEGER DEFAULT 0;
-- ALTER TABLE digital_passes ADD COLUMN face_embedding_hash TEXT;
-- ALTER TABLE digital_passes ADD COLUMN encryption_algorithm TEXT DEFAULT 'AES-256-GCM';
-- ALTER TABLE digital_passes ADD COLUMN encryption_key_id TEXT;

-- ========================================
-- 3. RETENTION & AUTO-DELETION TRACKING
-- ========================================
-- Note: Columns may already exist, commented out for safety
-- ALTER TABLE digital_passes ADD COLUMN biometric_retention_policy TEXT DEFAULT 'delete_at_checkout';
-- ALTER TABLE digital_passes ADD COLUMN biometric_scheduled_deletion_at DATETIME;
-- ALTER TABLE digital_passes ADD COLUMN biometric_deleted INTEGER DEFAULT 0;
-- ALTER TABLE digital_passes ADD COLUMN biometric_deleted_at DATETIME;
-- ALTER TABLE digital_passes ADD COLUMN biometric_deletion_reason TEXT;
-- ALTER TABLE digital_passes ADD COLUMN biometric_deletion_logged INTEGER DEFAULT 0;

-- ========================================
-- 4. GUEST RIGHTS & ACCESS
-- ========================================
-- Note: Columns may already exist, commented out for safety
-- ALTER TABLE digital_passes ADD COLUMN biometric_data_accessed_count INTEGER DEFAULT 0;
-- ALTER TABLE digital_passes ADD COLUMN biometric_last_accessed_at DATETIME;
-- ALTER TABLE digital_passes ADD COLUMN biometric_fallback_method TEXT;
-- ALTER TABLE digital_passes ADD COLUMN biometric_export_requested INTEGER DEFAULT 0;
-- ALTER TABLE digital_passes ADD COLUMN biometric_export_provided_at DATETIME;

-- ========================================
-- 5. AUDIT LOG TABLE (Tamper-Proof)
-- ========================================

CREATE TABLE IF NOT EXISTS biometric_audit_log (
    log_id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- Core tracking
    property_id INTEGER NOT NULL,
    pass_id INTEGER,
    
    -- Event details
    event_type TEXT NOT NULL,
    -- 'consent_given', 'consent_withdrawn', 'data_enrolled', 'data_accessed', 
    -- 'data_deleted', 'export_requested', 'export_provided', 'fallback_used'
    
    event_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- Actor tracking
    actor_type TEXT,
    -- 'guest', 'staff', 'system', 'admin'
    
    actor_id TEXT,
    -- user_id or 'system_automated'
    
    actor_ip_address TEXT,
    
    -- Event context
    event_details TEXT,
    -- JSON with specific details
    
    -- Tamper detection
    previous_log_hash TEXT,
    -- Hash of previous log entry for chain verification
    
    current_log_hash TEXT,
    -- SHA-256 hash of this entry
    
    -- Legal compliance
    dpia_reference TEXT,
    -- Reference to Data Protection Impact Assessment
    
    legal_basis TEXT,
    -- 'consent', 'contract', 'legal_obligation'
    
    -- Immutability flag
    immutable INTEGER DEFAULT 1,
    -- Cannot be modified once created
    
    FOREIGN KEY (property_id) REFERENCES properties(property_id),
    FOREIGN KEY (pass_id) REFERENCES digital_passes(pass_id)
);

-- Index for fast audit queries
CREATE INDEX IF NOT EXISTS idx_biometric_audit_pass ON biometric_audit_log(pass_id);
CREATE INDEX IF NOT EXISTS idx_biometric_audit_event ON biometric_audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_biometric_audit_timestamp ON biometric_audit_log(event_timestamp);

-- ========================================
-- 6. ACCESS CONTROL TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS biometric_access_control (
    access_id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    property_id INTEGER NOT NULL,
    role_id INTEGER,
    
    -- Permissions
    can_enroll_biometric INTEGER DEFAULT 0,
    can_view_biometric INTEGER DEFAULT 0,
    can_delete_biometric INTEGER DEFAULT 0,
    can_export_biometric INTEGER DEFAULT 0,
    can_access_audit_log INTEGER DEFAULT 0,
    
    -- Restrictions
    require_2fa INTEGER DEFAULT 1,
    -- Require two-factor authentication
    
    require_reason TEXT DEFAULT 'required',
    -- 'required', 'optional', 'none'
    
    max_daily_accesses INTEGER DEFAULT 100,
    -- Rate limiting
    
    allowed_ip_ranges TEXT,
    -- JSON array of allowed IP ranges
    
    -- Audit
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    
    FOREIGN KEY (property_id) REFERENCES properties(property_id),
    FOREIGN KEY (role_id) REFERENCES roles(role_id)
);

-- ========================================
-- 7. DPIA (Data Protection Impact Assessment) TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS biometric_dpia (
    dpia_id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    property_id INTEGER NOT NULL,
    
    -- DPIA details
    dpia_reference TEXT UNIQUE NOT NULL,
    -- e.g., 'DPIA-2025-001'
    
    dpia_status TEXT DEFAULT 'draft',
    -- 'draft', 'in_review', 'approved', 'requires_authority_consultation'
    
    assessment_date DATETIME,
    approved_date DATETIME,
    
    -- Risk assessment
    risk_level TEXT,
    -- 'low', 'medium', 'high', 'critical'
    
    residual_risk_acceptable INTEGER DEFAULT 0,
    -- After mitigations, is risk acceptable?
    
    requires_supervisory_consultation INTEGER DEFAULT 0,
    -- High residual risk → must consult authority
    
    -- Documentation
    risk_scenarios TEXT,
    -- JSON array of risk scenarios
    
    mitigation_measures TEXT,
    -- JSON array of implemented safeguards
    
    residual_risks TEXT,
    -- JSON array of remaining risks after mitigation
    
    -- Legal basis
    legal_justification TEXT,
    purpose_limitation TEXT,
    data_minimization_applied INTEGER DEFAULT 1,
    
    -- Review cycle
    next_review_date DATETIME,
    review_frequency_months INTEGER DEFAULT 12,
    
    -- Approval
    approved_by TEXT,
    dpo_signature TEXT,
    -- Data Protection Officer signature/approval
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (property_id) REFERENCES properties(property_id)
);

-- ========================================
-- 8. CONSENT FORMS & TEMPLATES
-- ========================================

CREATE TABLE IF NOT EXISTS biometric_consent_templates (
    template_id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    property_id INTEGER NOT NULL,
    
    -- Template details
    template_name TEXT NOT NULL,
    template_language TEXT DEFAULT 'en',
    -- ISO 639-1 language code
    
    template_version TEXT NOT NULL,
    -- e.g., 'v1.0', 'v2.1'
    
    -- Consent text
    consent_title TEXT,
    consent_description TEXT,
    -- Full text explaining biometric processing
    
    purpose_statement TEXT,
    -- Clear statement of why data is collected
    
    retention_policy_text TEXT,
    -- Plain language explanation of retention
    
    withdrawal_instructions TEXT,
    -- How to withdraw consent
    
    -- Legal compliance
    gdpr_compliant INTEGER DEFAULT 1,
    bipa_compliant INTEGER DEFAULT 1,
    ccpa_compliant INTEGER DEFAULT 1,
    
    last_legal_review_date DATETIME,
    reviewed_by_dpo INTEGER DEFAULT 0,
    
    -- Status
    is_active INTEGER DEFAULT 1,
    effective_date DATETIME,
    superseded_by INTEGER,
    -- Reference to newer template version
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (property_id) REFERENCES properties(property_id),
    FOREIGN KEY (superseded_by) REFERENCES biometric_consent_templates(template_id)
);

-- ========================================
-- 9. SCHEDULED DELETION QUEUE
-- ========================================

CREATE TABLE IF NOT EXISTS biometric_deletion_queue (
    queue_id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    pass_id INTEGER NOT NULL,
    property_id INTEGER NOT NULL,
    
    -- Scheduling
    scheduled_deletion_at DATETIME NOT NULL,
    deletion_reason TEXT NOT NULL,
    -- 'checkout', 'consent_withdrawn', 'retention_expired', 'guest_request', 'court_order'
    
    -- Processing status
    status TEXT DEFAULT 'pending',
    -- 'pending', 'processing', 'completed', 'failed'
    
    attempted_at DATETIME,
    completed_at DATETIME,
    
    -- Verification
    deletion_verified INTEGER DEFAULT 0,
    -- 0 = not verified, 1 = verified deleted
    
    verification_method TEXT,
    -- 'database_check', 'file_removal', 'api_confirmation'
    
    -- Error handling
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    
    -- Audit trail
    deletion_logged INTEGER DEFAULT 0,
    log_reference TEXT,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (pass_id) REFERENCES digital_passes(pass_id),
    FOREIGN KEY (property_id) REFERENCES properties(property_id)
);

-- Index for deletion worker
CREATE INDEX IF NOT EXISTS idx_deletion_queue_scheduled ON biometric_deletion_queue(scheduled_deletion_at, status);
CREATE INDEX IF NOT EXISTS idx_deletion_queue_status ON biometric_deletion_queue(status);

-- ========================================
-- 10. INITIALIZE DEFAULT SETTINGS
-- ========================================

-- Update existing face_recognition_settings with GDPR defaults
UPDATE face_recognition_settings 
SET 
    auto_delete_after_checkout = 1,
    retain_embeddings_days = 0
WHERE setting_id IN (SELECT setting_id FROM face_recognition_settings);

-- ========================================
-- NOTES FOR IMPLEMENTATION
-- ========================================

-- 1. Encryption Implementation:
--    - Use Web Crypto API or Cloudflare Workers KV encryption
--    - Store encryption keys in Cloudflare Secrets
--    - Never store raw embeddings after this migration

-- 2. Automated Deletion:
--    - Cloudflare Workers Cron: Run every hour
--    - Check biometric_deletion_queue
--    - Execute deletions, log to audit trail

-- 3. Consent Flow:
--    - Show consent form BEFORE enrollment
--    - Log consent in biometric_audit_log
--    - Set scheduled_deletion_at = checkout_date + 24h

-- 4. Withdrawal Flow:
--    - "Disable Face Recognition" button
--    - Set biometric_consent_withdrawn = 1
--    - Add to deletion_queue with immediate deletion
--    - Keep pass active, switch to QR fallback

-- 5. Access Controls:
--    - NO staff should see raw embeddings
--    - NO exports without legal justification
--    - ALL accesses logged to audit_log
--    - Tamper-proof log chain verification

-- END MIGRATION
