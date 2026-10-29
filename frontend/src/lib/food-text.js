// Symmetry: "¿Qué comiste?" typed in plain words ("2 huevos, arepa con queso y café con azúcar")
// turned into meals with macros, on the phone and with no AI: each piece is matched against a
// small table of Colombian foods (per unit), the artifact's quick adds and the meals Nico logged
// before. The artifact did this with Claude; in the APK that would need a paid API key.
// shortcut: word matching, not understanding; a dish nobody listed comes back as unmatched and
// is added by hand ("Otra cosa"), after which it is found by name next time.
import { QUICK_MEALS, SNACKS } from './nutrition.js'

// [emoji, name, words it answers to, kcal, protein, carbs, fat] for ONE unit of the food.
const BASE = [
  ['🥚', 'Huevo', 'huevo', 72, 6, 0.5, 5],
  ['🍳', 'Huevo frito', 'huevo frito', 112, 6, 1, 9],
  ['🍳', 'Huevos pericos (2)', 'pericos perico huevos pericos', 200, 13, 3, 15],
  ['🫓', 'Arepa', 'arepa', 180, 4, 35, 3],
  ['🫓', 'Arepita pequeña', 'arepita arepa pequena', 80, 2, 17, 1],
  ['🫓', 'Arepa con queso', 'arepa con queso', 280, 11, 36, 10],
  ['🍚', 'Arroz blanco (1 taza)', 'arroz', 205, 4, 45, 0],
  ['🍞', 'Pan', 'pan', 80, 2.5, 15, 1],
  ['🧀', 'Pan de bono', 'pan de bono pandebono', 200, 6, 22, 10],
  ['🧀', 'Pandequeso', 'pandequeso pan de queso', 160, 5, 20, 7],
  ['🧀', 'Almojábana', 'almojabana', 190, 7, 22, 8],
  ['🧀', 'Queso campesino (tajada 40 g)', 'queso campesino cuajada', 110, 8, 1, 9],
  ['☕', 'Café con azúcar', 'cafe tinto con azucar', 20, 0, 5, 0],
  ['☕', 'Café sin azúcar', 'cafe tinto sin azucar', 5, 0, 1, 0],
  ['☕', 'Café con leche', 'cafe con leche perico', 100, 5, 8, 5],
  ['🥛', 'Vaso de leche', 'leche vaso', 150, 8, 12, 8],
  ['🥤', 'Scoop de whey', 'whey proteina scoop batido', 120, 24, 3, 2],
  ['🥣', 'Avena (60 g)', 'avena', 230, 8, 40, 4],
  ['🍌', 'Banano', 'banano guineo', 105, 1, 27, 0],
  ['🍎', 'Manzana', 'manzana', 80, 0, 21, 0],
  ['🥭', 'Mango', 'mango', 100, 1, 25, 0],
  ['🥬', 'Jugo verde', 'jugo verde', 120, 2, 28, 0],
  ['🥤', 'Jugo de fruta en agua', 'jugo', 110, 0, 27, 0],
  ['🥤', 'Jugo de banano con leche', 'jugo de banano con leche', 245, 8, 40, 7],
  ['🍯', 'Agua de panela', 'agua de panela aguapanela', 80, 0, 20, 0],
  ['🍗', 'Pollo sudado (presa)', 'pollo sudado presa', 280, 32, 3, 15],
  ['🍗', 'Pollo asado (presa)', 'pollo asado presa', 300, 40, 0, 15],
  ['🍗', 'Pechuga de pollo (150 g)', 'pechuga pollo', 250, 46, 0, 6],
  ['🥩', 'Carne de res (120 g)', 'carne res', 250, 30, 0, 14],
  ['🥩', 'Carne molida (100 g)', 'carne molida', 250, 26, 0, 15],
  ['🥩', 'Carne de cerdo (120 g)', 'cerdo chuleta', 260, 30, 0, 15],
  ['🥩', 'Hígado guisado (120 g)', 'higado', 210, 28, 6, 8],
  ['🐟', 'Pescado (150 g)', 'pescado tilapia mojarra', 200, 38, 0, 5],
  ['🐟', 'Atún (1 lata)', 'atun lata', 130, 28, 0, 1],
  ['🌭', 'Salchicha', 'salchicha', 130, 5, 2, 11],
  ['🌭', 'Perro caliente', 'perro caliente', 320, 11, 30, 17],
  ['🍔', 'Hamburguesa', 'hamburguesa', 550, 28, 45, 28],
  ['🍕', 'Pizza (porción)', 'pizza porcion', 300, 13, 33, 13],
  ['🥟', 'Empanada', 'empanada', 250, 6, 25, 14],
  ['🟡', 'Buñuelo', 'bunuelo', 180, 5, 18, 10],
  ['🥔', 'Papa cocida (mediana)', 'papa', 120, 3, 27, 0],
  ['🥔', 'Papitas criollas', 'papa criolla papitas criollas', 150, 3, 30, 2],
  ['🍟', 'Papas fritas (porción)', 'papas fritas francesa', 320, 4, 41, 15],
  ['🍌', 'Tajadas de plátano maduro', 'platano maduro tajadas', 230, 1, 40, 8],
  ['🍌', 'Tajadas (plátano maduro)', 'tajada tajadas', 230, 1, 40, 8],
  ['🧈', 'Mantequilla (1 cdta)', 'mantequilla margarina', 35, 0, 0, 4],
  ['🍌', 'Patacón', 'patacon platano verde', 180, 1, 30, 7],
  ['🥑', 'Aguacate (1/2)', 'aguacate', 160, 2, 9, 15],
  ['🫘', 'Fríjoles (3/4 taza)', 'frijol frijoles', 190, 10, 30, 3],
  ['🫘', 'Lentejas (1 taza)', 'lenteja lentejas', 230, 18, 40, 1],
  ['🍝', 'Spaghetti (plato)', 'spaghetti pasta espagueti', 230, 8, 45, 2],
  ['🍅', 'Tomate', 'tomate', 22, 1, 5, 0],
  ['🥗', 'Ensalada', 'ensalada verdura verduras', 40, 2, 7, 1],
  ['🌽', 'Mazorca', 'mazorca maiz', 90, 3, 19, 1],
  ['🍫', 'Chocolatina', 'chocolatina chocolate jet', 120, 2, 14, 7],
  ['🍪', 'Galletas (paquete)', 'galleta galletas', 150, 2, 21, 7],
  ['🥜', 'Maní (30 g)', 'mani', 170, 7, 5, 14],
  ['🥛', 'Yogur', 'yogur yogurt kumis', 150, 5, 22, 4],
  ['🥤', 'Gaseosa (vaso)', 'gaseosa coca cola', 100, 0, 27, 0],
  ['🍺', 'Cerveza (lata)', 'cerveza', 150, 1, 13, 0],
]

