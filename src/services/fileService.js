const DB_NAME = 'fdr-sentinel-files'
const STORE_NAME = 'documents'
const memoryFallback = new Map()
const urlCache = new Map()

function openDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is unavailable.'))
      return
    }
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Could not open document store.'))
  })
}

let dbPromise = null
function getDb() {
  if (!dbPromise) dbPromise = openDb()
  return dbPromise
}

export async function saveDocument(id, file) {
  const record = {
    id,
    name: file.name,
    type: file.type,
    size: file.size,
    updatedAt: new Date().toISOString(),
    blob: file,
  }
  try {
    const db = await getDb()
    await new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite')
      transaction.objectStore(STORE_NAME).put(record)
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    })
    return { ok: true, storage: 'indexeddb' }
  } catch {
    memoryFallback.set(id, record)
    return {
      ok: true,
      storage: 'memory',
      warning: 'IndexedDB is unavailable. The document preview will last only for this session.',
    }
  }
}

export async function getDocumentRecord(id) {
  if (memoryFallback.has(id)) return memoryFallback.get(id)
  try {
    const db = await getDb()
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly')
      const request = transaction.objectStore(STORE_NAME).get(id)
      request.onsuccess = () => resolve(request.result ?? null)
      request.onerror = () => reject(request.error)
    })
  } catch {
    return null
  }
}

export async function getDocumentObjectUrl(id) {
  if (urlCache.has(id)) return urlCache.get(id)
  const record = await getDocumentRecord(id)
  if (!record?.blob) return null
  const url = URL.createObjectURL(record.blob)
  urlCache.set(id, url)
  return url
}

export async function clearUploadedFiles() {
  urlCache.forEach((url) => URL.revokeObjectURL(url))
  urlCache.clear()
  memoryFallback.clear()
  try {
    const db = await getDb()
    await new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite')
      transaction.objectStore(STORE_NAME).clear()
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    })
  } catch {
    // Nothing to clear in the fallback store.
  }
}

function escapeXml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function inr(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0)
}

function dateText(value) {
  if (!value) return '—'
  try {
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(value))
  } catch {
    return '—'
  }
}

export function buildSeedDocumentSvg(instrument) {
  const w = 820
  const h = 1040
  const lines = [
    ['FDR / Reference No.', instrument.reference],
    ['Issuing Bank', instrument.bank],
    ['Branch', instrument.branch],
    ['Principal Amount', inr(instrument.amount)],
    ['Date of Issue', dateText(instrument.issueDate)],
    ['Date of Maturity', dateText(instrument.maturityDate)],
    ['Instrument Holder', instrument.holder],
    ['Beneficiary', instrument.beneficiary || 'NOT STATED'],
    ['Purpose / Category', instrument.purpose],
  ]
  const rows = lines
    .map(
      ([label, value], index) => `
      <g transform="translate(80, ${360 + index * 52})">
        <text x="0" y="0" font-family="Georgia, serif" font-size="12" fill="#6C786F" letter-spacing="1.4">${escapeXml(
          label.toUpperCase(),
        )}</text>
        <text x="0" y="22" font-family="'Courier New', monospace" font-size="16" fill="#14201B">${escapeXml(
          value,
        )}</text>
        <line x1="0" y1="34" x2="660" y2="34" stroke="#DAD4C7" stroke-width="1" />
      </g>`,
    )
    .join('')

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <rect width="${w}" height="${h}" fill="#F7F3EA" />
    <rect x="0" y="0" width="${w}" height="118" fill="#1D3B2F" />
    <text x="80" y="56" font-family="Georgia, serif" font-size="25" fill="#F2EFE7" letter-spacing="2">${escapeXml(
      instrument.bank.toUpperCase(),
    )}</text>
    <text x="80" y="83" font-family="'Courier New', monospace" font-size="11" fill="#C7D3C8" letter-spacing="2.4">FIXED DEPOSIT RECEIPT · SYNTHETIC DEMO DOCUMENT</text>
    <text x="740" y="56" font-family="Georgia, serif" font-size="11" fill="#C08457" text-anchor="end" letter-spacing="2">FDR SENTINEL</text>
    <text x="740" y="78" font-family="'Courier New', monospace" font-size="9" fill="#9FB3A3" text-anchor="end">REFERENCE COPY</text>
    <rect x="80" y="160" width="660" height="1" fill="#C3BBA8" />
    <text x="80" y="214" font-family="Georgia, serif" font-size="30" fill="#14201B">Fixed Deposit Receipt</text>
    <text x="80" y="244" font-family="Georgia, serif" font-size="13" fill="#6C786F" font-style="italic">Security deposit instrument issued in favour of the beneficiary named below.</text>
    <text x="80" y="284" font-family="'Courier New', monospace" font-size="11" fill="#9E3B33" letter-spacing="1.6">SYNTHETIC DEMO DOCUMENT — NOT A BANK-ISSUED INSTRUMENT</text>
    ${rows}
    <g transform="translate(80, 880)">
      <rect x="0" y="0" width="220" height="86" fill="none" stroke="#A85C36" stroke-width="1.4" />
      <text x="14" y="24" font-family="'Courier New', monospace" font-size="10" fill="#A85C36" letter-spacing="2">DEMONSTRATION STAMP</text>
      <text x="14" y="48" font-family="Georgia, serif" font-size="17" fill="#A85C36">Simulated record</text>
      <text x="14" y="68" font-family="'Courier New', monospace" font-size="9" fill="#8A4829">No legal or financial value</text>
    </g>
    <text x="740" y="900" font-family="Georgia, serif" font-size="12" fill="#14201B" text-anchor="end">For ${escapeXml(
      instrument.institutionName,
    )}</text>
    <text x="740" y="922" font-family="'Courier New', monospace" font-size="9" fill="#6C786F" text-anchor="end">Generated locally for the FDR Sentinel prototype</text>
    <rect x="0" y="${h - 44}" width="${w}" height="44" fill="#E5EBE3" />
    <text x="80" y="${h - 17}" font-family="'Courier New', monospace" font-size="9" fill="#39473F" letter-spacing="1">DEMO DATA · OCR EXTRACTION VALUES IN THIS PROTOTYPE ARE SIMULATED</text>
  </svg>`
}

export function seedDocumentUrl(instrument) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(buildSeedDocumentSvg(instrument))}`
}
