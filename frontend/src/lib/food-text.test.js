// Symmetry: plain-words food entry (lib/food-text.js).
import { describe, expect, it } from 'vitest'
import { foodCatalog, parseFoodText, quantityOf } from './food-text.js'

const S = { food: {
  '2026-10-20': { meals: [{ id: 'a', name: 'Huevos revueltos (2 unidades)', kcal: 160, p: 12, c: 1, f: 11 }, { id: 'b', name: 'Café con azúcar', kcal: 40, p: 0, c: 10, f: 0 }] },
  '2026-10-27': { meals: [{ id: 'c', name: 'Café con azúcar', kcal: 20, p: 0, c: 5, f: 0 }] },
} }
const names = r => r.items.map(i => i.name)

describe('food text: quantities', () => {
  it('reads digits, fractions and words', () => {
    expect(quantityOf('2 huevos')).toMatchObject({ qty: 2, rest: 'huevos', explicit: true })
    expect(quantityOf('1/2 aguacate')).toMatchObject({ qty: 0.5, rest: 'aguacate' })
    expect(quantityOf('media arepa')).toMatchObject({ qty: 0.5, rest: 'arepa', explicit: true })
    expect(quantityOf('una arepa')).toMatchObject({ qty: 1, explicit: false })
    expect(quantityOf('tres panes')).toMatchObject({ qty: 3 })
    expect(quantityOf('arroz')).toMatchObject({ qty: 1, explicit: false })
  })
})

describe('food text: matching', () => {
  it('splits on commas and "y", and multiplies per-unit foods', () => {
    const r = parseFoodText('2 huevos, arepa con queso y café con azúcar', S)
    expect(names(r)).toEqual(['2 × Huevo', 'Arepa con queso', 'Café con azúcar'])
    expect(r.items[0]).toMatchObject({ kcal: 144, p: 12 })
    // Nico's own café, the newest one logged
    expect(r.items[2].kcal).toBe(20)
    expect(r.unmatched).toEqual([])
  })

  it('a dish Nico logged before is found by its name, with its own count', () => {
    const r = parseFoodText('huevos revueltos', S)
    expect(r.items).toEqual([expect.objectContaining({ name: 'Huevos revueltos (2 unidades)', kcal: 160 })])
  })

  it('accents, capitals and plurals do not matter', () => {
    expect(names(parseFoodText('ARROZ, Frijoles, tajadas de platano maduro', {}))).toEqual([expect.stringMatching(/arroz/i), 'Fríjoles (3/4 taza)', 'Tajadas de plátano maduro'])
  })

  it('splits "con" when the two halves are foods of their own', () => {
    const r = parseFoodText('arroz con pollo asado', {})
    expect(names(r)).toEqual([expect.stringMatching(/arroz/i), 'Pollo asado (presa)'])
  })

  it('plain "tajadas" is plantain, and butter is its own food', () => {
    const r = parseFoodText('tajadas y media arepa con mantequilla', { food: { d: { meals: [{ name: 'Tajadas de tomate', kcal: 22 }, { name: 'Acelgas con leche y mantequilla', kcal: 210 }] } } })
    expect(names(r)).toEqual(['Tajadas (plátano maduro)', '0.5 × Arepa', 'Mantequilla (1 cdta)'])
  })

  it('reports what it cannot find instead of guessing', () => {
    const r = parseFoodText('arroz y sushi de dragón', {})
    expect(names(r)).toEqual([expect.stringMatching(/arroz/i)])
    expect(r.unmatched).toEqual(['sushi de dragon'])
    expect(parseFoodText('', {})).toEqual({ items: [], unmatched: [] })
  })

  it('lists each dish once, the latest macros first', () => {
    const cafes = foodCatalog(S).filter(e => e.name === 'Café con azúcar')
    expect(cafes).toHaveLength(1)
    expect(cafes[0].kcal).toBe(20)
  })
})
