// Symmetry: food, water, daily activity and the energy balance, ported from Nico's single-file
// app (Symmetry Tauro). Pure helpers over S; the Food view only draws what these return.
//
//   S.food = { '2026-10-28': { meals: [{ id, name, kcal, p, c, f, at }], water: ml,
//                              act: { steps, km, kcalAct } }, … }
//
// Weigh-ins are openGym's own S.bodyweight ({ d, w } in S.unit), so the check-in, the weigh-in
// sheet and the Stats chart keep working unchanged.
// shortcut: S.food merges as one whole setting (newest copy wins) on a 409, not per day like
// dayNotes; fine for one phone, upgrade to STAMPED_MAPS (+ api/sync-stamps.js) for server sync.
import { workoutAt } from './history.js'
import { isCardio } from './exercises.js'
import { isWarmupRow } from './workout-model.js'
import { isoOf } from './format.js'

export const GOALS = { kcal: 2550, p: 150, c: 341, f: 65, water: 3300, steps: 8000 }
// Resting burn: Mifflin-St Jeor for 17 years, 71 kg, 171 cm ≈ 1,700 kcal, plus ~10% digestion.
export const BASE_KCAL = 1870
export const DEFAULT_KG = 71
const LB = 0.45359237

// Quick adds from the artifact (QUICK_MEALS, SNACKS). Names are Nico's own words, not UI strings.
export const QUICK_MEALS = [
  { g: 'Platos de la abuela', e: '🍳', name: 'Desayuno casero completo', desc: 'Huevos, arepa con queso y fruta', kcal: 520, p: 26, c: 48, f: 22 },
  { g: 'Platos de la abuela', e: '🍛', name: 'Almuerzo de la abuela', desc: 'Arroz, grano, carne/pollo, tajada y aguacate', kcal: 980, p: 48, c: 125, f: 28 },
  { g: 'Platos de la abuela', e: '🍗', name: 'Cena reparadora post-gym', desc: 'Proteína + papa o arroz', kcal: 600, p: 42, c: 68, f: 15 },
  { g: 'Menú del plan', e: '🥚', name: 'Desayuno energético', desc: '3 huevos, arepa con cuajada, banano', kcal: 615, p: 29, c: 68, f: 25 },
  { g: 'Menú del plan', e: '🥗', name: 'Almuerzo construcción', desc: '170 g pollo, arroz, ½ taza frijol, ½ aguacate', kcal: 720, p: 66, c: 71, f: 17 },
  { g: 'Menú del plan', e: '🥣', name: 'Pre-entreno avena + whey', desc: '60 g avena, 1 scoop, leche descremada', kcal: 435, p: 40, c: 55, f: 6 },
  { g: 'Menú del plan', e: '🐟', name: 'Cena ligera', desc: '150 g pescado o pollo, papa, verduras', kcal: 430, p: 45, c: 51, f: 4 },
]
export const SNACKS = [
  { e: '🥬', name: 'Jugo verde', kcal: 120, p: 2, c: 28, f: 0 },
  { e: '☕', name: 'Café con azúcar', kcal: 40, p: 0, c: 10, f: 0 },
  { e: '🧀', name: 'Pan de bono', kcal: 200, p: 6, c: 22, f: 10 },
  { e: '🍰', name: 'Torta de banano (pedazo)', kcal: 200, p: 3, c: 30, f: 8 },
  { e: '🍚', name: 'Arroz blanco (1 taza)', kcal: 230, p: 4, c: 45, f: 3 },
  { e: '🥩', name: 'Hígado guisado (120 g)', kcal: 210, p: 28, c: 6, f: 8 },
  { e: '🥔', name: 'Papitas criollas', kcal: 150, p: 3, c: 30, f: 2 },
  { e: '🫛', name: 'Guiso de arveja, zanahoria y maíz', kcal: 130, p: 6, c: 22, f: 3 },
  { e: '🥩', name: 'Carne de cerdo (120 g)', kcal: 260, p: 30, c: 0, f: 15 },
  { e: '🍌', name: 'Tajadas de plátano maduro', kcal: 230, p: 1, c: 40, f: 8 },
  { e: '🍅', name: 'Rodajas de tomate', kcal: 20, p: 1, c: 4, f: 0 },
  { e: '🍗', name: 'Pollo sudado (presa)', kcal: 270, p: 38, c: 6, f: 11 },
  { e: '🍗', name: 'Pollo asado (presa)', kcal: 300, p: 40, c: 0, f: 15 },
  { e: '🫓', name: 'Arepita pequeña', kcal: 75, p: 2, c: 14, f: 1 },
  { e: '🍞', name: 'Pan', kcal: 160, p: 5, c: 30, f: 2 },
  { e: '🥩', name: 'Carne de res (120 g)', kcal: 250, p: 30, c: 0, f: 14 },
  { e: '🥬', name: 'Acelgas con leche y mantequilla', kcal: 210, p: 6, c: 10, f: 15 },
  { e: '🌭', name: 'Salchicha', kcal: 130, p: 5, c: 2, f: 11 },
  { e: '🍌', name: 'Plátano maduro asado', kcal: 180, p: 2, c: 46, f: 0 },
  { e: '🫘', name: 'Tortitas de lentejas', kcal: 200, p: 10, c: 25, f: 7 },
  { e: '🥤', name: 'Vaso de jugo de banano con leche', kcal: 245, p: 8, c: 40, f: 7 },
  { e: '🍌', name: 'Banano', kcal: 105, p: 1, c: 27, f: 0 },
  { e: '🥤', name: 'Scoop de whey', kcal: 120, p: 24, c: 3, f: 2 },
  { e: '🥚', name: '2 huevos', kcal: 140, p: 12, c: 1, f: 10 },
  { e: '🥛', name: 'Vaso de leche', kcal: 150, p: 8, c: 12, f: 8 },
  { e: '🫓', name: 'Arepa sola', kcal: 180, p: 4, c: 35, f: 3 },
  { e: '🥪', name: 'Pan con queso', kcal: 250, p: 10, c: 30, f: 9 },
  { e: '🍚', name: 'Taza de arroz', kcal: 205, p: 4, c: 45, f: 0 },
  { e: '🥜', name: 'Maní (30 g)', kcal: 170, p: 7, c: 5, f: 14 },
]

