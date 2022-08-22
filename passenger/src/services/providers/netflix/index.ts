import {
  click,
  getCoords,
  getPageSource,
  moveCursor,
  navigateTo,
  type,
  waitForElement,
  waitForNavigation,
} from 'services/apis/pilot'
import { JSDOM } from 'jsdom'
import { fuzzyDateParser } from 'services/utils/date'
import { AbstractProvider } from '../abstract'
import { sleep } from 'services/utils/misc'

export class Netflix implements AbstractProvider {
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
    const cookiesCoords = await getCoords({ cssSelector: 'button.btn-red.btn-accept' })
    if (cookiesCoords) {
      await moveCursor(cookiesCoords)
      await click()
    }
    await sleep(100)
    const loginButtonCoords = (await getCoords({ cssSelector: 'a[data-uia=header-login-link]' }))!
    await moveCursor(loginButtonCoords)
    await click()
    await waitForNavigation()
    await sleep(100)

    await waitForElement({ cssSelector: 'input[name=userLoginId]' })
    const emailInputCoords = (await getCoords({ cssSelector: 'input[name=userLoginId]' }))!
    await moveCursor(emailInputCoords)
    await click()
    await sleep(100)
    const [localPart, domain] = this.email.split('@')
    await type({ text: localPart })
    await type({ text: [7, 37] })
    await type({ text: domain })

    for (let i = 0; i < 5; i++) {
      const passwordInputCoords = (await getCoords({ cssSelector: 'input[name=password]' }))!
      await moveCursor(passwordInputCoords)
      await click()
      await sleep(100)
      await type({ text: this.password })
      await sleep(100)

      await type({ text: [101] }) // enter

      let waitIndicatorExists = false
      for (let j = 0; j < 20; j++) {
        if (waitIndicatorExists) {
          waitIndicatorExists = null !== (await getCoords({ cssSelector: 'div.waitIndicator' }))
          if (!waitIndicatorExists) break
        } else {
          waitIndicatorExists = null !== (await getCoords({ cssSelector: 'div.waitIndicator' }))
        }

        await sleep(100)
      }

      await sleep(1000)
      const hasError = null !== (await getCoords({ cssSelector: 'div[data-uia=error-message-container]' }))
      if (!hasError) break
      if (i === 4) throw new Error('Login failed')
    }
    await waitForNavigation()
    await sleep(100)

    const firstProfileCoords = await getCoords({ cssSelector: 'a.profile-link[data-uia*=primary]' })
    if (firstProfileCoords) {
      await moveCursor(firstProfileCoords)
      await click()
      await waitForNavigation()
      await sleep(100)
    }
  }

  async unsubscribe() {
    await this.login()

    await navigateTo('https://www.netflix.com')
    await waitForNavigation()

    await waitForElement({ cssSelector: 'div.account-dropdown-button' })
    await sleep(100)
    const profileDropdownCoords = await getCoords({ cssSelector: 'div.account-dropdown-button' })
    await moveCursor(profileDropdownCoords!)

    await waitForElement({ cssSelector: 'a.sub-menu-link[href*=YourAccount]' })

    const accountLinkCoords = await getCoords({ cssSelector: 'a.sub-menu-link[href*=YourAccount]' })
    await moveCursor({ ...accountLinkCoords!, straight: true })
    await click()
    await waitForNavigation()
    await sleep(100)

    await waitForElement({ cssSelector: 'button.btn.account-cancel-button' })
    const alreadyUnsubscribed =
      null !== (await getCoords({ cssSelector: 'div.account-section-item[data-uia=periodEndDate-item]' }))
    if (alreadyUnsubscribed) return

    let cancelButtonCoords = await getCoords({ cssSelector: 'button.btn.account-cancel-button' })
    await moveCursor(cancelButtonCoords!)
    if (null !== (await getCoords({ cssSelector: 'div[data-uia=info-message-container]' }))) {
      cancelButtonCoords = await getCoords({ cssSelector: 'button.btn.account-cancel-button' })
      await moveCursor(cancelButtonCoords!)
    }
    await click()
    await waitForNavigation()
    await sleep(100)

    for (let i = 0; i < 20; i++) {
      if (null !== (await getCoords({ cssSelector: 'button[data-uia=action-finish-cancellation]' }))) break
      await sleep(1000)
    }
    const confirmCancelButtonCoords = await getCoords({ cssSelector: 'button[data-uia=action-finish-cancellation]' })
    await moveCursor(confirmCancelButtonCoords!)
    await click()
    await waitForNavigation()
    await sleep(100)
  }

  async getNextBillDate() {
    await this.login()
    await navigateTo('https://www.netflix.com/BillingActivity')
    await waitForNavigation()
    await sleep(100)
    await waitForElement({ cssSelector: 'li.retableRow' })

    const pageSource = await getPageSource()
    const page = new JSDOM(pageSource)
    const dates = Array.from(
      page.window.document.querySelectorAll('div[data-uia=billing-details-body] li.retableRow div.billDate > a'),
    ).map((el) => el.textContent!)
    return fuzzyDateParser(dates, dates[0])
  }

  subscribe(): Promise<void> {
    throw new Error('Method not implemented.')
  }

  getSubscriptionStatus(): Promise<boolean> {
    throw new Error('Method not implemented.')
  }
}
