import { profile } from '../content/profile'

/**
 * Derives, purely from content, where each skill was applied and which skills travel together.
 * Nothing here is authored — edit profile.ts (skills, stacks, text, skillAliases) to change it.
 */

export type Application = { key: string; kind: 'Experience' | 'Project' | 'Achievement'; title: string; sub: string }

export type Skill = {
  name: string
  category: string
  applied: Application[]
  /** other skills sharing at least one application */
  related: string[]
}

export type SkillGraph = {
  skills: Skill[]
  byName: Record<string, Skill>
  categories: { name: string; skills: Skill[] }[]
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Whole-term match (plural "s" allowed). Short terms (≤ 3 chars, e.g. "C", "SQL") match case-sensitively. */
function mentions(text: string, term: string) {
  const flags = term.length <= 3 ? '' : 'i'
  return new RegExp(`(?<![A-Za-z0-9])${escapeRe(term)}s?(?![A-Za-z0-9])`, flags).test(text)
}

function sources() {
  const out: (Application & { corpus: string })[] = []
  profile.experience.forEach((e, i) =>
    out.push({ key: `x${i}`, kind: 'Experience', title: e.org, sub: e.role, corpus: [e.org, e.role, ...e.stack, ...e.points].join(' · ') }),
  )
  profile.projects.forEach((p, i) =>
    out.push({ key: `p${i}`, kind: 'Project', title: p.name, sub: p.period ?? 'Project', corpus: [p.name, ...p.stack, ...p.points].join(' · ') }),
  )
  profile.achievements.forEach((r, i) => {
    if (r.layout === 'exhibit') {
      const name = r.project?.name ?? r.title
      const corpus = [r.title, r.event, name, r.project?.description ?? '', ...(r.project?.pipeline.map((s) => s.tech) ?? [])]
      out.push({ key: `a${i}`, kind: 'Achievement', title: name, sub: `${r.title} · ${r.event}`, corpus: corpus.join(' · ') })
    } else {
      r.items.forEach((item, j) => {
        const extra = 'tags' in item ? item.tags : item.tools
        const title = 'status' in item ? `${item.title} — ${item.status}` : item.title
        out.push({ key: `a${i}.${j}`, kind: 'Achievement', title, sub: r.title, corpus: [item.title, item.text, ...extra].join(' · ') })
      })
    }
  })
  return out
}

export function buildSkillGraph(): SkillGraph {
  const src = sources()
  const skills: Skill[] = []
  for (const [category, names] of Object.entries(profile.skills)) {
    for (const name of names) {
      const terms = [name, ...(profile.skillAliases[name] ?? [])]
      const applied = src
        .filter((s) => terms.some((t) => mentions(s.corpus, t)))
        .map(({ corpus: _c, ...a }) => a)
      skills.push({ name, category, applied, related: [] })
    }
  }
  for (const s of skills) {
    const keys = new Set(s.applied.map((a) => a.key))
    s.related = skills.filter((o) => o !== s && o.applied.some((a) => keys.has(a.key))).map((o) => o.name)
  }
  const byName = Object.fromEntries(skills.map((s) => [s.name, s]))
  const categories = Object.keys(profile.skills).map((name) => ({ name, skills: skills.filter((s) => s.category === name) }))
  return { skills, byName, categories }
}