const NUM = { un: 1, uno: 1, una: 1, medio: 0.5, media: 0.5, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6 }
const STOP = new Set(['de', 'del', 'la', 'el', 'las', 'los', 'en', 'al', 'mi', 'con', 'y', 'un', 'una', 'unos', 'unas', 'poco', 'poquito', 'porcion', 'plato', 'taza', 'vaso'])
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9½/.\s]/g, ' ')
// Singular, so "huevos" finds "huevo" and "arepitas" finds "arepita".
const stem = w => (w.length > 4 && w.endsWith('es') && !w.endsWith('ques') ? w.slice(0, -2) : w.length > 3 && w.endsWith('s') ? w.slice(0, -1) : w)
const words = s => norm(s).split(/\s+/).filter(w => w && !STOP.has(w) && !/^[\d½/.]+$/.test(w)).map(stem)

/** Every food it can find: Nico's own meals first, then the quick adds, then the table. */
export function foodCatalog(S) {
  const out = []
  const seen = new Set()
  const add = (e, name, keys, kcal, p, c, f, perUnit) => {
    const k = norm(name).trim()
    if (seen.has(k)) return
    seen.add(k)
    out.push({ e, name, keys: words(keys), kcal, p, c, f, perUnit })
  }
  // Newest day first, so a dish logged twice keeps its latest macros.
  const days = Object.keys(S?.food || {}).sort().reverse()
  for (const d of days) for (const m of S.food[d]?.meals || []) if (m?.name && m.kcal > 0) add('🍽️', m.name, m.name.replace(/\(.*?\)/g, ''), m.kcal, m.p || 0, m.c || 0, m.f || 0, false)
  for (const m of [...QUICK_MEALS, ...SNACKS]) add(m.e, m.name, m.name.replace(/\(.*?\)/g, ''), m.kcal, m.p, m.c, m.f, false)
  for (const [e, name, keys, kcal, p, c, f] of BASE) add(e, name, keys, kcal, p, c, f, true)
  return out
}

