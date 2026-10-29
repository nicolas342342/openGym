// Symmetry: the Food tab. Meals, water, the day's activity from Samsung Health, the energy
// balance of the day and the week, and the weight trend behind the real TDEE (lib/nutrition.js).
import { useState } from 'react'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { fmtDate, fmtNum, todayISO, uid, DAYS } from '../lib/format.js'
import { t } from '../lib/i18n.js'
import Icon from '../components/Icon.jsx'
import { Button, NumberField, TextField } from '../components/ui.jsx'
import { bwSheet } from '../sheets.jsx'
import {
  GOALS, BASE_KCAL, QUICK_MEALS, SNACKS, addDays, balanceStatus, dayBalance, dayTotals, draftDay,
  dynamicTDEE, foodDay, weekBalance, weightTrend,
} from '../lib/nutrition.js'
import '../symmetry.css'

const update = fn => useStore.getState().update(fn)
const int = n => Math.round(n).toLocaleString()
const signed = n => (n > 0 ? '+' : n < 0 ? '−' : '') + int(Math.abs(n))
const STATUS = {
  bigDeficit: () => ({ tag: t('Big deficit'), msg: t('You ate well under what you burned. If it repeats you lose muscle as well as fat.'), c: 'var(--orange)' }),
  deficit: () => ({ tag: t('Slight deficit'), msg: t('A bit under. Fine for cutting, but it slows muscle gain. One more meal with protein puts you in the zone.'), c: 'var(--yellow)' }),
  recomp: () => ({ tag: t('Recomposition'), msg: t('You eat about what you burn: the best zone to build muscle without gaining fat.'), c: 'var(--green)' }),
  surplus: () => ({ tag: t('Surplus'), msg: t('You ate more than you burned. One day is fine; if it keeps happening, fat goes up.'), c: 'var(--orange)' }),
}

function Bar({ value, goal, color }) {
  return <div className="sym-bar"><i style={{ width: Math.min(100, goal ? value / goal * 100 : 0) + '%', ...(color ? { background: color } : {}) }} /></div>
}

function Macro({ label, value, goal, color }) {
  return <div>
    <div className="sym-k"><span className="dim">{label}</span><b>{int(value)}<span className="dim"> / {goal} g</span></b></div>
    <Bar value={value} goal={goal} color={color} />
  </div>
}

function addMeal(iso, m) {
  const { name, kcal, p, c, f } = m
  update(S => { draftDay(S, iso).meals.push({ id: uid(), name, kcal: +kcal || 0, p: +p || 0, c: +c || 0, f: +f || 0, at: Date.now() }) })
  useUI.getState().toast(t('{0} added', name))
}

function MealSheet({ iso, close }) {
  const [form, setForm] = useState({ name: '', kcal: null, p: null, c: null, f: null })
  const set = k => v => setForm(x => ({ ...x, [k]: v }))
  const pick = m => { addMeal(iso, m); close() }
  const custom = () => { if (!form.name.trim() || !(form.kcal > 0)) return; addMeal(iso, { ...form, name: form.name.trim() }); close() }
  const groups = [...new Set(QUICK_MEALS.map(m => m.g))]
  return <>
    <h3>{t('Add food')}</h3>
    {groups.map(g => <div key={g} style={{ marginBottom: 14 }}>
      <div className="lbl2" style={{ marginBottom: 6 }}>{g}</div>
      <div className="sym-quick">{QUICK_MEALS.filter(m => m.g === g).map(m =>
        <button key={m.name} onClick={() => pick(m)}><div>{m.e} {m.name}</div><div className="ss">{m.kcal} kcal · {m.p} g P</div></button>)}</div>
    </div>)}
    <div className="lbl2" style={{ marginBottom: 6 }}>{t('Snacks and sides')}</div>
    <div className="sym-quick" style={{ marginBottom: 14 }}>{SNACKS.map(m =>
      <button key={m.name} onClick={() => pick(m)}><div>{m.e} {m.name}</div><div className="ss">{m.kcal} kcal · {m.p} g P</div></button>)}</div>
    <div className="lbl2" style={{ marginBottom: 6 }}>{t('Something else')}</div>
    <TextField placeholder={t('Name')} value={form.name} onChange={e => set('name')(e.target.value)} />
    <div className="sym-grid3" style={{ gridTemplateColumns: 'repeat(4,minmax(0,1fr))' }}>
      {[['kcal', 'kcal'], ['p', t('Protein')], ['c', t('Carbs')], ['f', t('Fat')]].map(([k, label]) =>
        <label key={k}><div className="lbl2">{label}</div><NumberField className="field" value={form[k]} nullable onChange={set(k)} aria-label={label} /></label>)}
    </div>
    <div style={{ height: 12 }} />
    <Button variant="primary" onClick={custom}>{t('Add')}</Button>
  </>
}

