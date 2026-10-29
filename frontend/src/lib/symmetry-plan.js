// Symmetry: Nico's 5-day routine (RUTINA_V2 of Symmetry Tauro) as a starter plan, and the
// Tauro Gym machines the catalogue has no entry for as custom exercises. Loaded through the
// starter-plan chooser (lib/starter.js PLANS.symmetry, sheets.jsx loadStarterPlan).
//
// A row is [openGym id, sets, reps (top), { repsMin, restSec, note }]; the artifact's ids are
// mapped through its EN_NAME list, looked up in catalogue/exercises. Plate-stack machines are
// logged as a count of plates (PLACAS), not kg: what a Tauro plate weighs is unknown.
import { SYM } from './ranks.js'

export const SYMMETRY_CUSTOM_EX = [
  { id: SYM.cybex, n: 'Cybex Dual Axis Chest Press (placas)', custom: true, eq: 'leverage machine', bp: 'chest', tg: 'pectorals', sm: ['triceps', 'shoulders'],
    desc: 'Selector de placas con agarre de doble eje: empuja y junta las manos al final. 3 placas ≈ 50, 4 placas ≈ 70.' },
  { id: SYM.jalon, n: 'gym80 Lat Pulldown (placas)', custom: true, eq: 'leverage machine', bp: 'back', tg: 'lats', sm: ['biceps'],
    desc: 'Rodillo sobre los muslos, codos hacia las costillas, saca pecho. Tu referencia: 7-8 placas.' },
  { id: SYM.remoPecho, n: 'gym80 Chest Supported Row (placas)', custom: true, eq: 'leverage machine', bp: 'back', tg: 'upper back', sm: ['shoulders'],
    desc: 'Pecho pegado al cojín: cero fatiga lumbar. Tu referencia: 5-6 placas.' },
]

const PLACAS = 'anota el número de placas'
const R = (id, sets, reps, rir, restSec, cue) => {
  const [lo, hi] = String(reps).split('–').map(Number)
  return [id, sets, hi || lo, { ...(hi ? { repsMin: lo } : {}), restSec, note: 'RIR ' + rir + (cue ? ' · ' + cue : '') }]
}

export const SYMMETRY = [
  ['push', 'Push · Empuje', 'barbell', [
    R('0314', 3, '8–10', '2', 180), R('0576', 2, '8–10', '1–2', 150, 'kg por lado'), R('0405', 2, '8–10', '1–2', 150),
    R('1030', 2, '10–12', '1→0', 90), R('0584', 3, '12–15', '1→0', 90), R('0194', 2, '10–12', '1→0', 90, PLACAS), R('1451', 2, '8–12', '1→0', 120, PLACAS)]],
  ['pull', 'Pull · Tracción', 'pullup', [
    R(SYM.jalon, 3, '8–10', '1–2', 150, PLACAS), R(SYM.remoPecho, 3, '8–10', '1–2', 150, PLACAS), R('0861', 2, '10–12', '1–2', 120, PLACAS),
    R('11060', 3, '12–15', '1→0', 90, PLACAS), R('0318', 2, '10–12', '1→0', 90), R('0313', 2, '10–12', '1→0', 90)]],
  ['legs', 'Legs · Pierna', 'legs', [
    R('0743', 3, '8–10', '2', 180), R('0739', 2, '10–12', '2', 180), R('0599', 3, '10–15', '1→0', 120),
    R('0585', 2, '12–15', '1→0', 90), R('1391', 3, '10–15', '1→0', 90), R('1452', 2, '12–15', '1→0', 90, 'la torre marca lb: lb × 0.45 = kg')]],
  ['upper', 'Upper · Torso', 'barbell', [
    R(SYM.cybex, 3, '8–12', '1–2', 150, PLACAS), R('0606', 3, '8–10', '1–2', 150), R('2291', 2, '8–12', '1–2', 150),
    R('0178', 3, '12–15', '1→0', 90), R('3084', 2, '10–12', '1→0', 90), R('0241', 2, '10–12', '1→0', 90, PLACAS)]],
  ['lower', 'Lower · Cadena posterior', 'legs', [
    R('1459', 3, '8–10', '2', 180), R('0739', 3, '10–12', '1–2', 180, 'pies altos y abiertos (glúteo)'), R('0599', 2, '10–15', '1→0', 120),
    R('0585', 2, '12–15', '1→0', 90), R('1391', 2, '12–15', '1→0', 90), R('0594', 2, '12–15', '1→0', 90), R('1452', 2, '12–15', '1→0', 90, 'la torre marca lb: lb × 0.45 = kg')]],
]
