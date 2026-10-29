import {
  LayoutDashboard,
  FileText,
  Building2,
  ShieldAlert,
  Fingerprint,
  ClipboardCheck,
  GitBranch,
  CalendarClock,
  ScrollText,
  BarChart3,
  PlayCircle,
  Settings,
} from 'lucide-react'

export const NAV_GROUPS = [
  {
    label: 'Oversight',
    items: [
      { index: '01', label: 'Overview', to: '/dashboard', icon: LayoutDashboard },
      { index: '02', label: 'FDR Registry', to: '/instruments', icon: FileText },
      { index: '03', label: 'Institutions', to: '/institutions', icon: Building2 },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { index: '04', label: 'Integrity Intelligence', to: '/integrity', icon: ShieldAlert },
      { index: '05', label: 'Evidence Passport', to: '/evidence', icon: Fingerprint },
      { index: '06', label: 'Verification Center', to: '/verification', icon: ClipboardCheck },
    ],
  },
  {
    label: 'Operations',
    items: [
      { index: '07', label: 'Lifecycle & Approvals', to: '/lifecycle', icon: GitBranch },
      { index: '08', label: 'Deadline Intelligence', to: '/deadlines', icon: CalendarClock },
    ],
  },
  {
    label: 'Governance',
    items: [
      { index: '09', label: 'Audit Trail', to: '/audit', icon: ScrollText },
      { index: '10', label: 'Reports & Analytics', to: '/reports', icon: BarChart3 },
    ],
  },
  {
    label: 'Prototype',
    items: [
      { index: '11', label: 'Demo Scenarios', to: '/demo-scenarios', icon: PlayCircle },
      { index: '12', label: 'Settings', to: '/settings', icon: Settings },
    ],
  },
]

export const ROUTE_LABELS = {
  dashboard: 'Overview',
  instruments: 'FDR Registry',
  integrity: 'Integrity Intelligence',
  evidence: 'Evidence Passport',
  verification: 'Verification Center',
  lifecycle: 'Lifecycle & Approvals',
  deadlines: 'Deadline Intelligence',
  audit: 'Audit Trail',
  institutions: 'Institutions',
  reports: 'Reports & Analytics',
  'demo-scenarios': 'Demo Scenarios',
  settings: 'Settings',
  new: 'Register FDR',
}

export const ALL_NAV_ITEMS = NAV_GROUPS.flatMap((group) => group.items)
