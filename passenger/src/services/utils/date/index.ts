import { DateTime } from 'luxon'

export function fuzzyDateParser(exampleDates: string[], date: string): DateTime {
  const separator = exampleDates[0].replace(/[0-9]/g, '')[0] // '-' | '/' | '.'

  const positions = {
    year: null as null | number,
    month: null as null | number,
    day: null as null | number,
  }
  const numbers = exampleDates.map((d) => d.split(separator).map((n) => Number.parseInt(n)))

  const as = numbers.map(([a]) => a)
  const bs = numbers.map(([, b]) => b)
  const cs = numbers.map(([, , c]) => c)

  const [yearListName] = Object.entries({ as, bs, cs })
    .filter(([, list]) => !list.some((n) => n < 10))
    .map(([name, list]) => [name, new Set(list).size] as ['as' | 'bs' | 'cs', number])
    .sort(([, a], [, b]) => b - a)[0]

  positions.year = { as: 0, bs: 1, cs: 2 }[yearListName]
  const listsToCheckForMonth = { as, bs, cs } as { as?: number[]; bs?: number[]; cs?: number[] }
  delete listsToCheckForMonth[yearListName]

  Object.entries(listsToCheckForMonth).forEach(([name, list]) => {
    if (Math.max(...list) > 12) return
    positions.month = { as: 0, bs: 1, cs: 2 }[name]!
  })

  const availablePositions = new Set([0, 1, 2])
  availablePositions.delete(positions.year!)
  availablePositions.delete(positions.month!)
  positions.day = Array.from(availablePositions)[0]

  const parseTokens = {
    month: 'M',
    year: 'yy',
    day: 'd',
  }
  const reversedPositions = Object.fromEntries(Object.entries(positions).map(([k, v]) => [v, k])) as Record<
    number,
    keyof typeof positions
  >
  return DateTime.fromFormat(
    date,
    `${parseTokens[reversedPositions[0]]}${separator}${parseTokens[reversedPositions[1]]}${separator}${
      parseTokens[reversedPositions[2]]
    }`,
  )
}
