import { Browser } from 'services/browser'

const browser = new Browser({ host: '127.0.0.1', port: 16666 })

;(async () => {
  await browser.navigateTo('https://mfus.tk')
  console.log(await browser.getPageSource())
  console.log(await browser.getCoords('button'))
  await browser.close()
})()
