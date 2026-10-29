// Symmetry: strength ranks (Bronze → Diamond, I/II/III), the athlete level 1-99 and its XP,
// ported from Symmetry Tauro (STD, RANK_MUSCLE, ISO). Read straight off the logged workouts.
//
// Every table is the estimated 1RM (Epley) for ~70 kg at Bronze, Silver, Gold, Platinum,
// Diamond, in the unit the artifact kept for that lift. `f` turns the kg openGym logged into
// that unit: per dumbbell (×1), per side (÷2), total (×1), or plates on a stack (÷10, the same
// 1 plate ≈ 10 kg the artifact import uses).
import { isWarmupRow } from './workout-model.js'
import { addDays } from './nutrition.js'

const LB = 0.45359237
export const RANKS = [
  { key: 'none', c: '#3f3f46' }, { key: 'bronze', c: '#CD7F32' }, { key: 'silver', c: '#94A3B8' },
  { key: 'gold', c: '#F59E0B' }, { key: 'platinum', c: '#06B6D4' }, { key: 'diamond', c: '#A855F7' },
]

// Tauro Gym machines the catalogue has no entry for; seeded as custom exercises (lib/symmetry-plan.js).
export const SYM = { cybex: 'sym-cybex-chest', jalon: 'sym-gym80-pulldown', remoPecho: 'sym-gym80-chest-row' }

const PL = w => w / 10, HALF = w => w / 2, ONE = w => w, TWO = w => w * 2
const T_PRENSA = [60, 100, 150, 200, 260], T_RDL = [40, 65, 95, 125, 160], T_TRI = [4, 6.5, 9, 12, 15]
const T_CURL = [5, 8.5, 12.5, 16.5, 21], T_JALON = [6, 9, 12, 15, 18], T_FEM = [45, 65, 85, 105, 130], T_CALF = [40, 70, 105, 140, 180]
const ST = (t, f) => ({ t, f })
// openGym id → table. Ids match lib/symmetry-plan.js (the artifact's EN_NAME, looked up in the catalogue).
export const STD = {
  '0314': ST([12, 18, 25, 32, 40], ONE),            // press inclinado mancuernas (c/u)
  '0576': ST([15, 22.5, 32.5, 42.5, 55], HALF),     // press plano convergente (kg/lado)
  [SYM.cybex]: ST([15, 22.5, 32.5, 42.5, 55], HALF),
  '1030': ST([20, 35, 50, 65, 85], ONE),            // pec deck
  [SYM.jalon]: ST(T_JALON, PL), '2291': ST(T_JALON, PL), '7583': ST(T_JALON, PL),
  [SYM.remoPecho]: ST([5, 7.5, 10, 13, 16], PL), '1350': ST([5, 7.5, 10, 13, 16], PL),
  '0606': ST([15, 25, 37.5, 50, 65], ONE),          // remo en T
  '0405': ST([8, 13, 19, 25, 32], ONE),             // press militar mancuernas
  '0584': ST([20, 32, 45, 58, 70], ONE),            // elevación lateral máquina
  '0318': ST(T_CURL, ONE), '3084': ST(T_CURL, ONE),
  '0868': ST([3, 5, 7.5, 10, 12.5], PL),            // curl polea
  '0241': ST(T_TRI, PL), '0194': ST(T_TRI, PL), '0200': ST(T_TRI, PL),
  '1451': ST([5, 7.5, 10.5, 13.5, 17], PL),         // seated dip
  '0739': ST(T_PRENSA, ONE),
  '0743': ST([25, 50, 80, 115, 155], ONE),          // hack
  '0585': ST([35, 55, 75, 95, 120], ONE),           // extensión cuádriceps
  '1459': ST(T_RDL, TWO), '0085': ST(T_RDL, ONE),   // PMR mancuernas (c/u ×2), barra (total)
  '0599': ST(T_FEM, ONE), '0586': ST(T_FEM, ONE),
  '1391': ST(T_CALF, ONE), '0605': ST(T_CALF, ONE),
  '0594': ST([15, 25, 40, 55, 70], ONE),
  '1452': ST([50, 75, 100, 130, 160], w => w / LB), // ab crunch Cybex: the tower reads pounds
  '0313': ST([5, 9, 13.5, 18, 23], ONE),            // curl martillo
}

