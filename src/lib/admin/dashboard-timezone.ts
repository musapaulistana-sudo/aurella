/** Business calendar for the admin dashboard (Brazil). */
export const DASHBOARD_TIMEZONE = 'America/Sao_Paulo'

/**
 * Calendar day `YYYY-MM-DD` in the dashboard timezone.
 * Avoids UTC day shifts from `toISOString().slice(0, 10)`.
 */
export function zonedDayKey(input: Date | string, timeZone = DASHBOARD_TIMEZONE): string {
  const date = typeof input === 'string' ? new Date(input) : input
  if (Number.isNaN(date.getTime())) return ''

  // en-CA → YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

function tzOffsetMs(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)

  const map = Object.fromEntries(
    parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value])
  )

  const asUtc = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(map.hour),
    Number(map.minute),
    Number(map.second)
  )

  return asUtc - date.getTime()
}

/** UTC instant for a wall-clock datetime in `timeZone`. */
export function zonedWallTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
  ms = 0,
  timeZone = DASHBOARD_TIMEZONE
): Date {
  const wallAsUtc = Date.UTC(year, month - 1, day, hour, minute, second, ms)
  let utcMs = wallAsUtc - tzOffsetMs(new Date(wallAsUtc), timeZone)
  utcMs = wallAsUtc - tzOffsetMs(new Date(utcMs), timeZone)
  return new Date(utcMs)
}

export function startOfZonedDay(input: Date | string, timeZone = DASHBOARD_TIMEZONE): Date {
  const key = zonedDayKey(input, timeZone)
  const [year, month, day] = key.split('-').map(Number)
  return zonedWallTimeToUtc(year!, month!, day!, 0, 0, 0, 0, timeZone)
}

export function addZonedDays(dayKey: string, deltaDays: number): string {
  const [year, month, day] = dayKey.split('-').map(Number)
  const utcNoon = Date.UTC(year!, month! - 1, day!, 12, 0, 0)
  const shifted = new Date(utcNoon + deltaDays * 24 * 60 * 60 * 1000)
  const y = shifted.getUTCFullYear()
  const m = String(shifted.getUTCMonth() + 1).padStart(2, '0')
  const d = String(shifted.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function formatDayLabel(dayKey: string): string {
  const [, month, day] = dayKey.split('-')
  return `${day}/${month}`
}
