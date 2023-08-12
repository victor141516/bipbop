import {
  ColorMode,
  Image,
  Key as NutKey,
  Button as NutMouseButton,
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
import { MouseBrowserError, TimeoutBrowserError, UsingKeyboardWithKeyCodesKeyboardBrowserError } from './errors'
import { captureHeapSnapshot, findObjectsWithProperties } from './heap'
import * as scripts from './scripts'
import * as Types from './types'

export const MouseButtons = {
  left: NutMouseButton.LEFT,
  middle: NutMouseButton.MIDDLE,
  right: NutMouseButton.RIGHT,
} as const

export const KeyboardKey = { ...NutKey } as Readonly<Record<keyof typeof NutKey, (typeof NutKey)[keyof typeof NutKey]>>

keyboard.config.autoDelayMs = 50

interface ElementCoords {
  x: number
  y: number
  width: number
  height: number
}

interface BrowserAPI {
  waitForNavigation: Types.WaitForNavigationFunction
  newTab: Types.NewTabFunction
  getTabs: Types.GetTabsFunction
  getActiveTab: Types.GetActiveTabFunction
  getPageSource: Types.GetPageSourceFunction
  historyBack: Types.HistoryBackFunction
  historyForward: Types.HistoryForwardFunction
  click: Types.ClickFunction
  moveToTab: Types.MoveToTabFunction
  navigateTo: Types.NavigateToFunction
  getCoords: Types.GetCoordsFunction
  moveCursor: Types.MoveCursorFunction
  pressKeys: Types.PressKeysFunction
  releaseKeys: Types.ReleaseKeysFunction
  type: Types.TypeFunction
  waitForElement: Types.WaitForElementFunction
  waitForElementToNotExist: Types.WaitForElementToNotExistFunction
  findImageCoords: Types.FindImageCoordsFunction
  execJS: Types.ExecJSFunction
  scrollIntoView: Types.ScrollIntoViewFunction
  parseHeapSnapshot: Types.ParseHeapSnapshotFunction
  screenOcr: Types.ScreenOcrFunction
}

export class Browser implements BrowserAPI {
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

  async waitForNavigation(params?: Parameters<Types.WaitForNavigationFunction>[0]) {
    const { timeout } = Types.waitForNavigationParams.parse(params)

    if (!this.isNavigating) return

    const client = await this.client
    return new Promise<void>(async (resolve, reject) => {
      setTimeout(() => reject(new TimeoutBrowserError()), timeout)
      client.on('Page.frameNavigated', () => resolve())
    })
  }

  async newTab(params: Parameters<Types.NewTabFunction>[0]) {
    const { url } = Types.newTabParams.parse(params)
    const client = await this.client
    const newTarget = await client.send('Target.createTarget', { url }, this.activeTab.sessionId)
    await client.send('Target.attachToTarget', newTarget)
    return { targetId: newTarget.targetId }
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

  async moveToTab(params?: Parameters<Types.MoveToTabFunction>[0]) {
    const { targetId } = Types.moveToTabParams.parse(params)

    const client = await this.client
    const { sessionId } = await client.send('Target.attachToTarget', { targetId, flatten: true })
    this.activeTab = { sessionId, targetId }
  }

  async navigateTo(params?: Parameters<Types.NavigateToFunction>[0]) {
    const { url } = Types.navigateToParams.parse(params)

    const client = await this.client
    const navigationResult = await client.send('Page.navigate', { url }, this.activeTab.sessionId)
    return { frameId: navigationResult.frameId }
  }

  async getCoords(params: Parameters<Types.GetCoordsFunction>[0]) {
    const { cssSelector, index, all } = Types.getCoordsParams.parse(params)

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

    const offset = JSON.parse(screenPosExecution.result.value) as {
      offsetX: number
      offsetY: number
    }
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
      await mouse.move(stops)
    } catch (error) {
      throw new MouseBrowserError((error as Error)?.message)
    }
  }

  async click(params: Parameters<Types.ClickFunction>[0]) {
    const { button } = Types.clickParams.parse(params)
    await mouse.click(MouseButtons[button])
  }

  async pressKeys({ keys }: { keys: (typeof KeyboardKey)[keyof typeof KeyboardKey][] }) {
    await keyboard.pressKey(...keys)
  }

  async releaseKeys({ keys }: { keys: (typeof KeyboardKey)[keyof typeof KeyboardKey][] }) {
    await keyboard.releaseKey(...keys)
  }

  async type(params?: Parameters<Types.TypeFunction>[0]) {
    const { text, useClipboard } = Types.typeParams.parse(params)

    if (useClipboard) {
      if (Types.isNumberArray(text)) throw new UsingKeyboardWithKeyCodesKeyboardBrowserError(text.toString())
      let clipboardText = ''
      clipboardText = Array.isArray(text) ? text.join('') : text
      await clipboard.setContent(clipboardText)
      await keyboard.pressKey(KeyboardKey.LeftControl)
      await sleep(40 + Math.random() * 60)
      await keyboard.pressKey(KeyboardKey.V)
      await sleep(10 + Math.random() * 30)
      await keyboard.releaseKey(KeyboardKey.V)
      await sleep(20 + Math.random() * 60)
      await keyboard.releaseKey(KeyboardKey.LeftControl)
    } else if (Types.isStringArray(text)) {
      await keyboard.type(...text)
    }
  }

  async waitForElement(params?: Parameters<Types.WaitForElementFunction>[0]) {
    const { cssSelector, timeout } = Types.waitForElementParams.parse(params)

    return new Promise<{
      x: number
      y: number
      width: number
      height: number
    }>(async (resolve, reject) => {
      setTimeout(() => {
        clearInterval(loop)
        reject(new TimeoutBrowserError())
      }, timeout)
      const loop = setInterval(async () => {
        const coords = await this.getCoords({ cssSelector })
        if (coords !== null) {
          clearInterval(loop)
          resolve(
            coords as {
              x: number
              y: number
              width: number
              height: number
            },
          )
        }
      }, 10)
    })
  }

  async waitForElementToNotExist(params?: Parameters<Types.WaitForElementFunction>[0]) {
    const { cssSelector, timeout } = Types.waitForElementToNotExistParams.parse(params)

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

  async findImageCoords(params?: Parameters<Types.FindImageCoordsFunction>[0]) {
    const { image: base64Image, confidence } = Types.findImageCoordsParams.parse(params)

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

  async execJS(params?: Parameters<Types.ExecJSFunction>[0]) {
    const { code } = Types.execJSParams.parse(params)

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

  async scrollIntoView(params?: Parameters<Types.ScrollIntoViewFunction>[0]) {
    const { cssSelector } = Types.scrollIntoViewParams.parse(params)

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
    await this.waitForNavigation()
  }

  async historyForward() {
    await this.moveCursor({ x: 60, y: 50 })
    await this.click({})
    await this.waitForNavigation()
  }

  async parseHeapSnapshot(params?: Parameters<Types.ParseHeapSnapshotFunction>[0]) {
    const { include, exclude } = Types.parseHeapSnapshotParams.parse(params)

    const client = (await this.client) as CDP.Client
    const heap = await captureHeapSnapshot(client)
    const result = findObjectsWithProperties(heap, include, {
      ignoreProperties: exclude,
    })
    return result
  }

  async screenOcr(params?: Parameters<Types.ScreenOcrFunction>[0]) {
    const { lang, full } = Types.screenOcrParams.parse(params)

    const screenshot = await new Promise<Buffer>(async (res, rej) => {
      const screenshot = await screen.grab()
      new jimp(screenshot).getBuffer(jimp.MIME_PNG, (err, val) => {
        if (err) rej(err)
        res(val)
      })
    })
    const result = await Tesseract.recognize(screenshot, lang)
    if (full) return result
    return result.data.text
  }
}
