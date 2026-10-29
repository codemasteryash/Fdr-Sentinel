import { beforeEach, describe, expect, it } from 'vitest'
import { SCENARIOS } from '../data/scenarios'
import { runScenario } from '../services/scenarioService'
import { demoStore, setRole } from '../services/demoDataService'
import { verifyAuditChain } from '../utils/hash'

beforeEach(() => {
  demoStore.reset({ keepRole: false })
  setRole('admin')
})

describe('guided demo scenarios', () => {
  it('defines six scenarios with valid routes and instrument links', () => {
    expect(SCENARIOS).toHaveLength(6)
    SCENARIOS.forEach((scenario) => {
      expect(scenario.title).toBeTruthy()
      expect(scenario.route.startsWith('/')).toBe(true)
      expect(
        demoStore.getState().instruments.some((item) => item.id === scenario.instrumentId),
      ).toBe(true)
    })
  })

  SCENARIOS.forEach((scenario) => {
    it(`runs scenario ${scenario.code}: ${scenario.title}`, () => {
      const result = runScenario(scenario.id)
      expect(result.ok).toBe(true)
      expect(result.summary.length).toBeGreaterThan(20)
      expect(Array.isArray(result.steps)).toBe(true)
      expect(result.steps.length).toBeGreaterThan(0)
      const event = demoStore
        .getState()
        .auditEvents.find(
          (item) => item.action === 'demo.scenario_run' && item.entityId === scenario.id,
        )
      expect(event).toBeTruthy()
      expect(verifyAuditChain(demoStore.getState().auditEvents).valid).toBe(true)
    })
  })

  it('reports the expected blocked release rather than an application error', () => {
    const result = runScenario('release')
    expect(result.blocked).toBe(true)
    expect(result.summary).toMatch(/blocked/i)
  })
})
