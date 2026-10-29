// Symmetry: the JSON backup of Symmetry Tauro (Settings → "Exportar copia", state v4) read into
// openGym. Sessions become workouts, `days` become S.food, `weights` become weigh-ins.
//
// Weights (ogWeight): kg per side × 2 (+ a 20 kg bar on barbell lifts), one dumbbell as is,
// pounds converted, plates kept as a count of plates, body weight as 0 with the added load in
// the note. The unit it was logged in goes into the exercise's note.
import { SYM } from './ranks.js'
import { mergeImport, importId, roundWeight } from './import-csv.js'
import { isWarmupRow, completedVolumeOf } from './workout-model.js'
import { EXIDX } from './exercises.js'
import { clampIncline, inclineFrom } from './incline.js'
import { buildStarterPlan } from './starter.js'

const LB = 0.45359237
// Artifact exercise id → openGym id (catalogue looked up by the artifact's EN_NAME; the Tauro
// machines are this fork's custom exercises).
export const SYMMETRY_IDS = {
  press_inc_manc: '0314', press_inc_barra: '0047', press_inc_multi: '0757', press_inc_maq: '1299',
  press_plano_conv: '0576', cybex_chest: SYM.cybex, press_plano: '0025', press_plano_manc: '0289',
  pec_deck: '1030', aperturas_polea: '0227', fondos: '0251',
  elev_lat_maq: '0584', elev_lat_polea: '0178', elev_lat_manc: '0334',
  press_militar_manc: '0405', press_militar_maq: '0603', face_pull: '11060',
  ext_triceps_cuerda: '0200', ext_triceps_triangulo: '0241', ext_triceps_unilateral: '1723',
  ext_overhead: '0194', seated_dip: '1451', press_frances: '5873',
  jalon_gym80: SYM.jalon, jalon_ancho: '2291', jalon_neutro: '7583',
  remo_pecho_gym80: SYM.remoPecho, remo_t: '0606', remo_polea_v: '0861', remo_manc: '0292', remo_barra: '0027',
  curl_inclinado: '0318', curl_martillo: '0313', curl_polea: '0868', curl_predicador_manc: '3084',
  crunch_polea: '0175', ab_crunch_maq: '1452', elev_piernas: '0472', plancha: '0463',
  prensa_45: '0739', prensa_gluteo: '0739', hack_squat: '0743', sentadilla_multi: '0770',
  bulgara: '2290', zancadas: '4295', ext_cuad: '0585',
  curl_femoral: '0586', curl_femoral_sentado: '0599',
  elev_talones_pie: '0605', elev_talones_multi: '1050', elev_talones_prensa: '1391', elev_talones_sentado: '0594',
  pmr: '1459', pmr_barra: '0085',
}
const BARBELL = new Set(['press_inc_barra', 'press_inc_multi', 'press_plano', 'remo_barra', 'pmr_barra', 'sentadilla_multi', 'elev_talones_multi'])
export const TREADMILL = '3666' // walking on incline treadmill
const DAY_NAME = { push: 'Push · Empuje', pull: 'Pull · Tracción', legs: 'Legs · Pierna', upper: 'Upper · Torso', lower: 'Lower · Cadena posterior' }
// The artifact's muscle keys, for the body part of one of its own custom exercises.
const BP = { pecho: 'chest', espalda: 'back', hombro: 'shoulders', biceps: 'upper arms', triceps: 'upper arms', antebrazo: 'lower arms', abdomen: 'waist', gluteos: 'upper legs', cuadriceps: 'upper legs', isquios: 'upper legs', gemelos: 'lower legs' }
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/
const n0 = v => (Number.isFinite(+v) ? +v : 0)
const fmt = n => String(+(+n).toFixed(2))

