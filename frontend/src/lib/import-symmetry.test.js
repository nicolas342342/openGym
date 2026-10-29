// Symmetry: reading a Symmetry Tauro backup (lib/import-symmetry.js).
import { describe, expect, it } from 'vitest'
import { EXIDX } from './exercises.js'
import { SYM } from './ranks.js'
import { SYMMETRY_CUSTOM_EX } from './symmetry-plan.js'
import { SYMMETRY_IDS, TREADMILL, isSymmetryBackup, mergeSymmetry, ogWeight, parseSymmetryBackup } from './import-symmetry.js'

const at = (d, h) => new Date(d + 'T00:00:00').getTime() + h * 3600e3
const backup = () => ({
  v: 4, activeId: 'open',
  sessions: [
    { id: 's1', date: '2026-10-15', day: 'push', startedAt: at('2026-10-15', 18), finishedAt: at('2026-10-15', 19.2), note: 'Me quedé debajo de la barra 😅',
      entries: [
        { exId: 'press_inc_manc', unit: 'mc', sets: [{ w: 10, r: 12, t: 'w', done: true }, { w: 20, r: 10, t: 'e', done: true }, { w: 22, r: 8, t: 'f', done: true, note: 'fallo' }, { w: 24, r: '', t: 'e', done: false }] },
        { exId: 'jalon_gym80', unit: 'pl', sets: [{ w: 7.5, r: 10, t: 'e', done: true }] },
        { exId: 'press_inc_barra', unit: 'lado', sets: [{ w: 10, r: 8, t: 'e', done: true }] },
        { exId: 'ab_crunch_maq', unit: 'lb', sets: [{ w: 100, r: 15, t: 'e', done: true }] },
        { exId: 'mi_maquina', unit: 'kg', sets: [{ w: 30, r: 12, t: 'e', done: true }] },
      ],
      cardio: [{ id: 'c', type: 'Caminadora', min: 15, speed: 5.5, incline: 10, kcal: 160 }] },
    { id: 'empty', date: '2026-10-16', day: 'pull', startedAt: at('2026-10-16', 18), entries: [{ exId: 'face_pull', unit: 'pl', sets: [{ w: 3, r: 15, done: false }] }] },
    { id: 'open', date: '2026-10-28', day: 'legs', startedAt: at('2026-10-28', 18), entries: [{ exId: 'hack_squat', unit: 'lado', sets: [{ w: 30, r: 10, done: true }] }] },
  ],
  days: {
    '2026-10-15': { meals: [{ id: 'm1', name: 'Almuerzo de la abuela', kcal: 980, p: 48, c: 125, f: 28, at: at('2026-10-15', 13) }], water: 2500, walk: false, act: { steps: 7399, km: 4.98, kcalAct: 242, kcalTotal: 1149 } },
    '2026-10-16': { meals: [], water: 0 },
  },
  weights: { '2026-10-15': 71.2, '2026-10-16': 70.9 },
  customEx: [{ id: 'mi_maquina', name: 'Mi máquina rara', m: 'pecho' }],
})

describe('import-symmetry: weights', () => {
  it('keeps plates as plates; per side × 2 (+ bar), dumbbell as is, pounds, body weight', () => {
    expect(ogWeight('jalon_gym80', 'pl', 7)).toEqual({ kg: 7, plates: true, note: 'en placas' })
    // a machine logged in kg everywhere else: the odd plates set becomes kg, so it never mixes
    expect(ogWeight('ext_cuad', 'pl', 4)).toMatchObject({ kg: 40 })
    expect(ogWeight('prensa_45', 'lado', 40)).toMatchObject({ kg: 80 })
    expect(ogWeight('press_plano', 'lado', 20)).toMatchObject({ kg: 60, note: '20 kg/lado + barra 20' })
    expect(ogWeight('curl_martillo', 'mc', 5)).toMatchObject({ kg: 5, note: 'por mancuerna' })
    expect(ogWeight('ab_crunch_maq', 'lb', 100).kg).toBeCloseTo(45.359)
    expect(ogWeight('fondos', 'pc', 5)).toMatchObject({ kg: 0, note: 'lastre 5 kg' })
  })

  it('every mapped id is a catalogue exercise or a Tauro machine', () => {
    const own = new Set(SYMMETRY_CUSTOM_EX.map(c => c.id))
    for (const [k, id] of Object.entries(SYMMETRY_IDS)) expect(EXIDX[id] || own.has(id), k).toBeTruthy()
    expect(EXIDX[TREADMILL].bp).toBe('cardio')
  })
})

