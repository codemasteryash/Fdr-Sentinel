/**
 * Deterministic reference normalization used by the Instrument Integrity Engine.
 * Normalization levels are intentionally ordered and explicit so findings can
 * state exactly which comparison produced a match.
 */

const DASHES = /[\u2010-\u2015\u2212]/g

export function collapseWhitespace(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim()
}

export function exactNormalized(value) {
  return collapseWhitespace(value).replace(DASHES, '-').toUpperCase()
}

export function strongNormalized(value) {
  return exactNormalized(value).replace(/[^A-Z0-9]/g, '')
}

export function ocrNormalized(value) {
  return strongNormalized(value)
    .replace(/O/g, '0')
    .replace(/[IL]/g, '1')
    .replace(/S/g, '5')
    .replace(/B/g, '8')
    .replace(/Z/g, '2')
}

export function normalizationProfile(value) {
  const exact = exactNormalized(value)
  const strong = strongNormalized(value)
  const ocr = ocrNormalized(value)
  return { exact, strong, ocr }
}

export function levenshtein(a = '', b = '') {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i += 1) {
    const row = [i]
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      row[j] = Math.min(row[j - 1] + 1, previous[j] + 1, previous[j - 1] + cost)
    }
    previous = row
  }
  return previous[b.length]
}

export function similarity(a = '', b = '') {
  if (!a && !b) return 1
  const longest = Math.max(a.length, b.length)
  if (!longest) return 1
  return 1 - levenshtein(a, b) / longest
}

/**
 * Classifies how two references relate. This never decides fraud or proves a
 * duplicate on its own — it returns an explainable match category.
 */
export function referenceMatch(left, right) {
  const a = normalizationProfile(left)
  const b = normalizationProfile(right)
  const result = {
    level: 'none',
    label: 'No match',
    score: 0,
    left: a,
    right: b,
    fuzzy: false,
    explanation: 'The identifiers do not share a recognized normalization level.',
  }
  if (!a.strong || !b.strong) {
    return { ...result, explanation: 'At least one identifier is missing.' }
  }
  if (a.exact === b.exact) {
    return {
      ...result,
      level: 'exact',
      label: 'Exact identifier match',
      score: 100,
      explanation: 'Identifiers are identical after case and whitespace normalization.',
    }
  }
  if (a.strong === b.strong) {
    return {
      ...result,
      level: 'strong_normalized',
      label: 'Strong normalized match',
      score: 96,
      explanation:
        'Identifiers are identical after removing separators, punctuation, and case differences.',
    }
  }
  if (a.ocr === b.ocr) {
    return {
      ...result,
      level: 'ocr_variant',
      label: 'Possible OCR-related match',
      score: 84,
      explanation:
        'Identifiers align only after mapping common OCR confusions (O/0, I/1, S/5, B/8, Z/2). Human review is required.',
    }
  }
  const ratio = similarity(a.strong, b.strong)
  if (ratio >= 0.82 && Math.min(a.strong.length, b.strong.length) >= 6) {
    return {
      ...result,
      level: 'fuzzy',
      label: 'Partial or fuzzy match',
      score: Math.round(ratio * 100),
      fuzzy: true,
      explanation: `Identifiers are ${Math.round(
        ratio * 100,
      )}% similar after normalization. Similarity alone is not evidence of duplication.`,
    }
  }
  return { ...result, score: Math.round(ratio * 100) }
}

export function normalizeReference(value) {
  return strongNormalized(value)
}

export function normalizeInstitutionName(value) {
  return strongNormalized(value).replace(/INSTITUTE|COLLEGE|UNIVERSITY|CAMPUS|OF|THE/g, '')
}
