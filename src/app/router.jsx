/* eslint-disable react-refresh/only-export-components */
import { lazy, Suspense } from 'react'
import { createBrowserRouter, Link, Navigate, useRouteError } from 'react-router-dom'
import { AppShell } from '../components/layout/AppShell'
import { LoadingState } from '../components/shared/ui'

const Dashboard = lazy(() => import('../pages/Dashboard'))
const Instruments = lazy(() => import('../pages/Instruments'))
const RegisterInstrument = lazy(() => import('../pages/RegisterInstrument'))
const InstrumentDetail = lazy(() => import('../pages/InstrumentDetail'))
const Institutions = lazy(() => import('../pages/Institutions'))
const InstitutionDetail = lazy(() => import('../pages/InstitutionDetail'))
const Integrity = lazy(() => import('../pages/Integrity'))
const Evidence = lazy(() => import('../pages/Evidence'))
const Verification = lazy(() => import('../pages/Verification'))
const Lifecycle = lazy(() => import('../pages/Lifecycle'))
const Deadlines = lazy(() => import('../pages/Deadlines'))
const Audit = lazy(() => import('../pages/Audit'))
const Reports = lazy(() => import('../pages/Reports'))
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
    <div className="mx-auto max-w-xl py-16">
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
          <Link to="/dashboard" className="btn-dark btn-sm">
            Return to dashboard
          </Link>
          <button type="button" className="btn-secondary btn-sm" onClick={() => window.location.reload()}>
            Reload prototype
          </button>
        </div>
      </div>
    </div>
  )
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: page(Dashboard) },
      { path: 'instruments', element: page(Instruments) },
      { path: 'instruments/new', element: page(RegisterInstrument) },
      { path: 'instruments/:id', element: page(InstrumentDetail) },
      { path: 'institutions', element: page(Institutions) },
      { path: 'institutions/:id', element: page(InstitutionDetail) },
      { path: 'integrity', element: page(Integrity) },
      { path: 'evidence', element: page(Evidence) },
      { path: 'verification', element: page(Verification) },
      { path: 'verification/:id', element: page(Verification) },
      { path: 'lifecycle', element: page(Lifecycle) },
      { path: 'lifecycle/:id', element: page(Lifecycle) },
      { path: 'deadlines', element: page(Deadlines) },
      { path: 'audit', element: page(Audit) },
      { path: 'reports', element: page(Reports) },
      { path: 'demo-scenarios', element: page(DemoScenarios) },
      { path: 'settings', element: page(Settings) },
      { path: '*', element: page(NotFound) },
    ],
  },
])