// Machines Nico logs in kg (their rank table is in kg too): the odd set logged in plates there is
// turned into kg (≈10 kg a plate, the artifact's fallback) so one exercise never mixes the two.
const KG_MACHINES = new Set(['pec_deck', 'elev_lat_maq', 'ext_cuad', 'curl_femoral', 'curl_femoral_sentado', 'elev_talones_pie',
  'elev_talones_prensa', 'elev_talones_sentado', 'prensa_45', 'prensa_gluteo', 'hack_squat', 'remo_t', 'jalon_ancho', 'jalon_neutro'])

/**
 * One logged weight as openGym stores it, and how it was logged. Plates stay a count of plates
 * (`plates: true`): what a plate weighs on each Tauro stack is unknown, and a guess shows up as
 * a 100 kg pulldown. Everything else is kg (lb converted).
 */
export function ogWeight(exId, unit, w) {
  w = n0(w)
  if (unit === 'lb') return { kg: w * LB, note: '' }
  if (unit === 'pl' && KG_MACHINES.has(exId)) return { kg: w * 10, note: `${fmt(w)} placas (≈10 kg c/u)` }
  if (unit === 'pl') return { kg: w, plates: true, note: 'en placas' }
  if (unit === 'lado') return { kg: BARBELL.has(exId) ? w * 2 + 20 : w * 2, note: `${fmt(w)} kg/lado${BARBELL.has(exId) ? ' + barra 20' : ''}` }
  if (unit === 'mc') return { kg: w, note: 'por mancuerna' }
  if (unit === 'pc') return { kg: 0, note: w ? `lastre ${fmt(w)} kg` : '' }
  return { kg: w, note: '' }
}

/** Whether `data` looks like a Symmetry Tauro backup. */
export const isSymmetryBackup = data => !!data && typeof data === 'object' && data.v === 4 && Array.isArray(data.sessions)

/**
 * The backup as openGym data: { workouts, customEx, food, bodyweight, unknown } with weights in
 * `unit`. Sessions with no completed set are left out (an abandoned or still-open one).
 */
