import assert from 'node:assert/strict'
import { test } from 'node:test'
import { formatMonth, monthLetter, monthsInclusive, parseMonth, parsePeriod } from '../src/lib/dates.ts'

const at = (year: number, month: number) => year * 12 + (month - 1)

test('parseMonth reads "Mon YYYY" in short, long and dotted forms', () => {
  assert.equal(parseMonth('Jun 2026'), at(2026, 6))
  assert.equal(parseMonth('  June 2026 '), at(2026, 6))
  assert.equal(parseMonth('sep. 2025'), at(2025, 9))
})

test('parseMonth rejects anything that is not a month and a year', () => {
  assert.equal(parseMonth(''), null)
  assert.equal(parseMonth('2026'), null)
  assert.equal(parseMonth('Foo 2026'), null)
  assert.equal(parseMonth('Present'), null)
})

test('parsePeriod reads a closed range with an en dash, em dash or hyphen', () => {
  const expected = { start: at(2026, 6), end: at(2026, 8) }
  assert.deepEqual(parsePeriod('Jun 2026 – Aug 2026'), expected)
  assert.deepEqual(parsePeriod('Jun 2026 — Aug 2026'), expected)
  assert.deepEqual(parsePeriod('Jun 2026 - Aug 2026'), expected)
})

test('parsePeriod treats "Present" as an open end', () => {
  assert.deepEqual(parsePeriod('Aug 2026 – Present'), { start: at(2026, 8), end: null })
})

test('parsePeriod treats a single month as a one-month period', () => {
  assert.deepEqual(parsePeriod('Mar 2025'), { start: at(2025, 3), end: at(2025, 3) })
})

test('parsePeriod returns null when the start cannot be read', () => {
  assert.equal(parsePeriod('Present'), null)
  assert.equal(parsePeriod(''), null)
})

test('formatMonth is the inverse of parseMonth', () => {
  assert.equal(formatMonth(at(2026, 1)), 'Jan 2026')
  assert.equal(formatMonth(at(2025, 12)), 'Dec 2025')
  assert.equal(formatMonth(parseMonth('Oct 2024')!), 'Oct 2024')
})

test('monthLetter and monthsInclusive', () => {
  assert.equal(monthLetter(at(2026, 6)), 'Jun')
  assert.equal(monthsInclusive(at(2026, 6), at(2026, 8)), 3)
  assert.equal(monthsInclusive(at(2025, 11), at(2026, 2)), 4)
})