export const RANK_MUSCLE = {
  chest: ['0314', '0576', SYM.cybex, '1030'],
  back: [SYM.jalon, '2291', '7583', SYM.remoPecho, '1350', '0606'],
  shoulders: ['0405', '0584'],
  biceps: ['0318', '3084', '0868'],
  triceps: ['0241', '0194', '0200', '1451'],
  forearms: ['0313'],
  abs: ['1452'],
  glutes: ['1459', '0085', '0739'],
  quads: ['0739', '0743', '0585'],
  hamstrings: ['1459', '0085', '0599', '0586'],
  calves: ['1391', '0605', '0594'],
}

// Isolation: only sets of 8+ reps, and no jump of more than 25% over the set before (no records by momentum).
export const ISO = new Set(['1030', '0584', '0178', '0318', '3084', '0868', '0313', '0241', '0194', '0200', '0585', '0599', '0586', '1391', '0605', '0594', '1452'])

/** Score 0-5: below 1 is on the way to Bronze, 1-2 Bronze, …, 5 Diamond. */
export function scoreOf(t, v) {
  if (v < t[0]) return v / t[0]
  for (let i = 0; i < 4; i++) if (v < t[i + 1]) return i + 1 + (v - t[i]) / (t[i + 1] - t[i])
  return 5
}

/** { r: 0-5, sub: 0-2 (I/II/III) or null, frac } */
export function rankInfo(score) {
  const r = Math.min(5, Math.floor(score))
  const frac = r >= 5 ? 1 : score - r
  return { r, sub: r > 0 && r < 5 ? Math.min(2, Math.floor(frac * 3)) : null, frac, ...RANKS[r] }
}

/** Best Epley estimate (in the table's unit) of `exId` since `since`, or null. */
export function bestLift(S, exId, since) {
  const std = STD[exId]
  if (!std) return null
  const toKg = S?.unit === 'lb' ? LB : 1
  const iso = ISO.has(exId)
  let best = null
  for (const w of Array.isArray(S?.workouts) ? S.workouts : []) {
    if (!w?.d || w.d < since) continue
    for (const e of Array.isArray(w.entries) ? w.entries : []) {
      if (e?.id !== exId) continue
      const sets = (Array.isArray(e.sets) ? e.sets : []).filter(s => s && s.done !== false && !isWarmupRow(s))
      sets.forEach((x, j) => {
        const kg = Number(x.w) * toKg, r = Number(x.r)
        if (!(kg > 0) || !(r >= 1) || r > 20) return
        if (iso) {
          if (r < 8) return
          const prev = sets.slice(0, j).reverse().find(y => Number(y.w) > 0)
          if (prev && kg > Number(prev.w) * toKg * 1.25) return
        }
        const v = std.f(kg) * (1 + r / 30)
        if (!best || v > best.v) best = { v, kg, r, d: w.d }
      })
    }
  }
  return best
}

/** Every muscle's rank over the last 60 days: { [muscle]: { score, id, best } }. */
export function muscleRanks(S, today) {
  const since = addDays(today, -60)
  const out = {}
  for (const [m, ids] of Object.entries(RANK_MUSCLE)) {
    out[m] = { score: 0, id: null, best: null }
    for (const id of ids) {
      const b = bestLift(S, id, since)
      if (!b) continue
      const sc = scoreOf(STD[id].t, b.v)
      if (!out[m].best || sc > out[m].score) out[m] = { score: sc, id, best: b }
    }
  }
  return out
}

/** Athlete level 1-99 and XP 0-99 toward the next, from the mean muscle score. */
export function athleteLevel(ranks) {
  const ms = Object.keys(RANK_MUSCLE)
  const avg = ms.reduce((a, m) => a + (ranks[m]?.score || 0), 0) / ms.length
  const raw = avg / 5 * 99
  return { avg, level: Math.max(1, Math.min(99, Math.floor(raw) + 1)), xp: Math.round((raw % 1) * 100), rank: rankInfo(avg), ranked: ms.filter(m => ranks[m]?.score >= 1).length }
}

/** kg × reps needed for the next rank on the muscle's best lift, or null at Diamond / unranked. */
export function nextRankTarget(R, reps = 10) {
  const info = rankInfo(R.score)
  if (!R.best || info.r >= 5) return null
  const std = STD[R.id]
  const need = std.t[info.r] / (1 + reps / 30)
  // f is linear in every table, so its inverse is a ratio.
  const kg = need / std.f(1)
  return { next: info.r + 1, kg: Math.ceil(kg * 2) / 2, reps }
}

/** Muscles whose whole rank (Bronze, Silver…) went up from `before` to `after`. */
export const rankUps = (before, after) =>
  Object.keys(after).filter(m => rankInfo(after[m].score).r > rankInfo(before?.[m]?.score || 0).r)
