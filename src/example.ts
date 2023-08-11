import { ColorMode, Image, Key, screen } from '@nut-tree/nut-js'
// import '@nut-tree/template-matcher'
import jimp from 'jimp'

const apiCall = (endpoint: string, params: unknown = null) => {
  let body = undefined
  if (params) body = JSON.stringify(params)
  return fetch(`http://localhost:3000/api/v1/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  })
    .then((res) => res.json() as Promise<{ ok: true; result: unknown } | { ok: false; error: unknown }>)
    .then((res) => (res.ok ? res.result : Promise.reject(res.error)))
}

const botTest = async () => {
  await apiCall('navigateTo', { url: 'https://fingerprintjs.github.io/BotD/main/' })
  await apiCall('waitForNavigation')
  await apiCall('waitForElement', { cssSelector: '#detectors' })
  await new Promise((r) => setTimeout(r, 500))
  const result = await apiCall('execJS', {
    code: `document.querySelector('#result-text').innerText`,
  })
  console.log(result)
  await apiCall('pressKeys', { keys: [Key.LeftControl] })
  await apiCall('pressKeys', { keys: [Key.W] })
  await apiCall('releaseKeys', { keys: [Key.LeftControl, Key.W] })
}

const recaptchaTest = async () => {
  await apiCall('navigateTo', { url: 'https://www.google.com/recaptcha/api2/demo' })
  await apiCall('moveCursor', { x: 67, y: 448 })
  await apiCall('click')
  await apiCall('waitForElement', { cssSelector: '.recaptcha-checkbox-checked' })
}

async function findImageCoords({ image: base64Image, confidence }: { image: string; confidence?: number }) {
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

  const imageCoords = await screen.find(nutImage, { confidence })
  return imageCoords
}

const main = async () => {
  // botTest()
  // recaptchaTest()
  // console.log(
  //   await findImageCoords({
  //     image: 'replace-by-image-base64',
  //   }),
  // )
  apiCall('parseHeapSnapshot', { include: ['availableVideoQualities'] }).then(console.log)
}

main()

export {}
