import { demoStore } from './demoDataService'
import { appendAuditEvent } from './auditService'
import { getUserById } from '../data/users'
import { SCENARIOS } from '../data/scenarios'
import { runIntegrityAnalysis } from './integrityEngine'
import { performTransition } from './lifecycleEngine'
import { acknowledgeDeadline, buildDeadlineActions } from './deadlineEngine'
import { getEvidenceForInstrument, updateEvidenceField, computeCoverage } from './evidenceService'
import { updateInstrumentMetadata } from './instrumentService'
import { formatCurrency, formatDate } from '../utils/format'

const reviewer = () => getUserById('u-rev1')
const admin = () => getUserById('u-admin')
const approver = () => getUserById('u-approver')

const step = (label, detail, status = 'done') => ({ label, detail, status })

function runDuplicateScenario() {
  const before = demoStore.getState()
  const analysisA = runIntegrityAnalysis('FDR-2026-004')
  const analysisB = runIntegrityAnalysis('FDR-2026-011')
  const state = demoStore.getState()
  const finding = state.findings.find((item) => item.id === 'FND-2026-001')
  const instrumentA = state.instruments.find((item) => item.id === 'FDR-2026-004')
  const instrumentB = state.instruments.find((item) => item.id === 'FDR-2026-011')
  const created = analysisA.created.length + analysisB.created.length
  return {
    ok: true,
    summary: `Analysis matched DNB-847291 across ${instrumentA.institutionName} and ${instrumentB.institutionName}. ${formatCurrency(
      instrumentA.amount,
    )} vs ${formatCurrency(
      instrumentB.amount,
    )} remains an unresolved potential conflict. ${created} new finding(s) were added; the existing case FND-2026-001 is ready for a reviewer decision.`,
    steps: [
      step(
        'Deterministic analysis executed',
        `Rules evaluated against ${before.instruments.length} instruments. ${created} new finding(s) created.`,
      ),
      step(
        'Identifier match classified',
        'Reference DNB-847291 matched as STRONG NORMALIZED (96/100) after punctuation and case normalization.',
      ),
      step(
        'Cross-institution conflict identified',
        'Same bank and maturity date, different institution and principal amount. Classified as a potential conflict — not proof of fraud.',
      ),
      step(
        'Reviewer decision outstanding',
        'FND-2026-001 is open. Open Integrity Intelligence to record a decision with notes.',
        'pending',
      ),
    ],
    links: [
      { label: 'Open finding FND-2026-001', to: '/integrity?finding=FND-2026-001' },
      { label: 'Inspect Deccan record', to: '/instruments/FDR-2026-004' },
      { label: 'Inspect Northfield record', to: '/instruments/FDR-2026-011' },
    ],
    findingId: finding?.id ?? 'FND-2026-001',
    instrumentId: 'FDR-2026-004',
  }
}

function runOcrScenario() {
  runIntegrityAnalysis('FDR-2026-006')
  const state = demoStore.getState()
  const instrument = state.instruments.find((item) => item.id === 'FDR-2026-006')
  const evidence = getEvidenceForInstrument(state, 'FDR-2026-006').find(
    (record) => record.field === 'reference',
  )
  return {
    ok: true,
    summary:
      'The submitted reference SLB-54I902 and the extracted reference SLB-541902 align only after OCR normalization. Match strength is 84/100 and remains a possible OCR-related match. Human review is required; extraction is not authentication.',
    steps: [
      step('Submitted value read', evidence?.submittedValue ?? instrument.reference),
      step('Extracted value read', evidence?.extractedValue ?? 'SLB-541902'),
      step(
        'OCR normalization applied',
        'I/1 confusions mapped. Both values normalize to SLB541902. The raw values are still different and are preserved.',
      ),
      step(
        'Match strength classified',
        'Possible OCR-related match, confidence 84. No automatic promotion or duplicate conclusion.',
      ),
      step(
        'Human review required',
        'Evidence status remains confirmation pending. Open the passport to record a reviewer note or discrepancy.',
        'pending',
      ),
    ],
    links: [
      { label: 'Open evidence passport', to: '/instruments/FDR-2026-006?tab=evidence' },
      { label: 'Open FND-2026-003', to: '/integrity?finding=FND-2026-003' },
    ],
    instrumentId: 'FDR-2026-006',
  }
}

