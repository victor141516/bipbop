import CDP from 'chrome-remote-interface'

async function getCoords(cssSelector: string) {
  let client
  try {
    // connect to endpoint
    client = await CDP({ host: '', port: 16667 })
    // extract domains
    const { Runtime } = client
    // enable events then start!
    await Promise.all([Runtime.enable()])

    // get clientRect of links
    const result = await Runtime.evaluate({
      expression: `var targetCoordEl = document.querySelector('${cssSelector}'); if (targetCoordEl) { JSON.stringify(targetCoordEl.getClientRects()); }`,
    })

    // get offset screen positioning
    const screenPos = await Runtime.evaluate({
      expression:
        'JSON.stringify({offsetY: window.screen.height - window.innerHeight, offsetX: window.screen.width - window.innerWidth})',
    })

    const offset = JSON.parse(screenPos.result.value)
    let clientRect = null

    try {
      clientRect = JSON.parse(result.result.value)['0']
    } catch (err) {
      return null
    }

    const retVal = {
      x: offset.offsetX + clientRect.x,
      y: offset.offsetY + clientRect.y,
      width: clientRect.width,
      height: clientRect.height,
    }
    console.log(cssSelector, retVal)
    return retVal
  } catch (err) {
    console.error(err)
  } finally {
    if (client) {
      await client.close()
    }
  }
}

getCoords('div')
