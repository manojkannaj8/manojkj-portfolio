import type { SystemNode } from '../content/profile'

export type LaidNode = SystemNode & { col: number; row: number; x: number; y: number; w: number; h: number }
export type LaidEdge = { from: string; to: string; fromCol: number; d: string }
export type SystemLayout = {
  nodes: LaidNode[]
  edges: LaidEdge[]
  cols: number
  vertical: boolean
  /** narrow horizontal modules stack icon above text */
  compact: boolean
}

/**
 * Layered layout for a small data-flow DAG.
 * Columns = longest path from a source (sources pulled next to their first consumer),
 * rows ordered by the mean row of predecessors (one barycentre pass) to avoid crossings.
 * `vertical` transposes the flow (top → bottom) for narrow screens.
 */
export function layoutSystem(sys: { nodes: SystemNode[]; edges: [string, string][] }, W: number, H: number, vertical: boolean): SystemLayout {
  const ids = sys.nodes.map((n) => n.id)
  const preds: Record<string, string[]> = Object.fromEntries(ids.map((id) => [id, []]))
  const succs: Record<string, string[]> = Object.fromEntries(ids.map((id) => [id, []]))
  for (const [a, b] of sys.edges) { succs[a]?.push(b); preds[b]?.push(a) }

  const col: Record<string, number> = Object.fromEntries(ids.map((id) => [id, 0]))
  for (let pass = 0; pass < ids.length; pass++) {
    for (const [a, b] of sys.edges) col[b] = Math.max(col[b], col[a] + 1)
  }
  for (const id of ids) {
    if (preds[id].length === 0 && succs[id].length > 0) col[id] = Math.min(...succs[id].map((s) => col[s])) - 1
  }
  const minCol = Math.min(...ids.map((id) => col[id]))
  ids.forEach((id) => { col[id] -= minCol })
  const cols = Math.max(...ids.map((id) => col[id])) + 1

  // rows: content order, then sort each column by predecessor barycentre
  const row: Record<string, number> = {}
  const byCol: string[][] = Array.from({ length: cols }, () => [])
  ids.forEach((id) => byCol[col[id]].push(id))
  byCol.forEach((list, c) => {
    if (c > 0) {
      const bary = (id: string) => (preds[id].length ? preds[id].reduce((s, p) => s + row[p], 0) / preds[id].length : 0)
      list.sort((a, b) => bary(a) - bary(b))
    }
    list.forEach((id, r) => { row[id] = r })
  })

  const maxRows = Math.max(...byCol.map((l) => l.length))
  const pad = vertical ? 6 : 10
  // widest module that still leaves a readable trace gap between columns (labels may wrap to two lines)
  const TRACE_GAP = 40
  const w = vertical
    ? Math.min(176, (W - 12) / Math.max(maxRows, 2) - 10)
    : Math.min(196, (W - 2 * pad - TRACE_GAP * (cols - 1)) / cols)
  const compact = !vertical && w < 168
  // vertical flows shrink module height on short screens so every row keeps a visible trace
  const h = vertical ? Math.max(32, Math.min(44, (H - 2 * pad) / (cols * 1.5))) : compact ? 80 : 60

  const nodes: LaidNode[] = sys.nodes.map((n) => {
    const c = col[n.id], r = row[n.id], count = byCol[c].length
    const t = cols > 1 ? c / (cols - 1) : 0.5
    let x: number, y: number
    let nw = w
    if (vertical) {
      if (count === 1) nw = Math.min(236, W - 12) // a module alone on its row can breathe
      const gapX = w + 14
      y = pad + (H - 2 * pad - h) * t
      x = W / 2 + (r - (count - 1) / 2) * gapX - nw / 2
    } else {
      const gapY = Math.min(h * 2, (H - 2 * pad - h) / Math.max(maxRows - 1, 1))
      x = pad + (W - 2 * pad - w) * t
      y = H / 2 + (r - (count - 1) / 2) * gapY - h / 2
    }
    return { ...n, col: c, row: r, x, y, w: nw, h }
  })

  const at = Object.fromEntries(nodes.map((n) => [n.id, n]))
  const edges: LaidEdge[] = sys.edges.map(([from, to]) => {
    const a = at[from], b = at[to]
    return { from, to, fromCol: a.col, d: vertical ? verticalPath(a, b) : horizontalPath(a, b) }
  })
  return { nodes, edges, cols, vertical, compact }
}

/** Orthogonal trace with rounded elbows, left → right. */
function horizontalPath(a: LaidNode, b: LaidNode) {
  const sx = a.x + a.w, sy = a.y + a.h / 2, tx = b.x, ty = b.y + b.h / 2
  if (Math.abs(sy - ty) < 1) return `M ${sx} ${sy} L ${tx} ${ty}`
  const mx = (sx + tx) / 2, dir = Math.sign(ty - sy)
  const r = Math.min(12, Math.abs(ty - sy) / 2, (tx - sx) / 4)
  return `M ${sx} ${sy} H ${mx - r} Q ${mx} ${sy} ${mx} ${sy + dir * r} V ${ty - dir * r} Q ${mx} ${ty} ${mx + r} ${ty} H ${tx}`
}

/** Orthogonal trace with rounded elbows, top → bottom. */
function verticalPath(a: LaidNode, b: LaidNode) {
  const sx = a.x + a.w / 2, sy = a.y + a.h, tx = b.x + b.w / 2, ty = b.y
  if (Math.abs(sx - tx) < 1) return `M ${sx} ${sy} L ${tx} ${ty}`
  const my = (sy + ty) / 2, dir = Math.sign(tx - sx)
  const r = Math.min(10, Math.abs(tx - sx) / 2, (ty - sy) / 4)
  return `M ${sx} ${sy} V ${my - r} Q ${sx} ${my} ${sx + dir * r} ${my} H ${tx - dir * r} Q ${tx} ${my} ${tx} ${my + r} V ${ty}`
}