describe('import-symmetry: parse', () => {
  const p = parseSymmetryBackup(backup())

  it('rejects anything that is not a v4 backup', () => {
    expect(isSymmetryBackup(backup())).toBe(true)
    for (const bad of [null, {}, { v: 3, sessions: [] }, { v: 4 }]) expect(() => parseSymmetryBackup(bad)).toThrow()
  })

  it('keeps finished sessions only, with their sets, warm-ups and failures', () => {
    expect(p.workouts.map(w => w.d)).toEqual(['2026-10-15'])
    const w = p.workouts[0]
    expect(w).toMatchObject({ name: 'Push · Empuje', start: at('2026-10-15', 18), note: 'Me quedé debajo de la barra 😅' })
    const press = w.entries.find(e => e.id === '0314')
    expect(press.sets).toEqual([
      { w: 10, r: 12, done: true, phase: 'warmup' },
      { w: 20, r: 10, done: true },
      { w: 22, r: 8, done: true, failure: true },
    ])
    expect(press.topW).toBe(22)
    expect(press.note).toBe('por mancuerna · fallo')
    expect(w.entries.find(e => e.id === SYM.jalon).sets[0].w).toBe(7.5)
    expect(w.entries.find(e => e.id === '0047').sets[0].w).toBe(40)
    expect(w.entries.find(e => e.id === '1452').sets[0].w).toBeCloseTo(45.36)
    expect(w.entries.find(e => e.id === TREADMILL).sets).toEqual([{ min: 15, speed: 5.5, incline: 10, done: true }])
    expect(w.vol).toBe(20 * 10 + 22 * 8 + 7.5 * 10 + 40 * 8 + 45.36 * 15 + 30 * 12)
  })

  it('turns an unknown exercise into a custom one, named from the backup', () => {
    expect(p.customEx).toEqual([expect.objectContaining({ id: 'sym-mi-maquina', n: 'Mi máquina rara', custom: true, bp: 'chest' })])
    expect(p.unknown).toEqual([])
  })

  it('reads food days and weigh-ins', () => {
    expect(p.food['2026-10-15']).toEqual({ meals: [{ id: 'm1', name: 'Almuerzo de la abuela', kcal: 980, p: 48, c: 125, f: 28, at: at('2026-10-15', 13) }], water: 2500, act: { steps: 7399, km: 4.98, kcalAct: 242 } })
    expect(p.food['2026-10-16']).toBeUndefined()
    expect(p.bodyweight.map(b => [b.d, b.w])).toEqual([['2026-10-15', 71.2], ['2026-10-16', 70.9]])
  })

  it('a profile in pounds gets pounds', () => {
    const lb = parseSymmetryBackup(backup(), { unit: 'lb' })
    expect(lb.workouts[0].entries.find(e => e.id === '1452').sets[0].w).toBe(100)
    expect(lb.workouts[0].entries.find(e => e.id === SYM.jalon).sets[0].w).toBe(7.5)
    expect(lb.bodyweight[0].w).toBeCloseTo(156.97, 1)
  })
})

describe('import-symmetry: merge', () => {
  const empty = () => ({ unit: 'kg', workouts: [], bodyweight: [], customEx: [], exWeights: {} })

  it('adds everything once; a second import adds nothing', () => {
    const S = empty()
    const p = parseSymmetryBackup(backup())
    expect(mergeSymmetry(S, p, SYMMETRY_CUSTOM_EX)).toEqual({ workouts: 1, weighIns: 2, foodDays: 1, routines: 5 })
    expect(S.routines.map(r => r.name)).toEqual(['Push · Empuje', 'Pull · Tracción', 'Legs · Pierna', 'Upper · Torso', 'Lower · Cadena posterior'])
    expect(Object.keys(S.week).sort()).toEqual(['1', '2', '3', '4', '5'])
    expect(S.customEx.map(c => c.id)).toEqual(expect.arrayContaining([SYM.jalon, 'sym-mi-maquina']))
    expect(S.exWeights['0314']).toEqual({ w: 22, d: '2026-10-15' })
    expect(mergeSymmetry(S, parseSymmetryBackup(backup()), SYMMETRY_CUSTOM_EX)).toEqual({ workouts: 0, weighIns: 0, foodDays: 0, routines: 0 })
    expect(S.workouts).toHaveLength(1)
    expect(S.customEx.filter(c => c.id === SYM.jalon)).toHaveLength(1)
  })

  it('never overwrites a day already logged in openGym', () => {
    const S = { ...empty(), food: { '2026-10-15': { meals: [], water: 100, act: {} } }, bodyweight: [{ d: '2026-10-15', w: 72 }], routines: [{ id: 'mine', name: 'Mine', ex: [] }], week: { 1: ['mine'] } }
    expect(mergeSymmetry(S, parseSymmetryBackup(backup())).routines).toBe(0)
    expect(S.routines.map(r => r.id)).toEqual(['mine'])
    expect(S.week).toEqual({ 1: ['mine'] })
    expect(S.food['2026-10-15'].water).toBe(100)
    expect(S.bodyweight.find(b => b.d === '2026-10-15').w).toBe(72)
  })
})
