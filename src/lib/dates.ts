/** Month-precision date helpers for CV periods like "Jun 2026 – Aug 2026" or "Aug 2026 – Present". */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** Months since year 0 — makes arithmetic trivial. */
export type MonthIndex = number

export function parseMonth(s: string): MonthIndex | null {
  const m = s.trim().match(/^([A-Za-z]{3})[a-z]*\.?\s+(\d{4})$/)
  if (!m) return null
  const idx = MONTHS.findIndex((name) => name.toLowerCase() === m[1].toLowerCase())
  return idx < 0 ? null : Number(m[2]) * 12 + idx
}

/** `end: null` means "Present". Returns null if the start can't be read. */
export function parsePeriod(period: string): { start: MonthIndex; end: MonthIndex | null } | null {
  const [a, b = ''] = period.split(/\s*[–—-]\s*/)
  const start = parseMonth(a)
  if (start === null) return null
  const end = /present|now|current/i.test(b) ? null : parseMonth(b)
  return { start, end: end ?? (b ? null : start) }
}

export const currentMonth = (): MonthIndex => {
  const d = new Date()
  return d.getFullYear() * 12 + d.getMonth()
}

export const formatMonth = (i: MonthIndex) => `${MONTHS[((Math.floor(i) % 12) + 12) % 12]} ${Math.floor(Math.floor(i) / 12)}`

export const monthLetter = (i: MonthIndex) => MONTHS[((i % 12) + 12) % 12]

/** Inclusive month count, e.g. Jun–Aug = 3. */
export const monthsInclusive = (start: MonthIndex, end: MonthIndex) => end - start + 1
