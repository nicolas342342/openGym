// Symmetry: food, activity and the energy balance (lib/nutrition.js), ported from Symmetry Tauro.
import { describe, expect, it } from 'vitest'
import {
  BASE_KCAL, GOALS, QUICK_MEALS, SNACKS, addDays, balanceStatus, cardioKcal, dayBalance, dayTotals, draftDay,
  dynamicTDEE, estimatedBurn, foodDay, mondayOf, trainingKcal, weekBalance, weightTrend, weighInsKg,
} from './nutrition.js'
import { EXIDX, isCardio } from './exercises.js'

const meal = (kcal, p = 0, c = 0, f = 0) => ({ id: String(Math.random()), name: 'x', kcal, p, c, f })
const at = (iso, h) => new Date(iso + 'T00:00:00').getTime() + h * 3600e3

describe('nutrition: days and totals', () => {
  it('reads a missing day as empty, and draftDay creates it in place', () => {
    const S = {}
    expect(foodDay(S, '2026-10-20')).toEqual({ meals: [], water: 0, act: {} })
    expect(S.food).toBeUndefined()
    draftDay(S, '2026-10-20').meals.push(meal(500, 30, 50, 10))
    draftDay(S, '2026-10-20').meals.push(meal(300, 20, 10, 5))
    expect(dayTotals(S, '2026-10-20')).toEqual({ kcal: 800, p: 50, c: 60, f: 15 })
  })

  it('keeps the goals and quick adds of the artifact', () => {
    expect(GOALS).toMatchObject({ kcal: 2550, p: 150, c: 341, f: 65, water: 3300, steps: 8000 })
    expect(QUICK_MEALS).toHaveLength(7)
    expect(SNACKS.find(s => s.name === 'Pan de bono')).toMatchObject({ kcal: 200, p: 6 })
  })

  it('date helpers go by local days, Monday first', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01')
    expect(mondayOf('2026-10-28')).toBe('2026-10-26')
    expect(mondayOf('2026-11-01')).toBe('2026-10-26')
  })
})

describe('nutrition: burn', () => {
  it('ACSM treadmill: walking below 8 km/h, running above', () => {
    // 5.5 km/h, 10%, 15 min at 71 kg: VO2 = 0.1·91.67 + 1.8·91.67·0.1 + 3.5 = 29.17
    expect(cardioKcal(5.5, 10, 15, 71)).toBe(Math.round(29.1667 * 71 / 1000 * 5 * 15))
    expect(cardioKcal(10, 0, 10, 71)).toBe(Math.round((0.2 * 10000 / 60 + 3.5) * 71 / 1000 * 5 * 10))
  })

  it('training: 5 kcal a minute, capped at 90 min; 15 a set without a duration; treadmill added', () => {
    const lift = { id: '0314', sets: [{ w: 20, r: 10, done: true }, { w: 22, r: 8, done: true }, { w: 10, r: 10, done: true, warmup: true }] }
    const S = { unit: 'kg', bodyweight: [], workouts: [
      { id: 'a', d: '2026-10-20', start: at('2026-10-20', 18), end: at('2026-10-20', 19), entries: [lift] },
      { id: 'b', d: '2026-10-21', start: at('2026-10-21', 18), end: at('2026-10-21', 23), entries: [lift] },
      { id: 'c', d: '2026-10-22', start: at('2026-10-22', 18), entries: [lift] },
    ] }
    expect(trainingKcal(S, '2026-10-20')).toBe(300)
    expect(trainingKcal(S, '2026-10-21')).toBe(450)
    expect(trainingKcal(S, '2026-10-22')).toBe(2 * 15)   // the warm-up is not a set
    expect(trainingKcal(S, '2026-10-23')).toBe(0)
    const walk = { id: Object.keys(EXIDX).find(id => isCardio(id)), sets: [{ min: 15, speed: 5.5, incline: 10, done: true }] }
    S.workouts.push({ id: 'd', d: '2026-10-23', start: at('2026-10-23', 7), entries: [walk] })
    expect(trainingKcal(S, '2026-10-23')).toBe(cardioKcal(5.5, 10, 15, 71))
  })

  it('estimated burn prefers Samsung active kcal, else steps × 0.028', () => {
    const S = { food: { '2026-10-17': { meals: [], act: { steps: 7399, kcalAct: 242 } }, '2026-10-18': { meals: [], act: { steps: 10000 } } } }
    expect(estimatedBurn(S, '2026-10-17')).toMatchObject({ est: BASE_KCAL + 242, actSrc: 'samsung' })
    expect(estimatedBurn(S, '2026-10-18')).toMatchObject({ est: BASE_KCAL + 280, actSrc: 'steps' })
  })
})

describe('nutrition: weight trend and dynamic TDEE', () => {
  it('EWMA α 0.12 over weigh-ins in kg, lb converted', () => {
    const S = { unit: 'kg', bodyweight: [{ d: '2026-10-02', w: 72 }, { d: '2026-10-01', w: 70 }] }
    const { trend, last } = weightTrend(S)
    expect(trend['2026-10-01']).toBe(70)
    expect(last).toBeCloseTo(0.12 * 72 + 0.88 * 70)
    expect(weighInsKg({ unit: 'lb', bodyweight: [{ d: '2026-10-01', w: 100 }] })[0].kg).toBeCloseTo(45.359)
  })

  it('needs 8 weigh-ins over 10 days and 10 days with meals', () => {
    const today = '2026-10-28'
    const S = { unit: 'kg', bodyweight: [], food: {} }
    expect(dynamicTDEE(S, today)).toEqual({ ready: false, weighIns: 8, mealDays: 10 })
    for (let i = 0; i < 14; i++) {
      const d = addDays(today, -13 + i)
      draftDay(S, d).meals.push(meal(2500))
      if (i % 2 === 0 || i === 13) S.bodyweight.push({ d, w: 70 + i * 0.01 })
    }
    const r = dynamicTDEE(S, today)
    expect(r.ready).toBe(true)
    expect(r.intake).toBe(2500)
    // Weight going up means part of the intake was stored, so the burn is below 2,500.
    expect(r.tdee).toBeLessThan(2500)
    expect(r.tdee).toBe(Math.round(2500 - r.dW * 7700 / r.span))
  })

  it('a ready TDEE replaces the estimate, so Samsung is not added on top', () => {
    const S = { food: { '2026-10-28': { meals: [meal(2000, 120)], act: { kcalAct: 400 } } } }
    expect(dayBalance(S, '2026-10-28', { ready: false })).toMatchObject({ spent: BASE_KCAL + 400, real: false, diff: 2000 - BASE_KCAL - 400 })
    expect(dayBalance(S, '2026-10-28', { ready: true, tdee: 2600 })).toMatchObject({ spent: 2600, real: true, diff: -600 })
  })

  it('status bands and the week summary', () => {
    expect([-600, -300, 0, 300, 301].map(balanceStatus)).toEqual(['bigDeficit', 'deficit', 'recomp', 'recomp', 'surplus'])
    const S = { food: { '2026-10-26': { meals: [meal(2000, 100)] }, '2026-10-27': { meals: [meal(3000, 200)] } } }
    const w = weekBalance(S, '2026-10-28', '2026-10-28')
    expect(w.mon).toBe('2026-10-26')
    expect(w.days).toHaveLength(7)
    expect(w.days.filter(d => d.future).map(d => d.iso)).toEqual(['2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01'])
    expect(w).toMatchObject({ logged: 2, eaten: 2500, p: 150, spent: BASE_KCAL })
  })
})
