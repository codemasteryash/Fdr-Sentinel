import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, AlertTriangle, Loader2 } from 'lucide-react'

function useOverlay(open, onClose, restoreFocus = true) {
  const ref = useRef(null)
  const previousFocus = useRef(null)
  useEffect(() => {
    if (!open) return undefined
    previousFocus.current = document.activeElement
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const timer = setTimeout(() => ref.current?.focus(), 20)
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = original
      if (restoreFocus) previousFocus.current?.focus?.()
    }
  }, [open, onClose, restoreFocus])
  return ref
}

export function Modal({
  open,
  onClose,
  title,
  description,
  eyebrow,
  children,
  footer,
  size = 'md',
}) {
  const ref = useOverlay(open, onClose)
  if (!open) return null
  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-xl',
    lg: 'max-w-3xl',
    xl: 'max-w-5xl',
  }
  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end justify-center p-0 sm:items-center sm:p-6">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-forest-deep/45 backdrop-blur-[1px]"
        onClick={onClose}
      />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={`relative flex max-h-[92vh] w-full flex-col border border-line bg-raised shadow-lift outline-none animate-fade-up sm:max-h-[88vh] ${sizes[size]}`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            {eyebrow && <div className="overline mb-1 text-copper-dark">{eyebrow}</div>}
            <h2 className="font-display text-xl font-medium leading-tight text-ink">{title}</h2>
            {description && <p className="mt-1.5 text-xs leading-relaxed text-muted">{description}</p>}
          </div>
          <button type="button" className="btn-icon -mr-1 -mt-1" onClick={onClose} aria-label="Close">
            <X size={17} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">{children}</div>
        {footer && (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line bg-paper/50 px-5 py-3.5">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}

export function Drawer({ open, onClose, title, subtitle, eyebrow, children, footer, width = 'max-w-[560px]' }) {
  const ref = useOverlay(open, onClose)
  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-[75] flex justify-end">
      <button
        type="button"
        aria-label="Close panel"
        className="absolute inset-0 bg-forest-deep/35 backdrop-blur-[1px]"
        onClick={onClose}
      />
      <aside
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={`relative flex h-full w-full flex-col border-l border-line bg-raised shadow-drawer outline-none animate-slide-in ${width}`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div className="min-w-0">
            {eyebrow && <div className="overline mb-1 text-copper-dark">{eyebrow}</div>}
            <h2 className="truncate font-display text-xl font-medium text-ink">{title}</h2>
            {subtitle && <div className="mt-1 text-[11px] text-muted">{subtitle}</div>}
          </div>
          <button type="button" className="btn-icon -mr-1" onClick={onClose} aria-label="Close panel">
            <X size={17} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        {footer && (
          <div className="border-t border-line bg-paper/50 px-5 py-3.5">{footer}</div>
        )}
      </aside>
    </div>,
    document.body,
  )
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = 'Confirm action',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'danger',
  requirePhrase,
  noteLabel = 'Reason (optional)',
  requireNote = false,
  busy = false,
}) {
  const [note, setNote] = useState('')
  const [phrase, setPhrase] = useState('')
  const [error, setError] = useState('')
  useEffect(() => {
    if (!open) {
      setNote('')
      setPhrase('')
      setError('')
    }
  }, [open])

  const handleConfirm = () => {
    if (requirePhrase && phrase.trim() !== requirePhrase) {
      setError(`Type "${requirePhrase}" to continue.`)
      return
    }
    if (requireNote && !note.trim()) {
      setError('A reason is required.')
      return
    }
    setError('')
    onConfirm(note.trim(), phrase.trim())
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      eyebrow={tone === 'danger' ? 'Confirmation required' : 'Please confirm'}
      footer={
        <>
          <button type="button" className="btn-secondary btn-sm" onClick={onClose} disabled={busy}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={tone === 'danger' ? 'btn-primary btn-sm' : 'btn-dark btn-sm'}
            onClick={handleConfirm}
            disabled={busy}
          >
            {busy && <Loader2 size={13} className="animate-spin" />}
            {confirmLabel}
          </button>
        </>
      }
    >
      <div className="flex gap-3">
        <div
          className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center border ${
            tone === 'danger'
              ? 'border-critical/30 bg-critical/[0.06] text-critical'
              : 'border-copper/30 bg-copper/[0.06] text-copper'
          }`}
        >
          <AlertTriangle size={15} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] leading-relaxed text-inkSoft">{message}</div>
          <div className="mt-4 space-y-3">
            <div>
              <label className="label" htmlFor="confirm-note">
                {noteLabel}
              </label>
              <textarea
                id="confirm-note"
                className="textarea min-h-[70px]"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Record why this action is being taken…"
              />
            </div>
            {requirePhrase && (
              <div>
                <label className="label" htmlFor="confirm-phrase">
                  Type {requirePhrase} to confirm
                </label>
                <input
                  id="confirm-phrase"
                  className="input font-mono"
                  value={phrase}
                  onChange={(event) => setPhrase(event.target.value)}
                  placeholder={requirePhrase}
                  autoComplete="off"
                />
              </div>
            )}
            {error && (
              <p className="field-error" role="alert">
                {error}
              </p>
            )}
          </div>
          <p className="mt-4 text-[10.5px] leading-relaxed text-muted">
            This action is recorded in the local audit trail. No server-side approval is involved.
          </p>
        </div>
      </div>
    </Modal>
  )
}
