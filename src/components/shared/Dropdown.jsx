import { useEffect, useRef, useState } from 'react'

export function Dropdown({ trigger, children, align = 'right', width = 'w-72', label = 'Menu' }) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const onClick = (event) => {
      if (!containerRef.current?.contains(event.target)) setOpen(false)
    }
    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="relative" ref={containerRef}>
      {trigger({
        open,
        toggle: () => setOpen((value) => !value),
        close: () => setOpen(false),
        'aria-haspopup': 'dialog',
        'aria-expanded': open,
        'aria-label': label,
      })}
      {open && (
        <div
          role="dialog"
          aria-label={label}
          className={`absolute top-[calc(100%+8px)] z-50 border border-line bg-raised shadow-lift animate-fade-up ${width} ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {typeof children === 'function' ? children(() => setOpen(false)) : children}
        </div>
      )}
    </div>
  )
}
