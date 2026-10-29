import { can, PERMISSIONS } from '../data/users'
import { demoStore, getCurrentUser } from './demoDataService'
import { appendAuditEvent } from './auditService'

function nextInstitutionNumber(institutions) {
  let max = 1000
  institutions.forEach((institution) => {
    const match = String(institution.id).match(/INST-(\d+)/)
    if (match) max = Math.max(max, Number(match[1]))
  })
  return max + 1
}

export function validateInstitutionForm(form) {
  const errors = {}
  if (!form.name?.trim()) errors.name = 'Institution name is required.'
  if (!form.city?.trim()) errors.city = 'City is required.'
  if (!form.state?.trim()) errors.state = 'State is required.'
  if (!form.category?.trim()) errors.category = 'Category is required.'
  if (!form.officer?.trim()) errors.officer = 'Responsible officer is required.'
  if (!form.contact?.trim()) errors.contact = 'Contact email is required.'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contact)) errors.contact = 'Enter a valid email address.'
  return errors
}

export function createInstitution(form, userOverride) {
  const user = userOverride ?? getCurrentUser()
  if (!can(user.role, PERMISSIONS.INSTITUTION_MANAGE)) {
    return { ok: false, reason: `Role "${user.role}" cannot register institutions.` }
  }
  const errors = validateInstitutionForm(form)
  if (Object.keys(errors).length) return { ok: false, errors }
  const state = demoStore.getState()
  const nameExists = state.institutions.some(
    (institution) => institution.name.toLowerCase() === form.name.trim().toLowerCase(),
  )
  if (nameExists) return { ok: false, errors: { name: 'An institution with this name already exists.' } }

  const id = `INST-${nextInstitutionNumber(state.institutions)}`
  const institution = {
    id,
    name: form.name.trim(),
    shortName: form.shortName?.trim() || form.name.trim(),
    city: form.city.trim(),
    state: form.state.trim(),
    category: form.category,
    officer: form.officer.trim(),
    officerId: null,
    established: Number(form.established) || new Date().getFullYear(),
    status: 'active',
    contact: form.contact.trim(),
    code: form.code?.trim() || `DEMO-${id.replace('INST-', '')}`,
  }
  demoStore.update((draft) => {
    draft.institutions.push(institution)
    appendAuditEvent(draft, {
      action: 'institution.created',
      entityType: 'institution',
      entityId: id,
      summary: `Institution ${institution.name} registered in ${institution.city}, ${institution.state}.`,
      previousState: null,
      newState: 'active',
      reason: 'Registered through the prototype institution management screen.',
      outcome: 'success',
      role: user.role,
      actor: user,
    })
  })
  return { ok: true, id }
}

export function updateInstitution(institutionId, patch, userOverride) {
  const user = userOverride ?? getCurrentUser()
  if (!can(user.role, PERMISSIONS.INSTITUTION_MANAGE)) {
    return { ok: false, reason: `Role "${user.role}" cannot edit institutions.` }
  }
  const state = demoStore.getState()
  const institution = state.institutions.find((item) => item.id === institutionId)
  if (!institution) return { ok: false, reason: 'Institution not found.' }
  const allowed = ['name', 'shortName', 'city', 'state', 'category', 'officer', 'contact', 'status', 'code']
  const changes = {}
  allowed.forEach((field) => {
    if (patch[field] !== undefined && patch[field] !== institution[field]) {
      changes[field] = String(patch[field]).trim()
    }
  })
  if (!Object.keys(changes).length) return { ok: false, reason: 'No values were changed.' }
  if (!changes.name && patch.name !== undefined) return { ok: false, reason: 'Institution name is required.' }
  demoStore.update((draft) => {
    const target = draft.institutions.find((item) => item.id === institutionId)
    Object.assign(target, changes)
    draft.instruments.forEach((instrument) => {
      if (instrument.institutionId === institutionId && changes.name) {
        instrument.institutionName = changes.name
        if (instrument.holder === institution.name) instrument.holder = changes.name
      }
    })
    appendAuditEvent(draft, {
      action: 'institution.updated',
      entityType: 'institution',
      entityId: institutionId,
      summary: `Institution ${institution.name} metadata updated (${Object.keys(changes).join(', ')}).`,
      previousState: JSON.stringify(
        Object.fromEntries(Object.keys(changes).map((field) => [field, institution[field]])),
      ),
      newState: JSON.stringify(changes),
      reason: patch.reason?.trim() || 'Institution metadata updated in the demo workspace.',
      outcome: 'success',
      role: user.role,
      actor: user,
    })
  })
  return { ok: true, changedFields: Object.keys(changes) }
}
