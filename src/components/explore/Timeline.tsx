import type { CSSProperties, Ref } from 'react'
import { formatMonth, monthLetter } from '../../lib/dates'
import type { Mission } from './missions'

type Axis = { from: number; to: number; count: number }

/**
 * Month-accurate mission timeline built from the CV periods. Overlapping roles sit on
 * separate lanes. The cursor (`--x`, set by the flight loop) marks the camera's date.
 */
export function Timeline({ missions, axis, active, onGo, ref }: { missions: Mission[]; axis: Axis; active: number; onGo: (i: number) => void; ref: Ref<HTMLDivElement> }) {
  const lanes = Math.max(1, ...missions.map((m) => m.lane + 1))
  const months = Array.from({ length: axis.count }, (_, i) => axis.from + i)

  return (
    <div ref={ref} className="timeline" style={{ '--lanes': lanes } as CSSProperties} role="group" aria-label="Mission timeline">
      <div className="timeline__lanes">
        {missions.map((m, i) =>
          m.start === null ? null : (
            <button
              key={m.org}
              className={`tl-bar${i === active ? ' is-active' : ''}${m.featured ? ' is-featured' : ''}${m.present ? ' is-current' : ''}`}
              style={{
                '--c': m.color,
                left: `${((m.start - axis.from) / axis.count) * 100}%`,
                width: `${((m.end! - m.start + 1) / axis.count) * 100}%`,
                top: `calc(${m.lane} * var(--lane-h))`,
              } as CSSProperties}
              onClick={() => onGo(i)}
              aria-label={`${m.role}, ${m.org}, ${m.period}`}
              aria-current={i === active ? 'true' : undefined}
              data-cursor="Fly"
            >
              <span className="tl-bar__label" aria-hidden="true">{m.org}</span>
            </button>
          ),
        )}
        <div className="timeline__cursor" aria-hidden="true"><i /></div>
      </div>
      <div className="timeline__axis" aria-hidden="true">
        {months.map((mi) => (
          <span key={mi} className={`tl-tick${mi % 12 === 0 || mi === axis.from ? ' is-year' : ''}`}>
            <span className="tl-tick__m">{monthLetter(mi)}</span>
            {(mi % 12 === 0 || mi === axis.from) && <span className="tl-tick__y">{formatMonth(mi).split(' ')[1]}</span>}
          </span>
        ))}
      </div>
    </div>
  )
}
