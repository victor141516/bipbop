import { click, getCoords, moveCursor, navigateTo, type, waitForElement, waitForNavigation } from 'services/apis/pilot'

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export class Netflix {
  email: string
  password: string

  constructor({ email, password }: { email: string; password: string }) {
    this.email = email
    this.password = password
  }

  private async login() {
    await navigateTo('https://www.netflix.com')
    await waitForNavigation()
    await sleep(100)
    const cookiesCoords = await getCoords('button.btn-red.btn-accept')
    if (cookiesCoords) {
      await moveCursor(cookiesCoords)
      await click()
    }
    await sleep(100)
    const loginButtonCoords = (await getCoords('a[data-uia=header-login-link]'))!
    await moveCursor(loginButtonCoords)
    await click()
    await waitForNavigation()
    await sleep(100)

    await waitForElement('input[name=userLoginId]')
    const emailInputCoords = (await getCoords('input[name=userLoginId]'))!
    await moveCursor(emailInputCoords)
    await click()
    await sleep(100)
    const [localPart, domain] = this.email.split('@')
    await type(localPart)
    await type([7, 37])
    await type(domain)

    for (let i = 0; i < 5; i++) {
      const passwordInputCoords = (await getCoords('input[name=password]'))!
      await moveCursor(passwordInputCoords)
      await click()
      await sleep(100)
      await type(this.password)
      await sleep(100)

      await type([101]) // enter

      let waitIndicatorExists = false
      for (let j = 0; j < 20; j++) {
        if (waitIndicatorExists) {
          waitIndicatorExists = null !== (await getCoords('div.waitIndicator'))
          if (!waitIndicatorExists) break
        } else {
          waitIndicatorExists = null !== (await getCoords('div.waitIndicator'))
        }

        await sleep(100)
      }

      await sleep(1000)
      const hasError = null !== (await getCoords('div[data-uia=error-message-container]'))
      if (!hasError) break
      if (i === 4) throw new Error('Login failed')
    }
    await waitForNavigation()
    await sleep(100)
  }

  async unsubscribe() {
    await this.login()

    const firstProfileCoords = await getCoords('a.profile-link[data-uia*=primary]')
    if (firstProfileCoords) {
      await moveCursor(firstProfileCoords)
      await click()
      await waitForNavigation()
      await sleep(100)
    }

    const profileDropdownCoords = await getCoords('div.account-dropdown-button')
    await moveCursor(profileDropdownCoords!)

    await waitForElement('a.sub-menu-link[href*=YourAccount]')

    const accountLinkCoords = await getCoords('a.sub-menu-link[href*=YourAccount]')
    await moveCursor({ ...accountLinkCoords!, straight: true })
    await click()
    await waitForNavigation()
    await sleep(100)

    await waitForElement('button.btn.account-cancel-button')
    const alreadyUnsubscribed = null !== (await getCoords('div.account-section-item[data-uia=periodEndDate-item]'))
    if (alreadyUnsubscribed) return

    let cancelButtonCoords = await getCoords('button.btn.account-cancel-button')
    await moveCursor(cancelButtonCoords!)
    if (null !== (await getCoords('div[data-uia=info-message-container]'))) {
      cancelButtonCoords = await getCoords('button.btn.account-cancel-button')
      await moveCursor(cancelButtonCoords!)
    }
    await click()
    await waitForNavigation()
    await sleep(100)

    for (let i = 0; i < 20; i++) {
      if (null !== (await getCoords('button[data-uia=action-finish-cancellation]'))) break
      await sleep(1000)
    }
    const confirmCancelButtonCoords = await getCoords('button[data-uia=action-finish-cancellation]')
    await moveCursor(confirmCancelButtonCoords!)
    await click()
    await waitForNavigation()
    await sleep(100)
  }
}
