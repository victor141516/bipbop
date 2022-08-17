import CDP from 'chrome-remote-interface'
import { keyboard, mouse, straightTo, randomPointIn, Region, Button as MouseButton, Point, Key } from '@nut-tree/nut-js'
import { LineHelper } from '@nut-tree/nut-js/dist/lib/util/linehelper.class'

export { MouseButton }

const lineHelper = new LineHelper()

function easeOutBack(x: number): number {
  const c1 = 1.70158
  const c3 = c1 + 1
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2)
}
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

  async moveCursor({ x, y, width, height }: { x: number; y: number; width: number; height: number }) {
    const destination = await (width && height ? randomPointIn(new Region(x, y, width, height)) : new Point(x, y))
    const straightPoints = await straightTo(destination)

    const distance = (Math.abs(destination.x - straightPoints[0].x) + Math.abs(destination.y - straightPoints[0].y)) / 2

    const firstStopIndex = Math.floor(straightPoints.length * 0.125)
    const lastStopIndex = Math.floor(straightPoints.length * 0.875)

    const firstStop = straightPoints[firstStopIndex]
    const lastStop = straightPoints[lastStopIndex]

    const randomizedFirstStop = new Point(firstStop.x * (distance * 0.125), firstStop.y * (distance * 0.125))
    const randomizedLastStop = new Point(lastStop.x * (distance * 0.125), lastStop.y * (distance * 0.125))

    const stops: Point[] = []
    stops.push(...(await straightTo(randomizedFirstStop)))
    stops.push(...lineHelper.straightLine(stops.at(-1)!, randomizedLastStop))
    stops.push(straightPoints.at(-1)!)

    stops.forEach((p) => console.log({ x: p.x, y: p.y }))

    return await mouse.move(stops, easeOutBack)
  }

  async click(button: MouseButton = MouseButton.LEFT) {
    return await mouse.click(button)
  }

  async type(text: string[] | Key[]) {
    return await keyboard.type(...text)
  }
}
