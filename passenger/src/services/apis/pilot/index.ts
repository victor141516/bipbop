import { PILOT_URI } from 'services/config'

async function pilotRequest<Param, Result>(method: string, params: Param[]) {
  const response = await fetch(`${PILOT_URI}/api/v1/${method}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  })

  const res = await (response.json() as Promise<{ ok: true; result: Result } | { ok: false; error: unknown }>)
  if (!res.ok) throw new Error(JSON.stringify(res.error))
  return res.result
}

export const navigateTo = async (path: string) => {
  await pilotRequest<string, void>('navigateTo', [path])
}

export const waitForNavigation = async () => {
  await pilotRequest<void, void>('waitForNavigation', [])
}

export const getCoords = async (selector: string) => {
  return await pilotRequest<string, { x: number; y: number; height: number; width: number } | null>('getCoords', [
    selector,
  ])
}

export const getPageSource = async () => {
  return await pilotRequest<void, string>('getPageSource', [])
}

export const moveCursor = async ({
  x,
  y,
  height,
  width,
  straight,
}: {
  x: number
  y: number
  height?: number
  width?: number
  straight?: boolean
}) => {
  await pilotRequest<{ x: number; y: number; height?: number; width?: number; straight?: boolean }, void>(
    'moveCursor',
    [{ x, y, height, width, straight }],
  )
}

export const click = async () => {
  await pilotRequest<void, void>('click', [])
}

export const type = async (text: string | Array<number>) => {
  const textArray = Array.isArray(text) ? text : [text]
  await pilotRequest<Array<string | number>, void>('type', [textArray])
}
