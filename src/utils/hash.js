/**
 * Deterministic FNV-1a checksum used to chain locally stored audit events.
 * This is an integrity demo, not production-grade cryptography and not a
 * substitute for an append-only server-side audit store.
 */
export function fnv1a(input) {
  let hash = 0x811c9dc5
  const str = String(input)
  for (let i = 0; i < str.length; i += 1) {
    hash ^= str.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

export function canonicalEvent(event) {
  return JSON.stringify({
    id: event.id,
    timestamp: event.timestamp,
    actorId: event.actorId,
    role: event.role,
    action: event.action,
    entityType: event.entityType,
    entityId: event.entityId,
    summary: event.summary,
    previousState: event.previousState ?? null,
    newState: event.newState ?? null,
    reason: event.reason ?? '',
    outcome: event.outcome ?? 'success',
  })
}

export function computeEventHash(event, previousHash = 'GENESIS') {
  return fnv1a(`${previousHash}|${canonicalEvent(event)}`)
}

export function chainAuditEvents(events) {
  let previousHash = 'GENESIS'
  return events.map((event) => {
    const previousEventHash = previousHash
    const hash = computeEventHash(event, previousHash)
    previousHash = hash
    return { ...event, previousEventHash, hash }
  })
}

export function verifyAuditChain(events) {
  let previousHash = 'GENESIS'
  const broken = []
  events.forEach((event, index) => {
    const expected = computeEventHash(event, previousHash)
    if (event.hash !== expected) broken.push({ index, id: event.id })
    previousHash = event.hash ?? expected
  })
  return { valid: broken.length === 0, broken, checked: events.length }
}
