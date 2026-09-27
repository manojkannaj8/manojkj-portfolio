import type { SkillGraph } from '../../lib/skillGraph'

export const RING_COLORS = ['#7fd6ff', '#a9b4ff', '#8fb5ff', '#d4def0']

export type Ring = { name: string; skills: string[]; color: string }

/** One orbit per skill category, sorted by size so the busiest category gets the longest orbit. */
export function ringsFrom(graph: SkillGraph): Ring[] {
  return [...graph.categories]
    .sort((a, b) => a.skills.length - b.skills.length)
    .map((c, i) => ({ name: c.name, skills: c.skills.map((s) => s.name), color: RING_COLORS[i % RING_COLORS.length] }))
}
