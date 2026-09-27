import { profile, type Experience } from '../../content/profile'
import { currentMonth, parsePeriod, type MonthIndex } from '../../lib/dates'

export const MISSION_COLORS = ['#7fd6ff', '#8fb5ff', '#b3a9ff', '#d4def0']

export type Mission = Experience & {
  start: MonthIndex | null
  /** inclusive end month; "Present" resolves to the current month */
  end: MonthIndex | null
  present: boolean
  color: string
  lane: number
  featured: boolean
  /** ongoing leadership role — gets the "Current · Leadership" emphasis */
  currentLead: boolean
}

/** Experience in chronological order of start, with parsed dates and timeline lanes (no overlaps per lane). */
export function buildMissions(): Mission[] {
  const now = currentMonth()
  const list = profile.experience.map((e) => {
    const p = parsePeriod(e.period)
    return { ...e, start: p?.start ?? null, end: p ? p.end ?? now : null, present: !!p && p.end === null }
  })
  list.sort((a, b) => (a.start ?? Infinity) - (b.start ?? Infinity))
  const laneEnds: number[] = []
  return list.map((m, i) => {
    let lane = 0
    if (m.start !== null) {
      lane = laneEnds.findIndex((end) => end < m.start!)
      if (lane < 0) lane = laneEnds.length
      laneEnds[lane] = m.end!
    }
    return {
      ...m,
      color: m.highlight?.accent ?? MISSION_COLORS[i % MISSION_COLORS.length],
      lane,
      featured: !!m.highlight?.featured,
      currentLead: m.present && !!m.highlight?.leadership,
    }
  })
}
