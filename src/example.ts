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
  await apiCall('navigateTo', { url: 'https://fingerprint.com/products/bot-detection/' })
  await apiCall('waitForNavigation')
  await apiCall('waitForElement', { cssSelector: '[class*="HeroSection-module--botD-"]' })
  await new Promise((r) => setTimeout(r, 5000))
  const a = await apiCall('execJS', {
    code: `document.querySelector('[class*="HeroSection-module--botD-"]').innerText`,
  })
  console.log(a)
}

main()

export {}