export function parseSymmetryBackup(data, { unit = 'kg' } = {}) {
  if (!isSymmetryBackup(data)) throw new Error('not a Symmetry Tauro backup')
  const toUnit = kg => roundWeight(unit === 'lb' ? kg / LB : kg)
  const own = new Map()
  const unknown = new Set()
  const idOf = exId => {
    if (SYMMETRY_IDS[exId]) return SYMMETRY_IDS[exId]
    // The artifact's own custom exercises (made in its coach): one of ours each.
    const c = (data.customEx || []).find(x => x?.id === exId)
    const id = 'sym-' + String(exId).toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)
    if (!own.has(id)) own.set(id, { id, n: c?.name || exId, custom: true, eq: 'custom', bp: BP[c?.m] || 'upper legs', tg: '', desc: '' })
    if (!c) unknown.add(exId)
    return id
  }

  const workouts = []
  for (const s of data.sessions) {
    if (!s || !ISO_DAY.test(s.date) || s.id === data.activeId) continue
    const entries = []
    for (const e of Array.isArray(s.entries) ? s.entries : []) {
      const done = (Array.isArray(e?.sets) ? e.sets : []).filter(x => x && x.done)
      if (!done.length) continue
      const notes = new Set()
      const sets = done.map(x => {
        const ow = ogWeight(e.exId, e.unit, x.w)
        if (ow.note) notes.add(ow.note)
        if (x.note) notes.add(String(x.note))
        return { w: ow.plates ? roundWeight(ow.kg) : toUnit(ow.kg), r: Math.max(0, Math.round(n0(x.r))), done: true, ...(x.t === 'w' ? { phase: 'warmup' } : {}), ...(x.t === 'f' ? { failure: true } : {}) }
      })
      const id = idOf(e.exId)
      const mx = Math.max(0, ...sets.filter(x => !isWarmupRow(x)).map(x => x.w))
      const note = [...notes].join(' · ').slice(0, 280)
      entries.push({ id, sets, topW: mx || null, ...(note ? { note } : {}) })
    }
    const cardio = (Array.isArray(s.cardio) ? s.cardio : []).filter(c => n0(c?.min) > 0)
    if (cardio.length) entries.push({ id: TREADMILL, sets: cardio.map(c => ({ min: n0(c.min), speed: n0(c.speed), ...inclineFrom({ incline: clampIncline(n0(c.incline)) }), done: true })) })
    if (!entries.length) continue
    const base = new Date(s.date + 'T00:00:00').getTime()
    const start = Number.isFinite(+s.startedAt) && +s.startedAt > 0 ? +s.startedAt : base + 18 * 3600000
    const end = +s.finishedAt > start ? +s.finishedAt : start
    const w = {
      id: importId('sym', String(s.id || s.date + s.day)), d: s.date, start, end,
      routineId: null, name: DAY_NAME[s.day] || s.day || 'Symmetry', entries, prs: [],
      ...(s.note ? { note: String(s.note).slice(0, 500) } : {}),
    }
    w.vol = entries.reduce((a, e) => a + e.sets.reduce((b, x) => b + (isWarmupRow(x) ? 0 : completedVolumeOf(x)), 0), 0)
    workouts.push(w)
  }
  workouts.sort((a, b) => (a.d === b.d ? a.start - b.start : a.d < b.d ? -1 : 1))

  const food = {}
  for (const [k, d] of Object.entries(data.days || {})) {
    if (!ISO_DAY.test(k) || !d || typeof d !== 'object') continue
    const meals = (Array.isArray(d.meals) ? d.meals : []).filter(m => m && m.name)
      .map(m => ({ id: String(m.id || importId('m', k + m.name)), name: String(m.name), kcal: n0(m.kcal), p: n0(m.p), c: n0(m.c), f: n0(m.f), ...(m.at ? { at: +m.at } : {}) }))
    const act = {}
    for (const key of ['steps', 'km', 'kcalAct']) if (d.act?.[key] != null && d.act[key] !== '') act[key] = n0(d.act[key])
    if (meals.length || n0(d.water) || Object.keys(act).length) food[k] = { meals, water: n0(d.water), act }
  }

  const bodyweight = Object.entries(data.weights || {})
    .filter(([k, w]) => ISO_DAY.test(k) && n0(w) > 0)
    .map(([d, w]) => ({ d, w: toUnit(n0(w)), t: new Date(d + 'T08:00:00').getTime() }))
    .sort((a, b) => (a.d < b.d ? -1 : 1))

  return { workouts, customEx: [...own.values()], food, bodyweight, unknown: [...unknown] }
}

/**
 * Merges a parsed backup into a store draft. Days already in openGym are kept as they are (a
 * workout day, a food day or a weigh-in), so importing the same file twice adds nothing.
 * Returns what it added.
 */
export function mergeSymmetry(S, parsed, customEx = []) {
  // The Tauro machines the routine uses, in case the starter plan was never loaded.
  S.customEx = S.customEx || []
  for (const c of customEx) if (!S.customEx.some(x => x.id === c.id) && !EXIDX[c.id]) S.customEx.push({ ...c })
  const w = mergeImport(S, { kind: 'workouts', workouts: parsed.workouts, customEx: parsed.customEx })
  const bw = mergeImport(S, { kind: 'bodyweight', bodyweight: parsed.bodyweight })
  if (!S.food || typeof S.food !== 'object') S.food = {}
  let foodDays = 0
  for (const [k, d] of Object.entries(parsed.food)) if (!S.food[k]) { S.food[k] = d; foodDays++ }
  // A profile with no routine yet gets Nico's 5-day plan on Mon-Fri, as the artifact had it;
  // one that already has routines keeps them untouched.
  let routines = 0
  if (!(Array.isArray(S.routines) && S.routines.length)) {
    const plan = buildStarterPlan('symmetry')
    S.routines = plan.routines
    if (!S.week || typeof S.week !== 'object') S.week = {}
    for (const { day, routineId } of plan.schedule) S.week[day] = [routineId]
    routines = plan.routines.length
  }
  return { workouts: w.added, weighIns: bw.added, foodDays, routines }
}
