import CDP from 'chrome-remote-interface'
import {
  keyboard,
  mouse,
  straightTo,
  randomPointIn,
  Region,
  Button as MouseButton,
  Point,
  Key,
  clipboard,
  sleep,
} from '@nut-tree/nut-js'
import { path } from 'ghost-cursor'
import { setInterval } from 'timers'
import {
  MissingParameterBrowserError,
  MouseBrowserError,
  TimeoutBrowserError,
  UsingKeyboardWithKeyCodesKeyboardBrowserError,
} from './errors'

export { MouseButton }

keyboard.config.autoDelayMs = 50

export class Browser {
  private client: Promise<Pick<CDP.Client, 'send' | 'on' | 'close'>>
  private isNavigating = false
  private activeTab = { sessionId: '', targetId: '' }

  constructor(cdpOptions: CDP.Options = { host: '127.0.0.1', port: 16666 }) {
    const initResult = CDP(cdpOptions).then(async (client) => {
      const { Runtime, Page, DOM, Target } = client
      await Promise.all([Runtime.enable(), Page.enable()])
      return { runtime: Runtime, client, page: Page, dom: DOM, target: Target }
    })
    this.client = new Promise(async (res) => {
      const client = (await initResult).client
      client.Page.on('frameNavigated', () => (this.isNavigating = false))
      client.Page.on('frameRequestedNavigation', () => (this.isNavigating = true))
      res(client)
    })
  }

  async close() {
    return (await this.client).close()
  }

  async waitForNavigation({ timeout = 30000 }) {
    if (!this.isNavigating) return

    const client = await this.client
    return new Promise<void>(async (resolve, reject) => {
      setTimeout(() => reject(new TimeoutBrowserError()), timeout)
      client.on('Page.frameNavigated', () => resolve())
    })
  }

  async newTab({ url = '' }) {
    const client = await this.client
    const newTarget = await client.send('Target.createTarget', { url }, this.activeTab.sessionId)
    await client.send('Target.attachToTarget', newTarget)
    return newTarget
  }

  async getTabs() {
    const client = await this.client
    const allTabs = await client.send('Target.getTargets')
    return allTabs.targetInfos.map(({ targetId, title, url }) => ({ targetId, title, url }))
  }

  async getActiveTab() {
    const allTabs = await this.getTabs()
    return allTabs.find((tab) => tab.targetId === this.activeTab.targetId)
  }

  async moveToTab({ targetId }: { targetId?: string }) {
    if (!targetId) throw new MissingParameterBrowserError('targetId')
    const client = await this.client
    const { sessionId } = await client.send('Target.attachToTarget', { targetId, flatten: true })
    this.activeTab = { sessionId, targetId }
  }

  async navigateTo({ url }: { url?: string }) {
    if (!url) throw new MissingParameterBrowserError('url')
    const client = await this.client
    return client.send('Page.navigate', { url }, this.activeTab.sessionId)
  }

  async getCoords({
    cssSelector,
  }: {
    cssSelector?: string
  }): Promise<{ x: number; y: number; width: number; height: number } | null> {
    if (!cssSelector) throw new MissingParameterBrowserError('cssSelector')
    const client = await this.client
    const result = await client.send(
      'Runtime.evaluate',
      {
        expression: `var targetCoordEl = document.querySelector('${cssSelector}'); if (targetCoordEl) { JSON.stringify(targetCoordEl.getClientRects()); }`,
      },
      this.activeTab.sessionId,
    )

    const screenPos = await client.send(
      'Runtime.evaluate',
      {
        expression:
          'JSON.stringify({offsetY: window.screen.height - window.innerHeight, offsetX: window.screen.width - window.innerWidth})',
      },
      this.activeTab.sessionId,
    )

    const offset = JSON.parse(screenPos.result.value)
    let clientRect: null | { x: number; y: number; width: number; height: number } = null

    try {
      clientRect = JSON.parse(result.result.value)['0']
    } catch (err) {
      return null
    }

    const retVal = {
      x: offset.offsetX + clientRect!.x,
      y: offset.offsetY + clientRect!.y,
      width: clientRect!.width,
      height: clientRect!.height,
    }
    return retVal
  }

  async getPageSource() {
    const client = await this.client
    const rootNode = await client.send('DOM.getDocument', { depth: -1 }, this.activeTab.sessionId)
    const pageSource = await client.send(
      'DOM.getOuterHTML',
      {
        nodeId: rootNode.root.nodeId,
      },
      this.activeTab.sessionId,
    )
    return pageSource.outerHTML
  }