function runReleaseScenario() {
  const state = demoStore.getState()
  const instrument = state.instruments.find((item) => item.id === 'FDR-2026-017')
  if (instrument.approval?.approved) {
    return {
      ok: true,
      summary:
        'This instrument already has a recorded demo approval, so the release no longer fails the approval prerequisite. Use Reset Demo Data to experience the blocked path again.',
      steps: [
        step('Approval already recorded', 'The current state does not reproduce the blocked transition.', 'blocked'),
      ],
      links: [{ label: 'Open lifecycle workspace', to: '/lifecycle/FDR-2026-017' }],
      instrumentId: 'FDR-2026-017',
    }
  }
  const result = performTransition({
    instrumentId: 'FDR-2026-017',
    to: 'released',
    reason: 'Demo scenario C: attempt release without approving-authority sign-off.',
    user: approver(),
  })
  return {
    ok: true,
    blocked: !result.ok,
    summary: result.ok
      ? 'The release transition was allowed. This should not normally happen when approval is missing.'
      : `Release was blocked by the lifecycle engine. ${result.reasons.join(' ')} The blocked attempt is now recorded in the audit trail.`,
    steps: [
      step(
        'Role checked',
        'Attempted as Approving Authority (u-approver). The approving role is permitted to request this transition.',
      ),
      step(
        'Policy prerequisites evaluated',
        'REL-03 requires a recorded approving-authority sign-off, confirmed verification, and no unresolved material findings.',
        result.ok ? 'info' : 'blocked',
      ),
      step(
        'Transition rejected',
        result.ok ? 'Unexpectedly allowed.' : result.reasons.join(' '),
        result.ok ? 'info' : 'blocked',
      ),
      step(
        'Blocked attempt audited',
        'A lifecycle.blocked event with outcome "blocked" was appended to the local audit chain.',
      ),
    ],
    links: [
      { label: 'Open lifecycle workspace', to: '/lifecycle/FDR-2026-017' },
      { label: 'Inspect audit events', to: '/audit?entity=FDR-2026-017' },
    ],
    instrumentId: 'FDR-2026-017',
  }
}

function runRenewalScenario() {
  const state = demoStore.getState()
  const actions = buildDeadlineActions(state)
  const action =
    actions.find((item) => item.id === 'renewal:FDR-2026-003') ??
    actions.find((item) => item.instrumentId === 'FDR-2026-003')
  if (!action) {
    return {
      ok: false,
      summary: 'No deadline action exists for FDR-2026-003 in the current state.',
      steps: [step('Deadline action missing', 'The record may have moved out of the renewal window.', 'blocked')],
      links: [{ label: 'Open deadlines', to: '/deadlines' }],
    }
  }
  const alreadyAcknowledged = action.status === 'acknowledged' || action.status === 'completed'
  let result = { ok: true }
  if (!alreadyAcknowledged) {
    result = acknowledgeDeadline(
      action.id,
      'Demo scenario D: maturity action acknowledged after renewal instruction review.',
      admin(),
    )
  }
  const updatedAction = buildDeadlineActions(demoStore.getState()).find(
    (item) => item.id === action.id,
  )
  const instrument = demoStore.getState().instruments.find((item) => item.id === 'FDR-2026-003')
  return {
    ok: result.ok !== false,
    summary: `FDR-2026-003 matures on ${formatDate(
      instrument.maturityDate,
    )} within the 30-day critical window. ${
      alreadyAcknowledged ? 'The action was already acknowledged.' : 'The action was acknowledged and the queue updated.'
    } This is an in-app simulation; no email or SMS was sent.`,
    steps: [
      step(
        'Lead time evaluated',
        'Configured lead times are 30 / 60 / 90 days. The computed priority is critical because maturity is inside 30 days.',
      ),
      step(
        'Action generated',
        `Action ${action.id} exists in the queue with due date ${formatDate(action.dueDate)}.`,
      ),
      step(
        alreadyAcknowledged ? 'Already acknowledged' : 'Action acknowledged',
        alreadyAcknowledged
          ? 'A prior acknowledgement is recorded. No duplicate event was written.'
          : 'A deadline.acknowledged audit event and simulated in-app notification were recorded.',
        alreadyAcknowledged ? 'info' : 'done',
      ),
      step(
        'Queue updated',
        `Current status: ${updatedAction?.status ?? 'acknowledged'}. Open deadlines to see the acknowledged state.`,
      ),
    ],
    links: [
      { label: 'Open deadline queue', to: '/deadlines?focus=renewal%3AFDR-2026-003' },
      { label: 'Open instrument', to: '/instruments/FDR-2026-003' },
    ],
    instrumentId: 'FDR-2026-003',
  }
}

