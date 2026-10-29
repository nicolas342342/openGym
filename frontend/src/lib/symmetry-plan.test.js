// Symmetry: Nico's 5-day starter plan (lib/symmetry-plan.js through lib/starter.js).
import { describe, expect, it } from 'vitest'
import { buildStarterPlan } from './starter.js'
import { SYMMETRY_CUSTOM_EX } from './symmetry-plan.js'
import { SYM, STD } from './ranks.js'

describe('symmetry starter plan', () => {
  const plan = buildStarterPlan('symmetry')

  it('carries the rep range, the rest and the RIR of RUTINA_V2', () => {
    const push = plan.routines[0]
    expect(push.ex[0]).toMatchObject({ id: '0314', sets: 3, reps: 10, repsMin: 8, restSec: 180, note: 'RIR 2', weight: 0 })
    expect(push.ex[3]).toMatchObject({ id: '1030', reps: 12, repsMin: 10, restSec: 90, note: 'RIR 1→0' })
    const lower = plan.routines[4]
    expect(lower.ex[1].note).toMatch(/glúteo/)
  })

  it('brings the Tauro machines as custom exercises, fresh copies each time', () => {
    expect(plan.customEx.map(c => c.id).sort()).toEqual(Object.values(SYM).sort())
    for (const c of plan.customEx) expect(c).toMatchObject({ custom: true, eq: 'leverage machine' })
    plan.customEx[0].n = 'changed'
    expect(SYMMETRY_CUSTOM_EX[0].n).not.toBe('changed')
  })

  it('every lift of the routine that has a rank table is one ranks.js knows', () => {
    const ids = plan.routines.flatMap(r => r.ex.map(e => e.id))
    for (const id of Object.values(SYM)) expect(ids).toContain(id)
    for (const id of Object.values(SYM)) expect(STD[id]).toBeTruthy()
  })
})
