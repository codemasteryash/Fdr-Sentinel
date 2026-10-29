import { useState } from 'react'
import {
  FileText,
  ExternalLink,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Loader2,
  ShieldCheck,
  Image as ImageIcon,
} from 'lucide-react'
import { useDocumentPreview } from '../../hooks/useDocumentPreview'
import { formatFileSize } from '../../utils/validation'
import { EmptyState } from '../shared/ui'

export function DocumentPanel({ instrument, className = '', heightClass = 'h-[620px]' }) {
  const { url, loading, isSeed } = useDocumentPreview(instrument)
  const [zoom, setZoom] = useState(1)
  const [imageError, setImageError] = useState(false)
  const document = instrument?.document
  const isPdf = document?.type === 'application/pdf' && !isSeed
  const isImage = isSeed || document?.type?.startsWith('image/')

  if (!document) {
    return (
      <EmptyState
        compact
        icon={FileText}
        title="No document attached"
        message="This record was created without a supporting document. OCR extraction cannot be simulated."
      />
    )
  }

  return (
    <div className={`border border-line bg-raised ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-3.5 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <FileText size={14} className="shrink-0 text-forest" />
          <span className="truncate text-[11px] font-medium text-ink">{document.name}</span>
          <span className="shrink-0 font-mono text-[9px] uppercase text-muted">
            {isSeed ? 'SVG' : document.type?.split('/')[1] ?? 'file'} · {formatFileSize(document.size ?? 0)}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {isImage && (
            <>
              <button
                type="button"
                className="btn-icon h-6 w-6"
                onClick={() => setZoom((value) => Math.max(0.5, Number((value - 0.15).toFixed(2))))}
                aria-label="Zoom out"
              >
                <ZoomOut size={12} />
              </button>
              <span className="w-9 text-center font-mono text-[9px] text-muted">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                className="btn-icon h-6 w-6"
                onClick={() => setZoom((value) => Math.min(2.2, Number((value + 0.15).toFixed(2))))}
                aria-label="Zoom in"
              >
                <ZoomIn size={12} />
              </button>
              <button
                type="button"
                className="btn-icon h-6 w-6"
                onClick={() => setZoom(1)}
                aria-label="Reset zoom"
              >
                <RotateCcw size={11} />
              </button>
            </>
          )}
          {url && (
            <>
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="btn-icon h-6 w-6"
                aria-label="Open document in a new tab"
              >
                <ExternalLink size={12} />
              </a>
              <a href={url} download={document.name} className="btn-icon h-6 w-6" aria-label="Download document">
                <Download size={12} />
              </a>
            </>
          )}
        </div>
      </div>

      <div className={`relative flex items-start justify-center overflow-auto bg-[#E8E4D9] ${heightClass}`}>
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 size={22} className="animate-spin text-muted" />
          </div>
        ) : !url ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
            <ImageIcon size={20} className="text-muted" />
            <p className="text-[11px] text-muted">
              The document metadata is available, but the local file bytes were not found in this
              browser. This is expected after clearing site data or resetting uploads.
            </p>
          </div>
        ) : isPdf ? (
          <iframe
            src={url}
            title={`Document preview for ${instrument.id}`}
            className="h-full min-h-[560px] w-full bg-white"
          />
        ) : isImage && !imageError ? (
          <img
            src={url}
            alt={`Supporting FDR document for ${instrument.id}`}
            onError={() => setImageError(true)}
            style={{ width: `${zoom * 100}%` }}
            className="my-4 max-w-none border border-line bg-white shadow-sm"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
            <FileText size={22} className="text-muted" />
            <p className="text-[11px] text-muted">
              This file type cannot be rendered inline. Open it in a new tab to inspect it.
            </p>
          </div>
        )}

        {isSeed && (
          <span className="absolute bottom-3 left-3 border border-copper/40 bg-raised/90 px-1.5 py-0.5 font-mono text-[8.5px] uppercase tracking-[0.1em] text-copper-dark">
            Synthetic seed document
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line bg-paper/40 px-3.5 py-2">
        <div className="flex items-center gap-1.5 text-[9.5px] text-muted">
          <ShieldCheck size={11} className="text-forest" />
          {isSeed
            ? 'Generated placeholder preview for synthetic data.'
            : 'File bytes stored locally in IndexedDB. No upload occurred.'}
        </div>
        <span className="font-mono text-[8.5px] text-muted">{document.id}</span>
      </div>
    </div>
  )
}
