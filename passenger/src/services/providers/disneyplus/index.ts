import {
  click,
  execJS,
  getCoords,
  isElementPresent,
  moveCursor,
  moveCursorToElementAndClick,
  navigateTo,
  type,
  waitForElement,
  waitForNavigation,
} from 'services/apis/pilot'
import { AbstractProvider } from '../abstract'
import { DateTime } from 'luxon'
import { sleep } from 'services/utils/misc'

const SELECTORS = {
  LOGIN_BUTTON: 'header > nav.pre-sticky > a[href*=login]',
  LOGIN_EMAIL_INPUT: 'input[type=email]',
  LOGIN_EMAIL_CONTINUE_BUTTON: 'button[data-testid=login-continue-button]',
  LOGIN_PASSWORD_INPUT: 'input#password',
  LOGIN_PASSWORD_CONTINUE_BUTTON: 'button[data-testid=password-continue-login]',
  ANY_ELEMENT_PRESENT_WHILE_LOGGED_IN: '[class*=profile]',
  ACCEPT_COOKIES: 'button#onetrust-accept-btn-handler',
  PROFILE_AVATAR: 'div.profile-avatar',
  PROFILE_AVATAR_DROPDOWN_ITEM: 'li[data-testid*=account]',
}

export class DisneyPlus implements AbstractProvider {
  email: string
  password: string

  constructor({ email, password }: { email: string; password: string }) {
    this.email = email
    this.password = password
  }

  async login() {
    await navigateTo('https://www.disneyplus.com/')
    await waitForNavigation()
    await sleep(100)
    const isLogged = await Promise.any([
      waitForElement({ cssSelector: SELECTORS.LOGIN_BUTTON }).then(() => false),
      waitForElement({ cssSelector: SELECTORS.ANY_ELEMENT_PRESENT_WHILE_LOGGED_IN }).then(() => true),
    ])
    if (isLogged) return

    if (await isElementPresent({ cssSelector: SELECTORS.ACCEPT_COOKIES })) {
      await moveCursorToElementAndClick({ cssSelector: SELECTORS.ACCEPT_COOKIES })
    }

    await moveCursorToElementAndClick({ cssSelector: SELECTORS.LOGIN_BUTTON })
    await sleep(100)
    await waitForNavigation()
    await sleep(100)
    while (true) {
      await waitForElement({ cssSelector: SELECTORS.LOGIN_EMAIL_INPUT })
      await sleep(500 + Math.random() * 2000)
      await type({ text: this.email })
      const inputValue = await execJS({ code: `document.querySelector('${SELECTORS.LOGIN_EMAIL_INPUT}')?.value` })
      if (typeof inputValue === 'string' && inputValue !== '') break
    }
    await moveCursorToElementAndClick({ cssSelector: SELECTORS.LOGIN_EMAIL_CONTINUE_BUTTON })
    await waitForElement({ cssSelector: SELECTORS.LOGIN_PASSWORD_INPUT })
    await sleep(500 + Math.random() * 2000)
    await type({ text: this.password })
    await moveCursorToElementAndClick({ cssSelector: SELECTORS.LOGIN_PASSWORD_CONTINUE_BUTTON })
    await waitForNavigation()
    await waitForElement({ cssSelector: SELECTORS.ANY_ELEMENT_PRESENT_WHILE_LOGGED_IN })
  }

  async subscribe(): Promise<void> {
    throw new Error('Not implemented')
  }

  async unsubscribe(): Promise<void> {
    await navigateTo('https://www.disneyplus.com/')
    await waitForNavigation()
    await sleep(100)

    if (await isElementPresent({ cssSelector: SELECTORS.ACCEPT_COOKIES })) {
      await moveCursorToElementAndClick({ cssSelector: SELECTORS.ACCEPT_COOKIES })
    }

    await waitForElement({ cssSelector: SELECTORS.PROFILE_AVATAR })
    await sleep(100)
    await moveCursor((await getCoords({ cssSelector: SELECTORS.PROFILE_AVATAR }))!)

    await waitForElement({ cssSelector: SELECTORS.PROFILE_AVATAR_DROPDOWN_ITEM })
    await sleep(500)
    await moveCursor({ ...(await getCoords({ cssSelector: SELECTORS.PROFILE_AVATAR_DROPDOWN_ITEM }))!, straight: true })
    await click()

    const subscriptionMetadata = (await execJS({
      code: "document.querySelector('[data-testid=section-card-accountsubscriptions] div.metadata')?.textContent",
    })) as string | undefined

    const isGooglePlaySubscription = subscriptionMetadata && subscriptionMetadata.includes('Google Play')

    if (isGooglePlaySubscription) throw new Error('Google Play subscription cannot be unsubscribed')
  }

  async getSubscriptionStatus(): Promise<boolean> {
    throw new Error('Not implemented')
  }

  async getNextBillDate(): Promise<DateTime> {
    throw new Error('Not implemented')
  }
}
