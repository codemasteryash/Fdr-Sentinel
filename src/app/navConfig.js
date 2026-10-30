import {
  LayoutDashboard,
  FileText,
  ClipboardCheck,
  GitBranch,
  Landmark,
} from 'lucide-react'

export const NAV_ITEMS = [
  {
    index: '01',
    label: 'Overview',
    description: 'Attention and progression',
    to: '/app/overview',
    icon: LayoutDashboard,
  },
  {
    index: '02',
    label: 'Instruments',
    description: 'Registry and evidence',
    to: '/app/instruments',
    icon: FileText,
  },
  {
    index: '03',
    label: 'Verification Center',
    description: 'Review and confirm',
    to: '/app/verification',
    icon: ClipboardCheck,
  },
  {
    index: '04',
    label: 'Lifecycle & Deadlines',
    description: 'State changes and due work',
    to: '/app/lifecycle',
    icon: GitBranch,
  },
  {
    index: '05',
    label: 'Governance & Reports',
    description: 'Audit, institutions, analytics',
    to: '/app/governance',
    icon: Landmark,
  },
]

export const ROUTE_LABELS = {
  app: 'Workspace',
  overview: 'Overview',
  instruments: 'Instruments',
  verification: 'Verification Center',
  lifecycle: 'Lifecycle & Deadlines',
  governance: 'Governance & Reports',
  institutions: 'Institutions',
  demo: 'Demo Scenarios',
  settings: 'Settings',
  new: 'Register FDR',
}

export const ALL_NAV_ITEMS = NAV_ITEMS