  async moveCursor({
    x,
    y,
    width,
    height,
    straight = false,
  }: {
    x: number
    y: number
    width?: number
    height?: number
    straight?: boolean
  }) {
    const destination = await (width && height ? randomPointIn(new Region(x, y, width, height)) : new Point(x, y))

    let stops = await straightTo(destination)
    if (!straight) {
      const step = stops.at(Math.floor(stops.length * 0.875))!
      const noise = () => Math.random() * 150 - 75
      const randomizedStep = { x: step.x + noise(), y: step.y + noise() }
      const track1 = path({ x: stops.at(0)!.x, y: stops.at(0)!.y }, randomizedStep).map(
        ({ x, y }: { x: number; y: number }) => new Point(x, y),
      )
      const track2 = path(randomizedStep, { x: stops.at(-1)!.x, y: stops.at(-1)!.y }).map(
        ({ x, y }: { x: number; y: number }) => new Point(x, y),
      )

      stops = [...track1, ...track2]
    }

    mouse.config.mouseSpeed = straight ? 1000 : 30
    try {
      return await mouse.move(stops).then(() => null)
    } catch (error) {
      throw new MouseBrowserError((error as Error)?.message)
    }
  }

  async click({ button = MouseButton.LEFT }) {
    return await mouse.click(button)
  }

  async type({ text, useClipboard = false }: { text?: string[] | Key[]; useClipboard?: boolean }) {
    if (!text) throw new MissingParameterBrowserError('text')
    if (useClipboard) {
      if (typeof text[0] === 'number') throw new UsingKeyboardWithKeyCodesKeyboardBrowserError(text.toString())
      let clipboardText = ''
      clipboardText = Array.isArray(text) ? text.join('') : text
      await clipboard.copy(clipboardText)
      await keyboard.pressKey(Key.LeftControl)
      await sleep(40 + Math.random() * 60)
      await keyboard.pressKey(Key.V)
      await sleep(10 + Math.random() * 30)
      await keyboard.releaseKey(Key.V)
      await sleep(20 + Math.random() * 60)
      await keyboard.releaseKey(Key.LeftControl)
    } else {
      return await keyboard.type(...text)
    }
  }

  async waitForElement({ cssSelector, timeout = 30000 }: { cssSelector?: string; timeout: number }) {
    if (!cssSelector) throw new MissingParameterBrowserError('cssSelector')
    return new Promise<void>(async (resolve, reject) => {
      setTimeout(() => {
        clearInterval(loop)
        reject(new TimeoutBrowserError())
      }, timeout)
      const loop = setInterval(async () => {
        if (null !== (await this.getCoords({ cssSelector }))) {
          clearInterval(loop)
          resolve()
        }
      }, 10)
    })
  }

  async waitForElementToNotExist({ cssSelector, timeout = 30000 }: { cssSelector?: string; timeout: number }) {
    if (!cssSelector) throw new MissingParameterBrowserError('cssSelector')
    return new Promise<void>(async (resolve, reject) => {
      setTimeout(() => {
        clearInterval(loop)
        reject(new TimeoutBrowserError())
      }, timeout)
      const loop = setInterval(async () => {
        if (null === (await this.getCoords({ cssSelector }))) {
          clearInterval(loop)
          resolve()
        }
      }, 10)
    })
  }

  async execJS({ code }: { code?: string }) {
    if (!code) throw new MissingParameterBrowserError('code')
    const client = await this.client
    return await client
      .send(
        'Runtime.evaluate',
        {
          expression: code,
          awaitPromise: true,
          returnByValue: true,
          timeout: 30000,
          allowUnsafeEvalBlockedByCSP: true,
          userGesture: true,
        },
        this.activeTab.sessionId,
      )
      .then((r) => r.result.value)
  }

  async scrollIntoView({ cssSelector }: { cssSelector: string }) {
    let viewportHeight = 0,
      scrollPos = 0,
      elHeight = 0
    const getRemoteData = async () => {
      const result = (await this.execJS({
        code: `(()=>{
                  const { y: scrollPos, height: elHeight } = document.querySelector('${cssSelector}').getBoundingClientRect();
                  const viewportHeight = document.documentElement.clientHeight
                  return { viewportHeight, scrollPos, elHeight }
                })()`,
      })) as { viewportHeight: number; scrollPos: number; elHeight: number }
      console.log(result)
      viewportHeight = result.viewportHeight
      scrollPos = result.scrollPos
      elHeight = result.elHeight
    }

    await getRemoteData()
    const desiredScrollPos = viewportHeight / 2 - elHeight * 1.5
    let diff = scrollPos - desiredScrollPos
    let lastDiff = Infinity
    console.log(1, { diff, lastDiff })
    const isInRange = () => Math.abs(lastDiff) < Math.abs(diff) || lastDiff === diff

    while (!isInRange()) {
      console.log(2, { diff, lastDiff })
      await sleep(10 + 30 * Math.random())
      if (diff > 0) await mouse.scrollDown(1)
      else await mouse.scrollUp(1)
      await getRemoteData()
      lastDiff = diff
      diff = scrollPos - desiredScrollPos
    }
  }
}