function DayBalance({ b, isToday }) {
  const st = STATUS[balanceStatus(b.diff)]()
  return <div className="card">
    <div className="row between"><h2 style={{ margin: 0 }}>{t('Balance of the day')}</h2>
      {b.logged ? <span className="tag" style={{ color: st.c, background: `color-mix(in srgb,${st.c} 16%,transparent)` }}>{st.tag}</span> : <span className="tag">{t('No meals')}</span>}</div>
    <div className="sym-grid3">
      <div><div className="lbl2"><i className="sym-eat" style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2 }} /> {t('Eaten')}</div><div className="sym-num">{int(b.eaten)}</div></div>
      <div><div className="lbl2"><i className="sym-spent" style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2 }} /> {t('Burned')}</div><div className="sym-num">{int(b.spent)}</div></div>
      <div><div className="lbl2">{t('Difference')}</div><div className="sym-num">{signed(b.diff)}</div></div>
    </div>
    <div className="dim small" style={{ marginTop: 8 }}>{b.real
      ? t('Burned is your real burn over the last 2 weeks (weight + meals). It already holds steps and training, so Samsung is not added. The daily estimate would have been ~{0}.', int(b.est))
      : t('Burned = body at rest ~{0} + activity {1} + training ~{2}', int(BASE_KCAL), int(b.actK) + (b.actSrc === 'samsung' ? ' (Samsung)' : b.actSrc === 'steps' ? ' (' + t('from steps') + ')' : ''), int(b.train))}</div>
    {b.logged && <div className="muted small" style={{ marginTop: 6 }}>{isToday && b.diff < -200 ? t('You are {0} kcal under. One more meal with protein puts you in the zone.', int(-b.diff)) : st.msg}</div>}
  </div>
}

function WeekBalance({ S, iso, today }) {
  const w = weekBalance(S, iso, today)
  const max = Math.max(GOALS.kcal, ...w.days.filter(x => !x.future).flatMap(x => [x.b.eaten, x.b.spent])) * 1.08
  const h = v => Math.max(v > 0 ? 3 : 0, Math.round(v / max * 100))
  const st = STATUS[balanceStatus(w.avgDiff)]()
  return <div className="card">
    <h2 style={{ margin: 0 }}>{t('Weekly balance')}</h2>
    <div className="sym-legend"><span><i className="sym-eat" />{t('Eaten')}</span><span><i className="sym-spent" />{t('Burned')}</span></div>
    <div className="sym-week">{w.days.map((x, i) => <div key={x.iso}>
      <div className="bars">{!x.future && x.b.logged && <><i className="sym-eat" style={{ height: h(x.b.eaten) }} /><i className="sym-spent" style={{ height: h(x.b.spent) }} /></>}</div>
      <div className={'dl' + (x.iso === today ? ' today' : '')}>{t(DAYS[(i + 1) % 7])}</div>
    </div>)}</div>
    <div className="sym-grid3" style={{ gridTemplateColumns: 'repeat(2,minmax(0,1fr))' }}>
      <div><div className="lbl2">{t('Average eaten')}</div><div className="sym-num">{int(w.eaten)}</div></div>
      <div><div className="lbl2">{t('Average burned')}</div><div className="sym-num">{int(w.spent)}</div></div>
      <div><div className="lbl2">{t('Week balance')}</div><div className="sym-num">{signed(w.total)}</div></div>
      <div><div className="lbl2">{t('Average protein')}</div><div className="sym-num">{w.p}<span className="dim small"> / {GOALS.p} g</span></div></div>
    </div>
    <div className="muted small" style={{ marginTop: 8 }}>{w.logged ? st.msg : t('No meals logged this week yet.')}</div>
    <div className="dim small" style={{ marginTop: 4 }}>{t('Burned is an estimate (±10-15%). Use it for the trend, not to count every calorie.')}</div>
  </div>
}

function WeightCard({ S, today }) {
  const { last } = weightTrend(S)
  const r = dynamicTDEE(S, today)
  return <div className="card">
    <div className="row between"><h2 style={{ margin: 0 }}>{t('Weight and real burn')}</h2>
      <Button size="sm" icon="plus" onClick={() => bwSheet()}>{t('Log')}</Button></div>
    <div className="row" style={{ gap: 8, alignItems: 'baseline', marginTop: 6 }}>
      <div className="big">{last ? fmtNum(Math.round(last * 10) / 10) : '–'} <span className="muted" style={{ fontSize: '1rem' }}>kg</span></div>
      <span className="dim small">{t('trend')}</span>
    </div>
    <div className="muted small" style={{ marginTop: 6 }}>{r.ready
      ? t('Your real burn (last {0} days): ~{1} kcal a day. You ate {2} on average; the app estimated ~{3}.', r.span, int(r.tdee), int(r.intake), int(r.est))
      : t('Real burn needs 2 weeks of data: {0} more weigh-ins and {1} more days with meals.', r.weighIns, r.mealDays)}</div>
  </div>
}

