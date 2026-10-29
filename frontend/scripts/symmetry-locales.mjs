#!/usr/bin/env node
// Symmetry: writes the fork's UI strings into every locale pack, between two marker lines, so
// check-locales.mjs and check-source-strings.mjs stay green. Spanish gets Nico's Colombian
// wording; the other packs get the English text.
// shortcut: non-Spanish packs show English for these strings; translate them here if the fork
// ever has users in other languages.
//
//   node scripts/symmetry-locales.mjs          # (re)write the block in every pack
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ES = {
  'A bit under. Fine for cutting, but it slows muscle gain. One more meal with protein puts you in the zone.': 'Un poco por debajo: sirve para definir, pero frena la ganancia de músculo. Una comida más con proteína te deja en zona.',
  'Active kcal': 'Kcal activas',
  'Activity (Samsung Health)': 'Actividad (Samsung Health)',
  'Add food': 'Añadir comida',
  'Athlete level': 'Nivel de atleta',
  'Average burned': 'Promedio gastado',
  'Average eaten': 'Promedio comido',
  'Average protein': 'Proteína promedio',
  'Balance of the day': 'Balance del día',
  'Best lift of the last 60 days, per muscle': 'Tu mejor levantamiento de los últimos 60 días, por músculo',
  'Big deficit': 'Déficit grande',
  'Bronze': 'Bronce',
  'Burned': 'Gastado',
  'Burned = body at rest ~{0} + activity {1} + training ~{2}': 'Gastado = cuerpo en reposo ~{0} + actividad {1} + entreno ~{2}',
  'Burned is an estimate (±10-15%). Use it for the trend, not to count every calorie.': 'Lo gastado es una estimación (±10-15%). Úsala para ver la tendencia, no para contar cada caloría.',
  'Burned is your real burn over the last 2 weeks (weight + meals). It already holds steps and training, so Samsung is not added. The daily estimate would have been ~{0}.': 'Gastado = tu gasto real de las últimas 2 semanas (peso + comidas). Ya incluye pasos y entreno, así que Samsung no se suma. La estimación diaria habría sido ~{0}.',
  'Carbs': 'Carbos',
  'Diamond': 'Diamante',
  'Difference': 'Diferencia',
  'Eaten': 'Comido',
  'Fat': 'Grasa',
  'Food': 'Comida',
  'Gold': 'Oro',
  'Isolation lifts only count sets of 8+ reps with no jump over 25%. Plate machines are counted in plates.': 'En aislamiento solo cuentan series de 8+ reps sin saltos de peso de más del 25%. Las máquinas de placas se cuentan en placas.',
  'Level {0}': 'Nivel {0}',
  'Next day': 'Día siguiente',
  'Next rank ({0}): {1} × {2}': 'Para subir a {0}: {1} × {2}',
  "Nico's Tauro Gym split: push, pull, legs, upper, lower.": 'Tu rutina de Tauro Gym: push, pull, pierna, upper, lower.',
  'No meals': 'Sin comidas',
  'No meals logged this week yet.': 'Aún no hay comidas registradas esta semana.',
  'No meals yet. Tap Add food.': 'Aún no hay comidas. Toca Añadir comida.',
  'No ranked lift yet': 'Todavía sin levantamiento con rango',
  'Platinum': 'Platino',
  'Previous day': 'Día anterior',
  'Protein': 'Proteína',
  'Rank up! {0}: {1}': '¡Subiste de rango! {0}: {1}',
  'Ranks': 'Rangos',
  'Real burn needs 2 weeks of data: {0} more weigh-ins and {1} more days with meals.': 'El gasto real necesita 2 semanas de datos: faltan {0} pesajes y {1} días con comidas.',
  'Recomposition': 'Recomposición',
  'Silver': 'Plata',
  'Slight deficit': 'Déficit ligero',
  'Snacks and sides': 'Snacks y acompañantes',
  'Something else': 'Otra cosa',
  'Steps': 'Pasos',
  'Surplus': 'Superávit',
  'Symmetry 5 days': 'Symmetry 5 días',
  'Unranked': 'Sin rango',
  'Water': 'Agua',
  'Week balance': 'Balance semana',
  'Weekly balance': 'Balance semanal',
  'Weight and real burn': 'Peso y gasto real',
  'You are {0} kcal under. One more meal with protein puts you in the zone.': 'Vas {0} kcal por debajo. Una comida más con proteína te deja en zona.',
  'You ate more than you burned. One day is fine; if it keeps happening, fat goes up.': 'Comiste más de lo que gastaste. Un día no pasa nada; si se repite seguido, sube la grasa.',
  'You ate well under what you burned. If it repeats you lose muscle as well as fat.': 'Comiste bastante menos de lo que gastaste. Si se repite, pierdes músculo además de grasa.',
  'You eat about what you burn: the best zone to build muscle without gaining fat.': 'Comes más o menos lo que gastas: la zona ideal para ganar músculo sin taparte.',
  'Your real burn (last {0} days): ~{1} kcal a day. You ate {2} on average; the app estimated ~{3}.': 'Tu gasto real (últimos {0} días): ~{1} kcal/día. Comiste en promedio {2}; la app estimaba ~{3}.',
  'from steps': 'por pasos',
  'steps': 'pasos',
  'plates': 'placas',
  'trend': 'tendencia',
  '{0} XP to the next level · {1} of {2} muscles ranked': '{0} XP para el siguiente nivel · {1} de {2} músculos con rango',
  '{0} added': '{0} añadido',
  'What did you eat?': '¿Qué comiste?',
  'Write it the way you would say it, for example: 2 huevos, arepa con queso y café con azúcar': 'Escríbelo como lo dirías, por ejemplo: 2 huevos, arepa con queso y café con azúcar',
  'arroz, fríjoles, carne y tajadas': 'arroz, fríjoles, carne y tajadas',
  'Work out the macros': 'Calcular macros',
  'Not found: {0}. Add it with Add food, Something else, and next time it is found.': 'No encontré: {0}. Añádelo en Añadir comida, Otra cosa, y la próxima vez ya lo encuentra.',
  'Add all · {0} kcal · {1} g protein': 'Añadir todo · {0} kcal · {1} g proteína',
  '+{0} kcal · {1} g protein': '+{0} kcal · {1} g proteína',
  'your routine is in Plan': 'tu rutina ya está en Plan',
  'Bring your Symmetry Tauro data': 'Trae tus datos de Symmetry Tauro',
  'In Symmetry Tauro: Settings, Export backup. Then pick that file here. Days you already have here are kept.': 'En Symmetry Tauro: Ajustes, Exportar copia. Luego escoge ese archivo aquí. Los días que ya tengas aquí no se tocan.',
  'Imported {0} workouts, {1} food days and {2} weigh-ins': 'Importados {0} entrenos, {1} días de comida y {2} pesajes',
  'That file is not a Symmetry Tauro backup': 'Ese archivo no es una copia de Symmetry Tauro',
}

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'locales')
const BEGIN = '  // --- symmetry (scripts/symmetry-locales.mjs) ---', END = '  // --- /symmetry ---'
const q = s => "'" + s.replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'"
for (const f of readdirSync(dir).filter(f => f.endsWith('.js') && f !== 'pt-BR.js')) {
  const p = join(dir, f)
  let src = readFileSync(p, 'utf8')
  const eol = src.includes('\r\n') ? '\r\n' : '\n'
  const es = f === 'es.js'
  const block = [BEGIN, ...Object.entries(ES).map(([k, v]) => `  ${q(k)}: ${q(es ? v : k)},`), END].join(eol)
  const re = new RegExp(`${eol}?  // --- symmetry [\\s\\S]*?  // --- /symmetry ---`)
  src = src.replace(re, '')
  // the pack's object closes on the last `}` line of the file
  const at = src.lastIndexOf(eol + '}')
  if (at < 0) throw new Error(f + ': no closing brace')
  writeFileSync(p, src.slice(0, at) + eol + block + src.slice(at))
}
console.log('symmetry strings written')