const isMap = v => !!v && typeof v === 'object' && !Array.isArray(v)
const n0 = v => (Number.isFinite(+v) ? +v : 0)
export const addDays = (iso, n) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return isoOf(d) }
export const mondayOf = iso => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return isoOf(d) }

/** The stored day, or an empty one (never written back by a read). */
export const foodDay = (S, iso) => {
  const d = isMap(S?.food) && isMap(S.food[iso]) ? S.food[iso] : {}
  return { meals: Array.isArray(d.meals) ? d.meals : [], water: n0(d.water), act: isMap(d.act) ? d.act : {} }
}

/** Mutates a store draft: the day of `iso`, created when missing. */
export function draftDay(S, iso) {
  if (!isMap(S.food)) S.food = {}
  if (!isMap(S.food[iso])) S.food[iso] = { meals: [], water: 0, act: {} }
  const d = S.food[iso]
  if (!Array.isArray(d.meals)) d.meals = []
  if (!isMap(d.act)) d.act = {}
  return d
}

export function dayTotals(S, iso) {
  const t = { kcal: 0, p: 0, c: 0, f: 0 }
  for (const m of foodDay(S, iso).meals) for (const k of Object.keys(t)) t[k] += n0(m?.[k])
  return t
}

/** Body weight in kg from S.bodyweight (S.unit), as [{ d, kg }] sorted by day. */
export function weighInsKg(S) {
  const f = S?.unit === 'lb' ? LB : 1
  return (Array.isArray(S?.bodyweight) ? S.bodyweight : [])
    .filter(b => b?.d && Number(b.w) > 0)
    .map(b => ({ d: b.d, kg: Number(b.w) * f }))
    .sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : 0))
}
export const latestKg = S => weighInsKg(S).at(-1)?.kg || DEFAULT_KG

/** Treadmill kcal, ACSM walking (≤ 8 km/h) or running equations. */
export function cardioKcal(speedKmh, inclinePct, min, kg = DEFAULT_KG) {
  const S = n0(speedKmh) * 1000 / 60, G = n0(inclinePct) / 100
  const vo2 = speedKmh > 8 ? 0.2 * S + 0.9 * S * G + 3.5 : 0.1 * S + 1.8 * S * G + 3.5
  return Math.round(vo2 * kg / 1000 * 5 * n0(min))
}

const workSets = e => (Array.isArray(e?.sets) ? e.sets : []).filter(s => s?.done !== false && !isWarmupRow(s))

/**
 * Training kcal on `iso`: weights ≈ 5 kcal/min of the session, capped at 90 min in case the
 * clock was left running (15 kcal a set when there is no usable duration), plus every
 * treadmill set by ACSM.
 */
export function trainingKcal(S, iso, kg = latestKg(S)) {
  let kcal = 0
  for (const w of Array.isArray(S?.workouts) ? S.workouts : []) {
    const at = workoutAt(w)
    if (!Number.isFinite(at) || (w.d || isoOf(new Date(at))) !== iso) continue
    const entries = Array.isArray(w.entries) ? w.entries : []
    const lifts = entries.filter(e => !isCardio(e.id)).reduce((n, e) => n + workSets(e).length, 0)
    const min = Number(w.end) > Number(w.start) ? (w.end - w.start) / 60000 : 0
    if (lifts) kcal += min >= 15 ? Math.min(min, 90) * 5 : lifts * 15
    for (const e of entries.filter(e => isCardio(e.id))) {
      for (const s of workSets(e)) if (n0(s.min) > 0) kcal += cardioKcal(n0(s.speed) || 5.5, n0(s.incline), n0(s.min), kg)
    }
  }
  return Math.round(kcal)
}

