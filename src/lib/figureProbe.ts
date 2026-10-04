type Probe = (x: number, y: number) => boolean
let figureProbe: Probe | null = null

/** The hero registers a hit-test so the cursor can become a reticle over the figure. */
export const setFigureProbe = (p: Probe | null) => { figureProbe = p }
export const hitsFigure = (x: number, y: number) => figureProbe?.(x, y) ?? false
