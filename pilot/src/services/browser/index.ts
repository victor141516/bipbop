import CDP from 'chrome-remote-interface'
import { keyboard, mouse, straightTo, randomPointIn, Region, Button as MouseButton, Point, Key } from '@nut-tree/nut-js'
// import { LineHelper } from '@nut-tree/nut-js/dist/lib/util/linehelper.class'
import { path } from 'ghost-cursor'

export { MouseButton }

// const lineHelper = new LineHelper()
mouse.config.mouseSpeed = 250
keyboard.config.autoDelayMs = 50

// function easeOutExpo(x: number): number {
//   return x === 1 ? 1 : 1 - Math.pow(2, -10 * x)
// }

export class Browser {
  private client: Promise<CDP.Client>
  private runtime: Promise<CDP.Client['Runtime']>
  private page: Promise<CDP.Client['Page']>
  private dom: Promise<CDP.Client['DOM']>
  private isNavigating = false

  constructor(cdpOptions: CDP.Options = { host: '127.0.0.1', port: 16666 }) {
    const initResult = CDP(cdpOptions).then(async (client) => {
      const { Runtime, Page, DOM } = client
      await Promise.all([Runtime.enable(), Page.enable()])
      return { runtime: Runtime, client, page: Page, dom: DOM }
    })
    this.client = new Promise(async (res) => res((await initResult).client))
    this.runtime = new Promise(async (res) => res((await initResult).runtime))
    this.page = new Promise(async (res) => res((await initResult).page))
    this.dom = new Promise(async (res) => res((await initResult).dom))

    this.page.then((page) => {
      page.on('frameNavigated', () => (this.isNavigating = false))
      page.on('frameRequestedNavigation', () => (this.isNavigating = true))
    })
  }

  async close() {
    return (await this.client).close()
  }

  async waitForNavigation(timeout = 30000) {
    if (!this.isNavigating) {
      return
    }
    const page = await this.page
    return new Promise<void>(async (resolve, reject) => {
      setTimeout(() => reject(new Error('Timeout')), timeout)
      page.on('frameNavigated', () => resolve())
    })
  }

  async navigateTo(url: string) {
    const page = await this.page
    await page.navigate({ url })
  }

  async getCoords(cssSelector: string): Promise<{ x: number; y: number; width: number; height: number } | null> {
    const runtime = await this.runtime
    const result = await runtime.evaluate({
      expression: `var targetCoordEl = document.querySelector('${cssSelector}'); if (targetCoordEl) { JSON.stringify(targetCoordEl.getClientRects()); }`,
    })

    const screenPos = await runtime.evaluate({
      expression:
        'JSON.stringify({offsetY: window.screen.height - window.innerHeight, offsetX: window.screen.width - window.innerWidth})',
    })

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
    const dom = await this.dom
    const rootNode = await dom.getDocument({ depth: -1 })
    const pageSource = await dom.getOuterHTML({
      nodeId: rootNode.root.nodeId,
    })
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
    width: number
    height: number
    straight: boolean
  }) {
    const destination = await (width && height ? randomPointIn(new Region(x, y, width, height)) : new Point(x, y))

    let stops = await straightTo(destination)
    if (!straight) {
      stops = path({ x: stops.at(0)!.x, y: stops.at(0)!.y }, { x: stops.at(-1)!.x, y: stops.at(-1)!.y }).map(
        ({ x, y }: { x: number; y: number }) => new Point(x, y),
      )

      // const distance =
      //   (Math.abs(destination.x - straightPoints[0].x) + Math.abs(destination.y - straightPoints[0].y)) / 2

      // const firstStopIndex = Math.floor(straightPoints.length * 0.125)
      // const lastStopIndex = Math.floor(straightPoints.length * 0.875)

      // const firstStop = straightPoints[firstStopIndex]
      // const lastStop = straightPoints[lastStopIndex]

      // const randomizedFirstStop = new Point(firstStop.x + distance * 0.125, firstStop.y + distance * 0.125)
      // const randomizedLastStop = new Point(lastStop.x + distance * 0.125, lastStop.y + distance * 0.125)

      // stops.push(...(await straightTo(randomizedFirstStop)))
      // stops.push(...lineHelper.straightLine(randomizedFirstStop, randomizedLastStop))
      // stops.push(...lineHelper.straightLine(randomizedLastStop, straightPoints.at(-1)!))
    }

    return await mouse.move(stops) //, easeOutExpo)
  }

  async click(button: MouseButton = MouseButton.LEFT) {
    return await mouse.click(button)
  }

  async type(text: string[] | Key[]) {
    return await keyboard.type(...text)
  }

  // async waitForElement(cssSelector: string, timeout = 30000) {
  // }
}
