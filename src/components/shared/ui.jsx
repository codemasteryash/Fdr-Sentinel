import { Link } from 'react-router-dom'
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Inbox,
  Info,
  Loader2,
  ArrowUpRight,
} from 'lucide-react'
import { initials } from '../../utils/format'

export function PageHeader({ overline, title, description, actions, meta, children }) {
  return (
    <header className="mb-6 border-b border-line pb-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          {overline && (
            <div className="mb-2 flex items-center gap-2.5">
              <span className="h-px w-6 bg-copper" />
              <span className="overline text-copper-dark">{overline}</span>
            </div>
          )}
          <h1 className="font-display text-[28px] font-medium leading-[1.1] tracking-[-0.01em] text-ink sm:text-[34px]">
            {title}
          </h1>
          {description && (
            <p className="mt-2.5 max-w-3xl text-[13px] leading-relaxed text-muted">{description}</p>
          )}
          {meta && <div className="mt-3.5 flex flex-wrap items-center gap-x-4 gap-y-2">{meta}</div>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </header>
  )
}

export function SectionHeading({ overline, title, description, actions, className = '' }) {
  return (
    <div className={`flex flex-wrap items-end justify-between gap-3 ${className}`}>
      <div>
        {overline && <div className="overline mb-1">{overline}</div>}
        {title && <h2 className="font-display text-lg font-medium leading-tight text-ink">{title}</h2>}
        {description && <p className="mt-1 text-xs leading-relaxed text-muted">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}

export function EmptyState({ icon: Icon = Inbox, title, message, action, compact = false }) {
  return (
    <div className={`flex flex-col items-center justify-center text-center ${compact ? 'px-6 py-10' : 'px-6 py-16'}`}>
      <div className="mb-4 flex h-11 w-11 items-center justify-center border border-line bg-paper text-muted">
        <Icon size={19} strokeWidth={1.6} />
      </div>
      <h3 className="font-display text-lg text-ink">{title}</h3>
      {message && <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-muted">{message}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function LoadingState({ rows = 3, className = '' }) {
  return (
    <div className={`space-y-2.5 ${className}`} aria-label="Loading" role="status">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="skeleton h-14 w-full" />
      ))}
      <span className="sr-only">Loading content</span>
    </div>
  )
}

export function Spinner({ size = 16, className = '' }) {
  return <Loader2 size={size} className={`animate-spin ${className}`} />
}

export function InfoNote({ title, children, tone = 'info', icon: Icon = Info, className = '' }) {
  const tones = {
    info: 'border-info/20 bg-info/[0.04] text-info',
    warning: 'border-warning/25 bg-warning/[0.05] text-warning',
    neutral: 'border-line bg-paper/60 text-muted',
    copper: 'border-copper/25 bg-copper/[0.05] text-copper-dark',
  }
  return (
    <div className={`border px-4 py-3 ${tones[tone] ?? tones.info} ${className}`}>
      <div className="flex gap-2.5">
        <Icon size={15} strokeWidth={1.8} className="mt-0.5 shrink-0" />
        <div className="min-w-0">
          {title && <div className="text-[11px] font-semibold uppercase tracking-[0.07em]">{title}</div>}
          <div className={`text-[11.5px] leading-relaxed ${title ? 'mt-1 text-inkSoft' : ''}`}>
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}

export function Avatar({ name, size = 'md', className = '' }) {
  const sizes = {
    sm: 'h-6 w-6 text-[9px]',
    md: 'h-8 w-8 text-[10px]',
    lg: 'h-10 w-10 text-xs',
  }
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-forest font-semibold tracking-wide text-paper ${sizes[size]} ${className}`}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  )
}

export function Progress({ value = 0, tone = 'forest', className = '', label }) {
  const tones = {
    forest: 'bg-forest',
    success: 'bg-success',
    copper: 'bg-copper',
    warning: 'bg-warning',
    critical: 'bg-critical',
  }
  return (
    <div className={className}>
      {label && (
        <div className="mb-1.5 flex items-center justify-between text-[10.5px] text-muted">
          <span>{label}</span>
          <span className="font-mono text-inkSoft">{value}%</span>
        </div>
      )}
      <div
        className="h-1 w-full overflow-hidden bg-line/70"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={`h-full transition-[width] duration-500 ease-precise ${tones[tone] ?? tones.forest}`}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    </div>
  )
}

export function SearchInput({ value, onChange, placeholder = 'Search…', className = '', ...props }) {
  return (
    <div className={`relative ${className}`}>
      <Search
        size={14}
        strokeWidth={1.8}
        className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted"
      />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="input pl-8"
        {...props}
      />
    </div>
  )
}

export function Pagination({ page, pageSize, total, onPageChange }) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1
  const end = Math.min(total, page * pageSize)
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3">
      <span className="text-[11px] text-muted">
        Showing <span className="font-mono text-inkSoft">{start}–{end}</span> of{' '}
        <span className="font-mono text-inkSoft">{total}</span>
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          className="btn-icon"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          aria-label="Previous page"
        >
          <ChevronLeft size={15} />
        </button>
        {Array.from({ length: pages }).slice(0, 7).map((_, index) => {
          let pageNumber = index + 1
          if (pages > 7) {
            if (page > 4) pageNumber = index + page - 3
            if (pageNumber > pages) pageNumber = pages - (6 - index)
          }
          return (
            <button
              key={pageNumber}
              type="button"
              onClick={() => onPageChange(pageNumber)}
              className={`h-7 min-w-7 border px-1.5 font-mono text-[10.5px] transition-colors ${
                pageNumber === page
                  ? 'border-forest bg-forest text-paper'
                  : 'border-line bg-raised text-inkSoft hover:border-lineStrong'
              }`}
              aria-current={pageNumber === page ? 'page' : undefined}
            >
              {pageNumber}
            </button>
          )
        })}
        <button
          type="button"
          className="btn-icon"
          onClick={() => onPageChange(Math.min(pages, page + 1))}
          disabled={page >= pages}
          aria-label="Next page"
        >
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  )
}

export function Field({ label, error, hint, htmlFor, required, children, className = '' }) {
  return (
    <div className={className}>
      {label && (
        <label className="label" htmlFor={htmlFor}>
          {label}
          {required && <span className="ml-1 text-copper">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="field-error" role="alert">
          {error}
        </p>
      ) : (
        hint && <p className="hint">{hint}</p>
      )}
    </div>
  )
}

export function LinkArrow({ to, children, className = '' }) {
  return (
    <Link
      to={to}
      className={`group inline-flex items-center gap-1 text-[11.5px] font-medium text-forest transition-colors hover:text-copper ${className}`}
    >
      {children}
      <ArrowUpRight
        size={12}
        className="transition-transform duration-150 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
      />
    </Link>
  )
}

export function KeyValue({ label, children, className = '' }) {
  return (
    <div className={className}>
      <dt className="overline mb-1">{label}</dt>
      <dd className="text-[13px] font-medium text-ink">{children}</dd>
    </div>
  )
}

export function DemoStamp({ label = 'DEMO VERIFICATION', className = '' }) {
  return (
    <span
      className={`inline-flex items-center border border-copper/50 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-copper-dark ${className}`}
    >
      {label}
    </span>
  )
}
