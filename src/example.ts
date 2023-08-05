import { Key } from '@nut-tree/nut-js'

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

const main = async () => {
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

main()

export {}
