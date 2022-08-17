import CDP from 'chrome-remote-interface'
import { keyboard, mouse, straightTo, randomPointIn, Region, Button as MouseButton, Point } from '@nut-tree/nut-js'

export { MouseButton }

export class Browser {
  private client: Promise<CDP.Client>
  private runtime: Promise<CDP.Client['Runtime']>
  private page: Promise<CDP.Client['Page']>
  private dom: Promise<CDP.Client['DOM']>

  constructor(cdpOptions?: CDP.Options | undefined) {
    const initResult = CDP(cdpOptions).then(async (client) => {
      const { Runtime, Page, DOM } = client
      await Promise.all([Runtime.enable(), Page.enable()])
      return { runtime: Runtime, client, page: Page, dom: DOM }
    })
    this.client = new Promise(async (res) => res((await initResult).client))
    this.runtime = new Promise(async (res) => res((await initResult).runtime))
    this.page = new Promise(async (res) => res((await initResult).page))
    this.dom = new Promise(async (res) => res((await initResult).dom))
  }

  async close() {
    return (await this.client).close()
  }

  async navigateTo(url: string, timeout = 30000) {
    const page = await this.page
    return new Promise<void>(async (resolve, reject) => {
      setTimeout(() => reject(new Error('Timeout')), timeout)
      page.on('frameNavigated', () => resolve())
      await page.navigate({ url })
    })
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
    const point = width && height ? randomPointIn(new Region(x, y, width, height)) : new Point(x, y)
    return await mouse.move(straightTo(point))
  }

  async click(button: MouseButton = MouseButton.LEFT) {
    return await mouse.click(button)
  }

  async type(text: string) {
    return await keyboard.type(text)
  }
}
