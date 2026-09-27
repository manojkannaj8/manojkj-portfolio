import { useEffect, useRef } from 'react'
import type { Skill, SkillGraph } from '../../lib/skillGraph'
import { isTouchDevice, useReducedMotion } from '../../lib/motion'
import { scramble } from '../../lib/scramble'

/** "Signal trace" panel: where the active skill was applied, derived from content. */
export function SkillDetail({ skill, graph, pinned, onClear }: { skill: Skill | null; graph: SkillGraph; pinned: boolean; onClear: () => void }) {
  const reduced = useReducedMotion()
  const title = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (skill && title.current) return scramble(title.current, skill.name, { duration: 0.5, reduced })
  }, [skill, reduced])

  const linked = graph.skills.filter((s) => s.applied.length > 0).length

  return (
    <aside className="skill-detail" aria-live="polite">
      {skill ? (
        <>
          <div className="skill-detail__head">
            <span className="hud-label skill-detail__cat">{skill.category}</span>
            {pinned && (
              <button className="skill-detail__close" onClick={onClear} aria-label="Clear selection" data-cursor="Clear">
                <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" /></svg>
              </button>
            )}
          </div>
          <p className="skill-detail__title">
            <span className="sr-only">{skill.name}</span>
            <span ref={title} aria-hidden="true">{skill.name}</span>
          </p>
          {skill.applied.length > 0 ? (
            <>
              <p className="hud-label skill-detail__sub">Applied in</p>
              <ul className="skill-detail__list">
                {skill.applied.map((a) => (
                  <li key={a.key}>
                    <span className="skill-detail__kind">{a.kind}</span>
                    <span className="skill-detail__what">{a.title}</span>
                  </li>
                ))}
              </ul>
              {skill.related.length > 0 && (
                <p className="skill-detail__note">Used alongside {skill.related.length} other skill{skill.related.length === 1 ? '' : 's'} — traced on the orbit.</p>
              )}
            </>
          ) : (
            <p className="skill-detail__note">In my toolkit.</p>
          )}
        </>
      ) : (
        <>
          <span className="hud-label skill-detail__cat">Signal trace</span>
          <p className="skill-detail__title">{isTouchDevice() ? 'Tap a skill' : 'Hover a skill'}</p>
          <p className="skill-detail__note">See where it has been applied and what it travels with. Drag the orbit to spin it.</p>
          <p className="skill-detail__stats hud-label">
            <span>{graph.skills.length} skills</span>
            <span>{graph.categories.length} orbits</span>
            <span>{linked} traced to real work</span>
          </p>
        </>
      )}
    </aside>
  )
}
