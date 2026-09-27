import type { ReactNode } from 'react'
import type { SystemNode } from '../../content/profile'

/** Tiny live glyph per module kind — animated in Build.css (transform/opacity only). */
export function NodeIcon({ kind }: { kind: SystemNode['kind'] }) {
  return (
    <svg className={`sys-icon sys-icon--${kind}`} viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      {ICONS[kind]}
    </svg>
  )
}

const ICONS: Record<SystemNode['kind'], ReactNode> = {
  input: (
    <g>
      <path d="M6 3h8l4 4v14H6z" />
      <path className="i-line" d="M9 11h6M9 14h6M9 17h4" />
    </g>
  ),
  external: (
    <g>
      <circle cx="12" cy="12" r="8" />
      <ellipse className="i-spin" cx="12" cy="12" rx="3.5" ry="8" />
      <path d="M4 12h16" />
    </g>
  ),
  ui: (
    <g>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 9h18" />
      <path className="i-blink" d="M7 13v3" />
    </g>
  ),
  api: (
    <g>
      <path className="i-right" d="M5 9h12l-3-3" />
      <path className="i-left" d="M19 15H7l3 3" />
    </g>
  ),
  data: (
    <g>
      <rect x="4" y="5" width="16" height="3" rx="1" />
      <rect className="i-row1" x="4" y="10.5" width="16" height="3" rx="1" />
      <rect className="i-row2" x="4" y="16" width="16" height="3" rx="1" />
    </g>
  ),
  model: (
    <g>
      <path d="M4 20h16" />
      <rect className="i-bar i-bar1" x="6" y="8" width="3" height="12" />
      <rect className="i-bar i-bar2" x="11" y="8" width="3" height="12" />
      <rect className="i-bar i-bar3" x="16" y="8" width="3" height="12" />
    </g>
  ),
  store: (
    <g>
      <ellipse cx="12" cy="6" rx="7" ry="2.5" />
      <path d="M5 6v12c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V6" />
      <path className="i-line" d="M5 12c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5" />
    </g>
  ),
  agent: (
    <g>
      <circle cx="12" cy="12" r="2.2" />
      <g className="i-spin">
        <circle cx="12" cy="4.5" r="1.6" />
        <circle cx="18.5" cy="15.8" r="1.6" />
        <circle cx="5.5" cy="15.8" r="1.6" />
      </g>
    </g>
  ),
  llm: (
    <g>
      <path className="i-pulse" d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />
      <path d="M18 16l.8 2.2L21 19l-2.2.8L18 22l-.8-2.2L15 19l2.2-.8z" />
    </g>
  ),
  viz: (
    <g>
      <path d="M4 20h16M4 20V4" />
      <path className="i-draw" d="M6 16l4-5 3 3 5-7" pathLength="1" />
    </g>
  ),
  output: (
    <g>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path className="i-tick i-tick1" d="M8 9l1.5 1.5L12 8" />
      <path className="i-tick i-tick2" d="M8 15l1.5 1.5L12 14" />
      <path d="M14 9.5h2M14 15.5h2" />
    </g>
  ),
}