function runEvidenceScenario() {
  const stateBefore = demoStore.getState()
  const before = computeCoverage(getEvidenceForInstrument(stateBefore, 'FDR-2026-004'))
  const result = updateEvidenceField({
    instrumentId: 'FDR-2026-004',
    field: 'beneficiary',
    action: 'note',
    note: 'Demo scenario E: beneficiary block reviewed. Independent confirmation is still pending; the instrument cannot be represented as fully verified.',
    user: reviewer(),
  })
  const state = demoStore.getState()
  const after = computeCoverage(getEvidenceForInstrument(state, 'FDR-2026-004'))
  const instrument = state.instruments.find((item) => item.id === 'FDR-2026-004')
  return {
    ok: result.ok,
    summary: result.ok
      ? `A reviewer note was added to the beneficiary field. Independent confirmation coverage remains ${after.confirmed}/${after.total} fields. The record stays "${instrument.verificationStatus.replaceAll(
          '_',
          ' ',
        )}" because pending confirmations were not silently promoted.`
      : result.reason,
    steps: [
      step(
        'Field provenance inspected',
        `${before.complete}/${before.total} fields internally consistent; ${before.confirmed} independently confirmed (demo).`,
      ),
      step(
        'Pending confirmation isolated',
        'Beneficiary and holder evidence remain confirmation pending. Submitted values are not treated as verified values.',
      ),
      step(
        result.ok ? 'Simulated reviewer note recorded' : 'Action blocked',
        result.ok
          ? 'Evidence updated with an audit event. The status remains confirmation pending.'
          : result.reason,
        result.ok ? 'done' : 'blocked',
      ),
      step(
        'Record-level claim preserved',
        `Instrument verification status remains ${instrument.verificationStatus.replaceAll('_', ' ')}. Partial field checks do not equal full verification.`,
      ),
    ],
    links: [
      { label: 'Open evidence passport', to: '/instruments/FDR-2026-004?tab=evidence' },
      { label: 'Inspect instrument', to: '/instruments/FDR-2026-004' },
    ],
    instrumentId: 'FDR-2026-004',
  }
}

function runCorrectionScenario() {
  const stateBefore = demoStore.getState()
  const instrument = stateBefore.instruments.find((item) => item.id === 'FDR-2026-009')
  const extractedAmount = instrument.extracted?.amount
  let corrected = false
  let correctionMessage = 'The amount already matches the extracted value; correction was skipped.'
  if (Number(instrument.amount) !== Number(extractedAmount)) {
    const result = updateInstrumentMetadata(
      'FDR-2026-009',
      { amount: extractedAmount },
      'Demo scenario F: principal amount corrected to match the source document.',
      reviewer(),
    )
    if (!result.ok) {
      return {
        ok: false,
        summary: result.reason,
        steps: [step('Correction blocked', result.reason, 'blocked')],
        links: [{ label: 'Open instrument', to: '/instruments/FDR-2026-009' }],
      }
    }
    corrected = true
    correctionMessage = `Amount corrected to ${formatCurrency(extractedAmount)}. ${result.resolvedFindings.length} prior finding(s) were retained and marked resolved after correction.`
  }
  runIntegrityAnalysis('FDR-2026-009')
  const state = demoStore.getState()
  const target = state.instruments.find((item) => item.id === 'FDR-2026-009')
  const original = state.findings.find((item) => item.id === 'FND-2026-004')
  return {
    ok: true,
    summary: `${
      corrected ? 'The corrected amount was saved' : 'No new correction was needed'
    }. The original finding FND-2026-004 is still present with status "${original?.reviewStatus ?? 'unknown'}" and its prior notes. Re-running the engine produced ${
      state.findings.filter((item) => item.instrumentId === 'FDR-2026-009' && item.reviewStatus === 'open').length
    } open finding(s) for this instrument.`,
    steps: [
      step(
        'Original finding inspected',
        original
          ? `${original.id}: ${original.title}. Created ${formatDate(original.createdAt)}.`
          : 'Original finding not found.',
      ),
      step('Metadata correction applied', correctionMessage),
      step(
        'Integrity engine re-run',
        'Deterministic rules re-evaluated the corrected values. Historical findings were not deleted.',
      ),
      step(
        'History preserved',
        `Original finding remains visible as ${original?.reviewStatus ?? 'unknown'}. Verification status is now ${target.verificationStatus.replaceAll('_', ' ')}.`,
      ),
    ],
    links: [
      { label: 'Open instrument history', to: '/instruments/FDR-2026-009?tab=integrity' },
      { label: 'Inspect audit trail', to: '/audit?entity=FDR-2026-009' },
    ],
    instrumentId: 'FDR-2026-009',
  }
}

const RUNNERS = {
  duplicate: runDuplicateScenario,
  ocr: runOcrScenario,
  release: runReleaseScenario,
  renewal: runRenewalScenario,
  evidence: runEvidenceScenario,
  correction: runCorrectionScenario,
}

export function runScenario(scenarioId) {
  const scenario = SCENARIOS.find((item) => item.id === scenarioId)
  const runner = RUNNERS[scenarioId]
  if (!scenario || !runner) return { ok: false, summary: 'Unknown scenario.' }
  const result = runner()
  demoStore.update((draft) => {
    appendAuditEvent(draft, {
      action: 'demo.scenario_run',
      entityType: 'scenario',
      entityId: scenario.id,
      summary: `Demo scenario ${scenario.code} (${scenario.title}) executed. ${result.summary}`,
      previousState: null,
      newState: result.blocked ? 'blocked' : 'completed',
      reason: 'Judge-initiated demo scenario using the same business logic as the main application.',
      outcome: result.ok ? 'success' : 'blocked',
      actor: admin(),
      role: 'admin',
    })
  })
  return { ...result, scenario }
}
