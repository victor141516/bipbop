import { Browser } from 'services/browser'

const browser = new Browser({ host: '', port: 1 })

;(async () => {
  await browser.navigateTo('https://mfus.tk')
  console.log(await browser.getPageSource())
  console.log(await browser.getCoords('button'))
  await browser.close()
})()
