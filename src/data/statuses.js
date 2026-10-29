export const LIFECYCLE_LABELS = {
  submitted: 'Submitted',
  scrutiny: 'Under Scrutiny',
  verification_pending: 'Verification Pending',
  verified: 'Verified',
  discrepancy: 'Discrepancy Found',
  renewal_due: 'Renewal Due',
  renewal_pending: 'Renewal Pending Verification',
  renewed: 'Renewed',
  replacement_pending: 'Replacement Pending Verification',
  replaced: 'Replaced',
  release_requested: 'Release Requested',
  release_review: 'Release Under Review',
  released: 'Released',
  rejected: 'Rejected',
  returned: 'Returned for Correction',
}

export const LIFECYCLE_SHORT_LABELS = {
  ...LIFECYCLE_LABELS,
  verification_pending: 'Verification pending',
  discrepancy: 'Discrepancy',
  renewal_pending: 'Renewal pending',
  replacement_pending: 'Replacement pending',
  release_review: 'Release review',
  returned: 'Returned',
}

export const LIFECYCLE_TONE = {
  submitted: 'neutral',
  scrutiny: 'info',
  verification_pending: 'warning',
  verified: 'success',
  discrepancy: 'critical',
  renewal_due: 'warning',
  renewal_pending: 'warning',
  renewed: 'success',
  replacement_pending: 'warning',
  replaced: 'success',
  release_requested: 'info',
  release_review: 'warning',
  released: 'success',
  rejected: 'critical',
  returned: 'critical',
}

export const VERIFICATION_LABELS = {
  unverified: 'Unverified',
  internal_passed: 'Internal checks passed',
  confirmation_pending: 'Confirmation pending',
  partially_confirmed: 'Partially confirmed',
  confirmed: 'Confirmed (demo)',
  discrepancy: 'Discrepancy',
}

export const VERIFICATION_SHORT_LABELS = {
  ...VERIFICATION_LABELS,
  internal_passed: 'Internal passed',
  confirmation_pending: 'Pending',
  confirmed: 'Demo confirmed',
}

export const VERIFICATION_TONE = {
  unverified: 'neutral',
  internal_passed: 'info',
  confirmation_pending: 'warning',
  partially_confirmed: 'warning',
  confirmed: 'success',
  discrepancy: 'critical',
}

export const INTEGRITY_LABELS = {
  clear: 'No conflict',
  attention: 'Attention',
  conflict: 'Potential conflict',
  unanalyzed: 'Not analyzed',
}

export const INTEGRITY_TONE = {
  clear: 'success',
  attention: 'warning',
  conflict: 'critical',
  unanalyzed: 'neutral',
}

export const SEVERITY_LABELS = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
}

export const SEVERITY_TONE = {
  critical: 'critical',
  high: 'critical',
  medium: 'warning',
  low: 'neutral',
}

export const FINDING_CATEGORY_LABELS = {
  potential_duplicate: 'Potential duplicate',
  cross_institution_conflict: 'Cross-institution reference conflict',
  amount_discrepancy: 'Amount discrepancy',
  date_inconsistency: 'Date inconsistency',
  ocr_ambiguity: 'OCR ambiguity',
  missing_information: 'Missing information',
  invalid_reference: 'Invalid reference format',
  extraction_mismatch: 'Extraction mismatch',
  unverified_instrument: 'Unverified instrument',
  lifecycle_policy_violation: 'Lifecycle policy violation',
}

export const FINDING_STATUS_LABELS = {
  open: 'Unreviewed',
  in_review: 'In review',
  confirmed: 'Confirmed discrepancy',
  resolved: 'Resolved',
  false_positive: 'False positive',
}

export const FINDING_STATUS_TONE = {
  open: 'critical',
  in_review: 'warning',
  confirmed: 'critical',
  resolved: 'success',
  false_positive: 'neutral',
}

export const FINDING_DECISIONS = {
  confirmed_discrepancy: 'Confirmed discrepancy',
  potential_false_positive: 'Potential false positive',
  additional_verification: 'Additional verification required',
  resolved_after_correction: 'Resolved after correction',
}

export const EVIDENCE_STATUS_LABELS = {
  institution_submitted: 'Institution submitted',
  ocr_extracted: 'OCR extracted',
  internally_consistent: 'Internally consistent',
  confirmation_pending: 'Independent confirmation pending',
  independently_confirmed: 'Independently confirmed (demo)',
  discrepancy: 'Discrepancy detected',
  reviewed: 'Reviewed by authorized reviewer',
  missing: 'Missing',
}

export const EVIDENCE_STATUS_TONE = {
  institution_submitted: 'neutral',
  ocr_extracted: 'info',
  internally_consistent: 'info',
  confirmation_pending: 'warning',
  independently_confirmed: 'success',
  discrepancy: 'critical',
  reviewed: 'success',
  missing: 'critical',
}

export const PRIORITY_LABELS = {
  overdue: 'Overdue',
  critical: 'Critical',
  due_soon: 'Due soon',
  upcoming: 'Upcoming',
  completed: 'Completed',
}

export const PRIORITY_TONE = {
  overdue: 'critical',
  critical: 'critical',
  due_soon: 'warning',
  upcoming: 'info',
  completed: 'success',
}

export const DEADLINE_TYPE_LABELS = {
  maturity: 'FDR maturity',
  renewal: 'Renewal action',
  verification: 'Verification action',
  finding: 'Integrity finding',
  release: 'Release decision',
  evidence: 'Evidence follow-up',
  approval: 'Approval pending',
}

export const NOTIFICATION_TONE = {
  critical: 'critical',
  warning: 'warning',
  info: 'info',
  success: 'success',
}

export const INSTITUTION_STATUS_TONE = {
  active: 'success',
  attention: 'warning',
  under_review: 'info',
  probation: 'critical',
}

export const ROLE_TONE = {
  admin: 'copper',
  officer: 'info',
  reviewer: 'success',
  approver: 'copper',
  auditor: 'neutral',
}
