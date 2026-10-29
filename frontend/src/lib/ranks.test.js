// Symmetry: strength ranks and the athlete level (lib/ranks.js), ported from Symmetry Tauro.
import { describe, expect, it } from 'vitest'
import { EXIDX } from './exercises.js'
import { ISO, RANK_MUSCLE, STD, SYM, athleteLevel, bestLift, muscleRanks, nextRankTarget, rankInfo, rankUps, scoreOf } from './ranks.js'

const W = (d, id, sets) => ({ id: d + id, d, entries: [{ id, sets: sets.map(([w, r, more]) => ({ w, r, done: true, ...more })) }] })
const today = '2026-10-28'

describe('ranks: scores', () => {
  it('maps a 1RM onto 0-5 between the thresholds', () => {
    const t = [10, 20, 30, 40, 50]
    expect(scoreOf(t, 5)).toBe(0.5)
    expect(scoreOf(t, 10)).toBe(1)
    expect(scoreOf(t, 25)).toBe(2.5)
    expect(scoreOf(t, 99)).toBe(5)
  })

  it('names the rank and its I/II/III', () => {
    expect(rankInfo(0.9)).toMatchObject({ r: 0, key: 'none', sub: null })
    expect(rankInfo(1.1)).toMatchObject({ r: 1, key: 'bronze', sub: 0 })
    expect(rankInfo(2.5)).toMatchObject({ r: 2, key: 'silver', sub: 1 })
    expect(rankInfo(3.99)).toMatchObject({ r: 3, key: 'gold', sub: 2 })
    expect(rankInfo(5)).toMatchObject({ r: 5, key: 'diamond', sub: null })
  })

  it('every ranked id is a catalogue exercise or one of the Tauro machines', () => {
    const sym = new Set(Object.values(SYM))
    for (const id of Object.keys(STD)) expect(EXIDX[id] || sym.has(id), id).toBeTruthy()
    for (const ids of Object.values(RANK_MUSCLE)) for (const id of ids) expect(STD[id], id).toBeTruthy()
  })
})

describe('ranks: best lift', () => {
  it('Epley over the converted weight; warm-ups and old sessions do not count', () => {
    const S = { unit: 'kg', workouts: [
      W('2026-10-20', '0314', [[30, 10, { warmup: true }], [20, 10], [22, 8]]),
      W('2026-07-01', '0314', [[40, 10]]),
    ] }
    const b = bestLift(S, '0314', '2026-08-29')
    expect(b).toMatchObject({ kg: 22, r: 8, d: '2026-10-20' })
    expect(b.v).toBeCloseTo(22 * (1 + 8 / 30))
  })

  it('plate stacks read plates, never kg; wide pulldown kg ÷ 5.83; dumbbell RDL: ×2', () => {
    const S = { unit: 'lb', workouts: [W(today, SYM.jalon, [[7, 10]]), W(today, '2291', [[58.3, 10]]), W(today, '1459', [[44.0925, 10]])] }
    expect(bestLift(S, SYM.jalon, today).v).toBeCloseTo(7 * (1 + 10 / 30))
    expect(bestLift(S, '2291', today).v).toBeCloseTo(26.4486 / 5.83 * (1 + 10 / 30), 1)
    expect(bestLift(S, '1459', today).v).toBeCloseTo(40 * (1 + 10 / 30))
  })

  it('isolation: fewer than 8 reps, or a jump over 25%, is ignored', () => {
    expect(ISO.has('1030')).toBe(true)
    const S = { unit: 'kg', workouts: [W(today, '1030', [[40, 10], [60, 8], [45, 6], [48, 9]])] }
    expect(bestLift(S, '1030', today)).toMatchObject({ kg: 48, r: 9 })
  })

  it('a compound counts low reps', () => {
    const S = { unit: 'kg', workouts: [W(today, '0739', [[100, 10], [160, 3]])] }
    expect(bestLift(S, '0739', today)).toMatchObject({ kg: 160, r: 3 })
  })

  it('a profile in pounds is converted before the tables', () => {
    const S = { unit: 'lb', workouts: [W(today, '0314', [[44.0925, 10]])] }
    expect(bestLift(S, '0314', today).kg).toBeCloseTo(20)
  })
})

describe('ranks: muscles, level, targets', () => {
  const S = { unit: 'kg', workouts: [W(today, '0314', [[25, 10]]), W(today, '0739', [[150, 10]])] }
  const R = muscleRanks(S, today)

  it('a muscle takes its best exercise; untrained muscles are 0', () => {
    expect(R.chest.id).toBe('0314')
    expect(rankInfo(R.chest.score).key).toBe('platinum')
    expect(R.quads.id).toBe('0739')
    expect(R.glutes.id).toBe('0739')
    expect(R.calves).toEqual({ score: 0, id: null, best: null })
  })

  it('level 1-99 from the mean score', () => {
    expect(athleteLevel({}).level).toBe(1)
    const all5 = Object.fromEntries(Object.keys(RANK_MUSCLE).map(m => [m, { score: 5 }]))
    expect(athleteLevel(all5)).toMatchObject({ level: 99, ranked: 11 })
    const lv = athleteLevel(R)
    expect(lv.level).toBeGreaterThan(1)
    expect(lv.xp).toBeGreaterThanOrEqual(0)
    expect(lv.xp).toBeLessThan(100)
  })

  it('names the weight for the next rank at 10 reps', () => {
    const t = nextRankTarget(R.chest)
    expect(t.next).toBe(5)
    expect(t.kg).toBe(Math.ceil(40 / (1 + 10 / 30) * 2) / 2)
    expect(nextRankTarget({ score: 5, id: '0314', best: {} })).toBeNull()
  })

  it('reports only whole-rank ups', () => {
    expect(rankUps({ chest: { score: 1.2 } }, { chest: { score: 1.9 } })).toEqual([])
    expect(rankUps({ chest: { score: 1.9 } }, { chest: { score: 2.1 } })).toEqual(['chest'])
  })
})
