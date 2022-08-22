import { PILOT_URI } from 'services/config'

async function pilotRequest<Param, Result>(method: string, params?: Param) {
  const response = await fetch(`${PILOT_URI}/api/v1/${method}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params ?? {}),
  })

  const res = await (response.json() as Promise<{ ok: true; result: Result } | { ok: false; error: unknown }>)
  if (!res.ok) throw new Error(JSON.stringify(res.error))
  return res.result
}

export const navigateTo = async (url: string) => {
  await pilotRequest<{ url: string }, void>('navigateTo', { url })
}

export const waitForNavigation = async () => {
  await pilotRequest<void, void>('waitForNavigation')
}

export const getCoords = async ({ cssSelector }: { cssSelector: string }) => {
  return await pilotRequest<{ cssSelector: string }, { x: number; y: number; height: number; width: number } | null>(
    'getCoords',
    { cssSelector },
  )
}

export const getPageSource = async () => {
  return await pilotRequest<void, string>('getPageSource')
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
    { x, y, height, width, straight },
  )
}

export const click = async () => {
  await pilotRequest<void, void>('click')
}

export const type = async ({ text }: { text: string | Array<number> }) => {
  const textArray = Array.isArray(text) ? text : [text]
  await pilotRequest('type', { text: textArray, useClipboard: true })
}

export const waitForElement = async ({ cssSelector }: { cssSelector: string }) => {
  return await pilotRequest<{ cssSelector: string }, void>('waitForElement', { cssSelector })
}

export const waitForElementToNotExist = async ({ cssSelector }: { cssSelector: string }) => {
  return await pilotRequest<{ cssSelector: string }, void>('waitForElementToNotExist', { cssSelector })
}

export const execJS = async ({ code }: { code: string | ((...args: unknown[]) => unknown) }) => {
  const fString = typeof code === 'function' ? `;(${code.toString()})()` : code
  return await pilotRequest<{ code: string }, string | number | boolean | null | undefined>('execJS', { code: fString })
}

export const moveCursorToElementAndClick = async ({
  cssSelector,
  straight = false,
}: {
  cssSelector: string
  straight?: boolean
}) => {
  await waitForElement({ cssSelector })
  const coords = await getCoords({ cssSelector })
  await moveCursor({ ...coords!, straight })
  await click()
}
