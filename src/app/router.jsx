/* eslint-disable react-refresh/only-export-components */
import { lazy, Suspense } from 'react'
import {
  createBrowserRouter,
  Link,
  Navigate,
  useLocation,
  useParams,
  useRouteError,
} from 'react-router-dom'
import { AppShell } from '../components/layout/AppShell'
import { LoadingState } from '../components/shared/ui'
import Landing from '../pages/Landing'

const Dashboard = lazy(() => import('../pages/Dashboard'))
const Instruments = lazy(() => import('../pages/Instruments'))
const RegisterInstrument = lazy(() => import('../pages/RegisterInstrument'))
const InstrumentDetail = lazy(() => import('../pages/InstrumentDetail'))
const InstitutionDetail = lazy(() => import('../pages/InstitutionDetail'))
const Verification = lazy(() => import('../pages/Verification'))
const Lifecycle = lazy(() => import('../pages/Lifecycle'))
const Governance = lazy(() => import('../pages/Governance'))
const DemoScenarios = lazy(() => import('../pages/DemoScenarios'))
const Settings = lazy(() => import('../pages/Settings'))
const NotFound = lazy(() => import('../pages/NotFound'))

function PageFallback() {
  return (
    <div className="py-6">
      <div className="mb-6 h-4 w-40 animate-pulse bg-line/70" />
      <div className="mb-2 h-9 w-80 max-w-full animate-pulse bg-line/60" />
      <div className="mb-8 h-3 w-[520px] max-w-full animate-pulse bg-line/40" />
      <LoadingState rows={4} />
    </div>
  )
}

function page(Component) {
  return (
    <Suspense fallback={<PageFallback />}>
      <Component />
    </Suspense>
  )
}

function RouteError() {
  const error = useRouteError()
  const status = error?.status
  const message =
    error?.statusText ?? error?.message ?? 'An unexpected error occurred while loading this page.'
  return (
    <div className="mx-auto max-w-xl px-4 py-16 sm:px-6">
      <div className="border border-critical/25 bg-raised px-6 py-7">
        <div className="overline text-critical">Application error</div>
        <h1 className="mt-2 font-display text-2xl text-ink">
          {status === 404 ? 'This page could not be found.' : 'Something went wrong.'}
        </h1>
        <p className="mt-2 text-xs leading-relaxed text-muted">{message}</p>
        <p className="mt-1 text-[10.5px] leading-relaxed text-muted">
          The prototype stores state locally. Reloading usually recovers a stale client state.
        </p>
        <div className="mt-5 flex gap-2">
          <Link to="/app/overview" className="btn-dark btn-sm">
            Return to overview
          </Link>
          <button type="button" className="btn-secondary btn-sm" onClick={() => window.location.reload()}>
            Reload prototype
          </button>
        </div>
      </div>
    </div>
  )
}

function LegacyRedirect({ to }) {
  const location = useLocation()
  return <Navigate to={{ pathname: to, search: location.search }} replace />
}

function LegacyRecordRedirect({ section }) {
  const { id } = useParams()
  const location = useLocation()
  return (
    <Navigate
      to={{ pathname: `/app/${section}/${id}`, search: location.search }}
      replace
    />
  )
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Landing />,
    errorElement: <RouteError />,
  },
  { path: '/dashboard', element: <LegacyRedirect to="/app/overview" /> },
  { path: '/instruments/new', element: <LegacyRedirect to="/app/instruments/new" /> },
  { path: '/instruments/:id', element: <LegacyRecordRedirect section="instruments" /> },
  { path: '/instruments', element: <LegacyRedirect to="/app/instruments" /> },
  { path: '/institutions/:id', element: <LegacyRecordRedirect section="institutions" /> },
  { path: '/institutions', element: <LegacyRedirect to="/app/governance?view=institutions" /> },
  { path: '/integrity', element: <LegacyRedirect to="/app/verification?view=findings" /> },
  { path: '/evidence', element: <LegacyRedirect to="/app/instruments?view=evidence" /> },
  { path: '/verification/:id', element: <LegacyRecordRedirect section="verification" /> },
  { path: '/verification', element: <LegacyRedirect to="/app/verification" /> },
  { path: '/lifecycle/:id', element: <LegacyRecordRedirect section="lifecycle" /> },
  { path: '/lifecycle', element: <LegacyRedirect to="/app/lifecycle" /> },
  { path: '/deadlines', element: <LegacyRedirect to="/app/lifecycle?view=deadlines" /> },
  { path: '/audit', element: <LegacyRedirect to="/app/governance?view=audit" /> },
  { path: '/reports', element: <LegacyRedirect to="/app/governance?view=reports" /> },
  { path: '/demo-scenarios', element: <LegacyRedirect to="/app/demo" /> },
  { path: '/settings', element: <LegacyRedirect to="/app/settings" /> },
  {
    path: '/app',
    element: <AppShell />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <Navigate to="/app/overview" replace /> },
      { path: 'overview', element: page(Dashboard) },
      { path: 'instruments', element: page(Instruments) },
      { path: 'instruments/new', element: page(RegisterInstrument) },
      { path: 'instruments/:id', element: page(InstrumentDetail) },
      { path: 'institutions/:id', element: page(InstitutionDetail) },
      { path: 'verification', element: page(Verification) },
      { path: 'verification/:id', element: page(Verification) },
      { path: 'lifecycle', element: page(Lifecycle) },
      { path: 'lifecycle/:id', element: page(Lifecycle) },
      { path: 'governance', element: page(Governance) },
      { path: 'demo', element: page(DemoScenarios) },
      { path: 'settings', element: page(Settings) },
      { path: '*', element: page(NotFound) },
    ],
  },
  { path: '*', element: page(NotFound) },
])