export default function Food() {
  const S = useStore(s => s.S)
  const today = todayISO()
  const [iso, setIso] = useState(today)
  const day = foodDay(S, iso)
  const tot = dayTotals(S, iso)
  const b = dayBalance(S, iso, dynamicTDEE(S, today))
  const setAct = k => v => update(s => { const a = draftDay(s, iso).act; if (v == null) delete a[k]; else a[k] = v })
  const water = d => update(s => { const x = draftDay(s, iso); x.water = Math.max(0, (x.water || 0) + d) })
  const delMeal = id => update(s => { const x = draftDay(s, iso); x.meals = x.meals.filter(m => m.id !== id) })
  const openAdd = () => useUI.getState().openSheet(close => <MealSheet iso={iso} close={close} />)

  return <div className="narrow">
    <div className="hdr">
      <div><h1>{t('Food')}</h1><div className="sub">{iso === today ? t('Today') : fmtDate(iso, true)}</div></div>
      <div className="hdr-actions">
        <button className="iconbtn" onClick={() => setIso(addDays(iso, -1))} aria-label={t('Previous day')}><Icon name="chevronLeft" /></button>
        <button className="iconbtn" disabled={iso >= today} onClick={() => setIso(addDays(iso, 1))} aria-label={t('Next day')}><Icon name="chevronRight" /></button>
      </div>
    </div>

    <div className="card">
      <div className="row between"><h2 style={{ margin: 0 }}>{t('Calories')}</h2><Button size="sm" variant="tinted" icon="plus" onClick={openAdd}>{t('Add food')}</Button></div>
      <div className="row" style={{ gap: 6, alignItems: 'baseline', marginTop: 6 }}>
        <div className="big">{int(tot.kcal)}</div><span className="muted">/ {int(GOALS.kcal)} kcal</span>
      </div>
      <Bar value={tot.kcal} goal={GOALS.kcal} />
      <div className="sym-macro">
        <Macro label={t('Protein')} value={tot.p} goal={GOALS.p} color="var(--red)" />
        <Macro label={t('Carbs')} value={tot.c} goal={GOALS.c} color="var(--yellow)" />
        <Macro label={t('Fat')} value={tot.f} goal={GOALS.f} color="var(--blue)" />
      </div>
      <div style={{ marginTop: 12 }}>
        {day.meals.length ? day.meals.map(m => <div className="sym-meal" key={m.id}>
          <div className="grow"><div className="ttl">{m.name}</div><div className="dim small">{int(m.kcal)} kcal · P {int(m.p)} · C {int(m.c)} · G {int(m.f)}</div></div>
          <button className="iconbtn" style={{ width: 30, height: 30 }} onClick={() => delMeal(m.id)} aria-label={t('Delete')}><Icon name="xmark" /></button>
        </div>) : <div className="dim small">{t('No meals yet. Tap Add food.')}</div>}
      </div>
    </div>

    <div className="card">
      <div className="row between"><h2 style={{ margin: 0 }}>{t('Water')}</h2>
        <span className="muted small">{fmtNum(day.water / 1000)} / {fmtNum(GOALS.water / 1000)} L</span></div>
      <Bar value={day.water} goal={GOALS.water} color="var(--blue)" />
      <div className="row" style={{ gap: 8, marginTop: 10 }}>
        <Button size="sm" onClick={() => water(-250)} disabled={!day.water}>−250 ml</Button>
        <Button size="sm" variant="tinted" onClick={() => water(250)}>+250 ml</Button>
        <Button size="sm" variant="tinted" onClick={() => water(500)}>+500 ml</Button>
      </div>
    </div>

    <div className="card">
      <div className="row between"><h2 style={{ margin: 0 }}>{t('Activity (Samsung Health)')}</h2>
        <span className="muted small">{int(+day.act.steps || 0)} / {int(GOALS.steps)} {t('steps')}</span></div>
      <Bar value={+day.act.steps || 0} goal={GOALS.steps} color="var(--green)" />
      <div className="sym-grid3">
        <label><div className="lbl2">{t('Steps')}</div><NumberField className="field" decimal={false} nullable value={day.act.steps ?? null} onChange={setAct('steps')} /></label>
        <label><div className="lbl2">km</div><NumberField className="field" nullable value={day.act.km ?? null} onChange={setAct('km')} /></label>
        <label><div className="lbl2">{t('Active kcal')}</div><NumberField className="field" decimal={false} nullable value={day.act.kcalAct ?? null} onChange={setAct('kcalAct')} /></label>
      </div>
    </div>

    <DayBalance b={b} isToday={iso === today} />
    <WeekBalance S={S} iso={iso} today={today} />
    <WeightCard S={S} today={today} />
  </div>
}
