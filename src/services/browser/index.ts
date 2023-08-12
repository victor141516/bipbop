import {
  ColorMode,
  Image,
  Key,
  Button as MouseButton,
  Point,
  Region,
  clipboard,
  keyboard,
  mouse,
  randomPointIn,
  screen,
  sleep,
  straightTo,
} from '@nut-tree/nut-js'
import '@nut-tree/template-matcher'
import CDP from 'chrome-remote-interface'
import { path } from 'ghost-cursor'
import jimp from 'jimp'
import Tesseract from 'tesseract.js'
import { setInterval } from 'timers'
import {
  MissingParameterBrowserError,
  MouseBrowserError,
  TimeoutBrowserError,
  UsingKeyboardWithKeyCodesKeyboardBrowserError,
} from './errors'
import { captureHeapSnapshot, findObjectsWithProperties } from './heap'
import * as scripts from './scripts'

export { MouseButton }

keyboard.config.autoDelayMs = 50

interface ElementCoords {
  x: number
  y: number
  width: number
  height: number
}

export class Browser {
  private client: Promise<Pick<CDP.Client, 'send' | 'on' | 'close'>>
  private isNavigating = false
  private activeTab = { sessionId: '', targetId: '' }

  constructor(cdpOptions: CDP.Options = { host: '127.0.0.1', port: 16666 }) {
    this.client = this.#initializeClient(cdpOptions)
  }

  #initializeClient(cdpOptions: CDP.Options) {
    return CDP(cdpOptions)
      .then(async (client) => {
        const { Page, DOM } = client
        client.on('error', (err) => {
          console.error('CDP error event:', err)
        })
        await Promise.all([DOM.enable(), Page.enable()])
        client.Page.on('frameNavigated', () => (this.isNavigating = false))
        client.Page.on('frameRequestedNavigation', () => (this.isNavigating = true))
        client.on('disconnect', async () => {
          console.log('CDP client disconnected')
          await sleep(250)
          this.client = this.#initializeClient(cdpOptions)
        })
        return client
      })
      .catch((err) => {
        console.error('CDP client error:', err)
        throw err
      })
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

  async getCoords({ cssSelector, index = 0, all = false }: { cssSelector?: string; index?: number; all?: boolean }) {
    if (!cssSelector) throw new MissingParameterBrowserError('cssSelector')
    const client = await this.client

    const elementCoordsExecution = await client.send(
      'Runtime.evaluate',
      {
        expression: scripts.getElementRect(cssSelector),
      },
      this.activeTab.sessionId,
    )

    const screenPosExecution = await client.send(
      'Runtime.evaluate',
      {
        expression: scripts.getScreenPosition(),
      },
      this.activeTab.sessionId,
    )

    const offset = JSON.parse(screenPosExecution.result.value)
    const elementsRect: Array<ElementCoords> = JSON.parse(elementCoordsExecution.result.value)

    const result = elementsRect.map((rect) => ({
      x: offset.offsetX + rect!.x,
      y: offset.offsetY + rect!.y,
      width: rect!.width,
      height: rect!.height,
    }))

    if (all) return result
    else return result.at(index) ?? null
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

  async pressKeys({ keys }: { keys: Key[] }) {
    return await keyboard.pressKey(...keys)
  }

  async releaseKeys({ keys }: { keys: Key[] }) {
    return await keyboard.releaseKey(...keys)
  }

  async type({ text, useClipboard = false }: { text?: string[] | Key[]; useClipboard?: boolean }) {
    if (!text) throw new MissingParameterBrowserError('text')
    if (useClipboard) {
      if (typeof text[0] === 'number') throw new UsingKeyboardWithKeyCodesKeyboardBrowserError(text.toString())
      let clipboardText = ''
      clipboardText = Array.isArray(text) ? text.join('') : text
      await clipboard.setContent(clipboardText)
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

  async findImageCoords({ image: base64Image, confidence }: { image: string; confidence?: number }) {
    const buffer = new Buffer(base64Image, 'base64')
    const jimpImage = await jimp.read(buffer)
    const nutImage = new Image(
      jimpImage.bitmap.width,
      jimpImage.bitmap.height,
      jimpImage.bitmap.data,
      4,
      Math.random().toString(),
      jimpImage.bitmap.data.length / (jimpImage.bitmap.width * jimpImage.bitmap.height),
      jimpImage.bitmap.data.length / jimpImage.bitmap.height,
      ColorMode.RGB,
    )
    let x = -1,
      y = -1,
      width = -1,
      height = -1
    try {
      const imageCoords = await screen.find(nutImage, { confidence })
      x = imageCoords.left
      y = imageCoords.top
      width = imageCoords.width
      height = imageCoords.height
    } catch (error) {
      if (!(error as Error).message.includes('No match')) throw error
    }

    return { x, y, width, height }
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
        code: scripts.getElementPosition(cssSelector),
      })) as { viewportHeight: number; scrollPos: number; elHeight: number }
      viewportHeight = result.viewportHeight
      scrollPos = result.scrollPos
      elHeight = result.elHeight
    }

    await getRemoteData()
    const desiredScrollPos = viewportHeight / 2 - elHeight * 1.5
    let diff = scrollPos - desiredScrollPos
    let lastDiff = Infinity
    const isInRange = () => {
      return Math.abs(lastDiff) <= Math.abs(diff) && Math.abs(diff) < viewportHeight
    }

    while (!isInRange()) {
      if (diff > 0) await mouse.scrollDown(1)
      else await mouse.scrollUp(1)
      await sleep(10 + 30 * Math.random())
      await getRemoteData()
      lastDiff = diff
      diff = scrollPos - desiredScrollPos
    }
  }

  async historyBack() {
    await this.moveCursor({ x: 20, y: 50 })
    await this.click({})
    await this.waitForNavigation({})
  }

  async historyForward() {
    await this.moveCursor({ x: 60, y: 50 })
    await this.click({})
    await this.waitForNavigation({})
  }

  async parseHeapSnapshot({ include = [], exclude = [] }: { include?: string[]; exclude?: string[] }) {
    const client = (await this.client) as CDP.Client
    const heap = await captureHeapSnapshot(client)
    const result = findObjectsWithProperties(heap, include, {
      ignoreProperties: exclude,
    })
    return result
  }

  async screenOcr({ lang, full = false }: { lang?: string; full?: boolean }) {
    const a = await new Promise<Buffer>(async (res, rej) => {
      const screenshot = await screen.grab()
      new jimp(screenshot).getBuffer(jimp.MIME_PNG, (err, val) => {
        if (err) rej(err)
        res(val)
      })
    })
    const result = await Tesseract.recognize(a, lang)
    if (full) return result
    return result.data.text
  }
}
