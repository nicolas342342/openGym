// Symmetry: strength ranks per muscle and the athlete level (lib/ranks.js), plus the watcher
// that toasts a rank-up when a finished workout moves a muscle into the next rank.
import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { todayISO, fmtNum } from '../lib/format.js'
import { t } from '../lib/i18n.js'
import { exerciseOf } from '../lib/exercises.js'
import { exerciseNameText } from '../lib/format.js'
import Icon from '../components/Icon.jsx'
import { RANK_MUSCLE, athleteLevel, muscleRanks, nextRankTarget, rankInfo, rankUps } from '../lib/ranks.js'
import '../symmetry.css'

const MUSCLE_LABEL = {
  chest: () => t('Chest'), back: () => t('Back'), shoulders: () => t('Shoulders'), biceps: () => t('Biceps'), triceps: () => t('Triceps'),
  forearms: () => t('Forearms'), abs: () => t('Abs'), glutes: () => t('Glutes'), quads: () => t('Quads'), hamstrings: () => t('Hamstrings'), calves: () => t('Calves'),
}
const RANK_LABEL = { none: () => t('Unranked'), bronze: () => t('Bronze'), silver: () => t('Silver'), gold: () => t('Gold'), platinum: () => t('Platinum'), diamond: () => t('Diamond') }
export const rankName = info => RANK_LABEL[info.key]() + (info.sub != null ? ' ' + ['I', 'II', 'III'][info.sub] : '')

/** Mounted once in App: compares the muscle ranks before and after the workouts change. */
export function RankWatcher() {
  const workouts = useStore(s => s.S.workouts)
  const prev = useRef(null)
  useEffect(() => {
    const now = muscleRanks(useStore.getState().S, todayISO())
    const ups = prev.current ? rankUps(prev.current, now) : []
    prev.current = now
    for (const m of ups) useUI.getState().toast(t('Rank up! {0}: {1}', MUSCLE_LABEL[m](), rankName(rankInfo(now[m].score))))
  }, [workouts])
  return null
}

/** The level card on Home: a tap opens the ranks. */
export function LevelCard() {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const lv = athleteLevel(muscleRanks(S, todayISO()))
  return <div className="card tappable" style={{ cursor: 'pointer' }} onClick={() => nav('/ranks')}>
    <div className="row between">
      <div className="row" style={{ gap: 9 }}>
        <span className="lrow-i" style={{ background: lv.rank.c }}><Icon name="trophy" /></span>
        <div><div className="lbl2">{t('Athlete level')}</div>
          <div className="ttl">{t('Level {0}', lv.level)} · {rankName(lv.rank)}</div></div>
      </div>
      <Icon name="chevronRight" className="chev" />
    </div>
    <div className="sym-bar"><i style={{ width: lv.xp + '%', background: lv.rank.c }} /></div>
  </div>
}

export default function Ranks() {
  const S = useStore(s => s.S)
  const R = muscleRanks(S, todayISO())
  const lv = athleteLevel(R)
  return <div className="narrow">
    <div className="hdr"><div><h1>{t('Ranks')}</h1><div className="sub">{t('Best lift of the last 60 days, per muscle')}</div></div></div>
    <div className="card">
      <div className="lbl2">{t('Athlete level')}</div>
      <div className="row" style={{ gap: 12, alignItems: 'baseline', marginTop: 4 }}>
        <div className="sym-level">{lv.level}</div>
        <span className="sym-rank"><span className="dot" style={{ background: lv.rank.c }} />{rankName(lv.rank)}</span>
      </div>
      <div className="sym-bar"><i style={{ width: lv.xp + '%', background: lv.rank.c }} /></div>
      <div className="dim small" style={{ marginTop: 6 }}>{t('{0} XP to the next level · {1} of {2} muscles ranked', 100 - lv.xp, lv.ranked, Object.keys(RANK_MUSCLE).length)}</div>
    </div>
    <div className="card">
      {Object.keys(RANK_MUSCLE).map(m => {
        const r = R[m], info = rankInfo(r.score), next = nextRankTarget(r)
        const ex = r.id ? exerciseOf(r.id) : null
        return <div className="sym-meal" key={m}>
          <span className="lrow-i" style={{ background: info.c }}><Icon name="medal" /></span>
          <div className="grow">
            <div className="row between"><span className="ttl">{MUSCLE_LABEL[m]()}</span><span className="sym-rank" style={{ color: info.c }}>{rankName(info)}</span></div>
            <div className="dim small">{ex ? exerciseNameText(ex) + ' · ' + fmtNum(r.best.kg) + ' kg × ' + r.best.r : t('No ranked lift yet')}</div>
            {next && <div className="muted small">{t('Next rank ({0}): {1} kg × {2}', RANK_LABEL[rankInfo(next.next).key](), fmtNum(next.kg), next.reps)}</div>}
            <div className="sym-bar"><i style={{ width: (info.r >= 5 ? 100 : info.frac * 100) + '%', background: info.c }} /></div>
          </div>
        </div>
      })}
    </div>
    <div className="dim small" style={{ padding: '0 4px 12px' }}>{t('Isolation lifts only count sets of 8+ reps with no jump over 25%. Machine plates count as 10 kg each.')}</div>
  </div>
}
