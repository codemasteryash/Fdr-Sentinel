import { useEffect, useState } from 'react'
import { getDocumentObjectUrl, seedDocumentUrl } from '../services/fileService'

export function useDocumentPreview(instrument) {
  const [url, setUrl] = useState(() =>
    instrument?.document?.source === 'seeded' ? seedDocumentUrl(instrument) : null,
  )
  const [loading, setLoading] = useState(instrument?.document?.source !== 'seeded')

  useEffect(() => {
    let active = true
    if (!instrument?.document) {
      setUrl(null)
      setLoading(false)
      return () => {
        active = false
      }
    }
    if (instrument.document.source === 'seeded') {
      setUrl(seedDocumentUrl(instrument))
      setLoading(false)
      return () => {
        active = false
      }
    }
    setLoading(true)
    getDocumentObjectUrl(instrument.document.id).then((objectUrl) => {
      if (!active) return
      setUrl(objectUrl)
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [instrument])

  return { url, loading, isSeed: instrument?.document?.source === 'seeded' }
}