/** EWMA trend of the weigh-ins, α 0.12: { ks, trend: { iso: kg }, last }. */
export function weightTrend(S) {
  const trend = {}
  let t = null
  const ws = weighInsKg(S)
  for (const { d, kg } of ws) { t = t == null ? kg : 0.12 * kg + 0.88 * t; trend[d] = t }
  return { ks: ws.map(x => x.d), trend, last: t }
}

/** Estimated burn of a day before any real TDEE: rest + activity (Samsung or steps) + training. */
export function estimatedBurn(S, iso) {
  const act = foodDay(S, iso).act
  const actK = act.kcalAct != null && act.kcalAct !== '' ? Math.round(n0(act.kcalAct)) : Math.round(n0(act.steps) * 0.028)
  const train = trainingKcal(S, iso)
  return { est: BASE_KCAL + actK + train, actK, train, actSrc: act.kcalAct != null && act.kcalAct !== '' ? 'samsung' : act.steps ? 'steps' : '' }
}

/**
 * Real TDEE from the last 14 days: mean intake minus the trend's change × 7,700 kcal/kg over the
 * span. Needs 8 weigh-ins spread over 10+ days and 10 days with meals; until then `ready: false`
 * with how many of each are still missing.
 */
export function dynamicTDEE(S, today) {
  const from = addDays(today, -13)
  const { ks, trend } = weightTrend(S)
  const win = ks.filter(k => k >= from && k <= today)
  const food = Array.from({ length: 14 }, (_, i) => addDays(from, i)).filter(k => foodDay(S, k).meals.length)
  const span = win.length > 1 ? Math.round((new Date(win.at(-1) + 'T12:00:00') - new Date(win[0] + 'T12:00:00')) / 864e5) : 0
  if (win.length < 8 || span < 10 || food.length < 10) {
    return { ready: false, weighIns: Math.max(0, 8 - win.length), mealDays: Math.max(0, 10 - food.length) }
  }
  const intake = food.reduce((a, k) => a + dayTotals(S, k).kcal, 0) / food.length
  const est = food.reduce((a, k) => a + estimatedBurn(S, k).est, 0) / food.length
  const dW = trend[win.at(-1)] - trend[win[0]]
  return { ready: true, tdee: Math.round(intake - dW * 7700 / span), intake: Math.round(intake), est: Math.round(est), dW, span }
}

/**
 * Eaten vs spent on `iso`. Once the real TDEE is ready it replaces the estimate: it already
 * holds steps and training, so Samsung's active kcal is not added on top. Pass `tdee` to reuse
 * one computed for the whole week.
 */
export function dayBalance(S, iso, tdee = dynamicTDEE(S, iso)) {
  const t = dayTotals(S, iso)
  const { est, actK, train, actSrc } = estimatedBurn(S, iso)
  const real = tdee?.ready ? tdee.tdee : null
  const spent = real || est
  return { iso, eaten: Math.round(t.kcal), p: t.p, spent, est, real: !!real, actK, actSrc, train, diff: Math.round(t.kcal - spent), logged: foodDay(S, iso).meals.length > 0 }
}

/** 'bigDeficit' | 'deficit' | 'recomp' | 'surplus' for a kcal difference. */
export const balanceStatus = diff => (diff < -500 ? 'bigDeficit' : diff < -200 ? 'deficit' : diff <= 300 ? 'recomp' : 'surplus')

/** Monday-first week holding `iso`: days, their balances, and the logged days' averages. */
export function weekBalance(S, iso, today) {
  const mon = mondayOf(iso)
  const tdee = dynamicTDEE(S, today)
  const days = Array.from({ length: 7 }, (_, i) => addDays(mon, i)).map(k => ({ iso: k, future: k > today, b: dayBalance(S, k, tdee) }))
  const logged = days.filter(x => !x.future && x.b.logged)
  const avg = f => (logged.length ? logged.reduce((a, x) => a + f(x.b), 0) / logged.length : 0)
  return {
    mon, days, logged: logged.length,
    eaten: Math.round(avg(b => b.eaten)), spent: Math.round(avg(b => b.spent)), p: Math.round(avg(b => b.p)),
    total: logged.reduce((a, x) => a + x.b.diff, 0), avgDiff: avg(b => b.diff),
  }
}
