export const PERMISSIONS = {
  VIEW_ALL: 'view_all',
  INSTRUMENT_CREATE: 'instrument_create',
  INSTRUMENT_EDIT: 'instrument_edit',
  DOCUMENT_UPLOAD: 'document_upload',
  INTEGRITY_RUN: 'integrity_run',
  FINDING_REVIEW: 'finding_review',
  EVIDENCE_REVIEW: 'evidence_review',
  EVIDENCE_CONFIRM: 'evidence_confirm',
  VERIFICATION_DECIDE: 'verification_decide',
  LIFECYCLE_REQUEST: 'lifecycle_request',
  LIFECYCLE_REVIEW: 'lifecycle_review',
  LIFECYCLE_APPROVE: 'lifecycle_approve',
  DEADLINE_MANAGE: 'deadline_manage',
  EXPORT: 'export',
  SETTINGS_MANAGE: 'settings_manage',
  RESET_DEMO: 'reset_demo',
  SCENARIO_RUN: 'scenario_run',
  INSTITUTION_MANAGE: 'institution_manage',
}

export const ROLES = {
  admin: {
    key: 'admin',
    label: 'AICTE Administrator',
    shortLabel: 'Administrator',
    description:
      'Cross-institution oversight, configuration, and full lifecycle authority in the demo.',
    permissions: Object.values(PERMISSIONS),
  },
  officer: {
    key: 'officer',
    label: 'Institution Officer',
    shortLabel: 'Institution Officer',
    description:
      'Registers instruments for an assigned institution and responds to correction requests.',
    permissions: [
      PERMISSIONS.INSTRUMENT_CREATE,
      PERMISSIONS.INSTRUMENT_EDIT,
      PERMISSIONS.DOCUMENT_UPLOAD,
      PERMISSIONS.LIFECYCLE_REQUEST,
      PERMISSIONS.EXPORT,
      PERMISSIONS.INTEGRITY_RUN,
    ],
  },
  reviewer: {
    key: 'reviewer',
    label: 'Verification Reviewer',
    shortLabel: 'Reviewer',
    description:
      'Reviews integrity findings, evidence, verification cases, and lifecycle requests.',
    permissions: [
      PERMISSIONS.VIEW_ALL,
      PERMISSIONS.INTEGRITY_RUN,
      PERMISSIONS.FINDING_REVIEW,
      PERMISSIONS.EVIDENCE_REVIEW,
      PERMISSIONS.EVIDENCE_CONFIRM,
      PERMISSIONS.VERIFICATION_DECIDE,
      PERMISSIONS.LIFECYCLE_REVIEW,
      PERMISSIONS.DEADLINE_MANAGE,
      PERMISSIONS.EXPORT,
    ],
  },
  approver: {
    key: 'approver',
    label: 'Approving Authority',
    shortLabel: 'Approver',
    description:
      'Approves eligible releases and sensitive lifecycle decisions. Cannot edit source records.',
    permissions: [
      PERMISSIONS.VIEW_ALL,
      PERMISSIONS.LIFECYCLE_APPROVE,
      PERMISSIONS.DEADLINE_MANAGE,
      PERMISSIONS.EXPORT,
    ],
  },
  auditor: {
    key: 'auditor',
    label: 'Auditor',
    shortLabel: 'Auditor',
    description: 'Read-only access to records, evidence, reports, and the audit history.',
    permissions: [PERMISSIONS.VIEW_ALL, PERMISSIONS.EXPORT],
  },
}

export const ROLE_ORDER = ['admin', 'officer', 'reviewer', 'approver', 'auditor']

export function can(roleKey, permission) {
  const role = ROLES[roleKey]
  if (!role) return false
  return role.permissions.includes(permission)
}

export function roleLabel(roleKey) {
  return ROLES[roleKey]?.label ?? 'Unknown role'
}

export const USERS = [
  {
    id: 'u-admin',
    name: 'Aarav Menon',
    role: 'admin',
    title: 'Programme Director, AICTE',
    institutionId: null,
    email: 'aarav.menon@aicte.demo',
  },
  {
    id: 'u-officer1',
    name: 'Rohan Deshpande',
    role: 'officer',
    title: 'Finance Officer',
    institutionId: 'INST-1001',
    email: 'rohan.d@deccan.demo',
  },
  {
    id: 'u-officer2',
    name: 'Meera Iyer',
    role: 'officer',
    title: 'Accounts Officer',
    institutionId: 'INST-1003',
    email: 'meera.iyer@coromandel.demo',
  },
  {
    id: 'u-rev1',
    name: 'Devansh Kulkarni',
    role: 'reviewer',
    title: 'Senior Verification Reviewer',
    institutionId: null,
    email: 'devansh.k@fdr.demo',
  },
  {
    id: 'u-rev2',
    name: 'Nandini Bose',
    role: 'reviewer',
    title: 'Verification Reviewer',
    institutionId: null,
    email: 'nandini.b@fdr.demo',
  },
  {
    id: 'u-approver',
    name: 'Priya Raghunathan',
    role: 'approver',
    title: 'Approving Authority, AICTE',
    institutionId: null,
    email: 'priya.r@aicte.demo',
  },
  {
    id: 'u-auditor',
    name: 'Kabir Sethi',
    role: 'auditor',
    title: 'Internal Auditor',
    institutionId: null,
    email: 'kabir.sethi@audit.demo',
  },
]

export const REVIEWERS = USERS.filter((user) => user.role === 'reviewer')

export function getUserById(id) {
  return USERS.find((user) => user.id === id) ?? null
}

export function getDemoUserForRole(roleKey) {
  return USERS.find((user) => user.role === roleKey) ?? USERS[0]
}