/** The quantity a piece starts with ("2 huevos", "media arepa", "1/2 aguacate"), and the rest. */
export function quantityOf(piece) {
  const t = norm(piece).trim()
  const m = t.match(/^(\d+\/\d+|\d+(?:[.,]\d+)?|½)\s*(?:x\s*)?(.*)$/)
  if (m) {
    const q = m[1] === '½' ? 0.5 : m[1].includes('/') ? Number(m[1].split('/')[0]) / Number(m[1].split('/')[1]) : Number(m[1].replace(',', '.'))
    return { qty: q > 0 ? q : 1, rest: m[2], explicit: true }
  }
  const w = t.split(/\s+/)[0]
  if (NUM[w] != null) return { qty: NUM[w], rest: t.slice(w.length).trim(), explicit: w !== 'un' && w !== 'una' && w !== 'uno' }
  return { qty: 1, rest: t, explicit: false }
}

// How well an entry's words cover the piece's words (and the other way round), 0-1.
function scoreOf(entry, q) {
  if (!entry.keys.length || !q.length) return 0
  const hit = q.filter(w => entry.keys.includes(w)).length
  if (!hit) return 0
  return (2 * hit) / (q.length + new Set(entry.keys).size)
}

function bestFor(catalog, rest, explicit) {
  const q = words(rest)
  let best = null
  for (const entry of catalog) {
    // With a count ("2 huevos") a per-unit food is the one to multiply; a logged dish already
    // holds its own count ("2 huevos" logged once is 140 kcal, not 70).
    const sc = scoreOf(entry, q) + (explicit && entry.perUnit ? 0.05 : 0)
    if (sc > (best?.sc ?? 0)) best = { entry, sc }
  }
  return best && best.sc >= 0.5 ? best.entry : null
}

/**
 * The text as meals: { items: [{ e, name, kcal, p, c, f }], unmatched: [piece] }. Pieces are split
 * on commas, "+", ";" and "y"; a piece that only matches as two foods ("arroz con pollo") is split
 * on "con" as well.
 */
export function parseFoodText(text, S) {
  const catalog = foodCatalog(S)
  const items = []
  const unmatched = []
  const pieces = String(text || '').split(/[,;+\n]|\s+y\s+/i).map(s => norm(s).trim()).filter(Boolean)
  const take = (piece, entry, { qty }) => {
    const r = n => Math.round(n * qty)
    items.push({ e: entry.e, name: qty === 1 ? entry.name : `${+qty.toFixed(2)} × ${entry.name}`, kcal: r(entry.kcal), p: r(entry.p), c: r(entry.c), f: r(entry.f) })
  }
  for (const piece of pieces) {
    const q = quantityOf(piece)
    const whole = bestFor(catalog, q.rest, q.explicit)
    // A whole match that leaves words out ("arroz con pollo asado" read as just the chicken)
    // gives way to two foods split on "con", when both halves are foods.
    const covers = whole && words(q.rest).every(w => whole.keys.includes(w))
    const parts = q.rest.split(/\s+con\s+/)
    if (!covers && parts.length > 1) {
      const found = parts.map((p, i) => [p, bestFor(catalog, p, i === 0 && q.explicit)])
      if (found.every(([, e]) => e)) { found.forEach(([p, e], i) => take(p, e, i === 0 ? q : { qty: 1 })); continue }
    }
    if (whole) take(piece, whole, q)
    else unmatched.push(piece)
  }
  return { items, unmatched }
}
