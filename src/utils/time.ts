const timeUnits: Array<{ unit: Intl.RelativeTimeFormatUnit; ms: number }> = [
  { unit: 'year', ms: 1000 * 60 * 60 * 24 * 365 },
  { unit: 'month', ms: 1000 * 60 * 60 * 24 * 30 },
  { unit: 'week', ms: 1000 * 60 * 60 * 24 * 7 },
  { unit: 'day', ms: 1000 * 60 * 60 * 24 },
  { unit: 'hour', ms: 1000 * 60 * 60 },
  { unit: 'minute', ms: 1000 * 60 },
  { unit: 'second', ms: 1000 },
]

export const formatDistanceToNowStrict = (isoDate: string) => {
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'always' })
  const target = new Date(isoDate).getTime()
  if (Number.isNaN(target)) return 'just now'

  const now = Date.now()
  const diff = target - now

  for (const { unit, ms } of timeUnits) {
    if (Math.abs(diff) >= ms || unit === 'second') {
      const value = Math.round(diff / ms)
      return formatter.format(value, unit)
    }
  }

  return 'just now'
}

