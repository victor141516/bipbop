import {
  execJS,
  getCoords,
  moveCursor,
  moveCursorToElementAndClick,
  navigateTo,
  type,
  waitForElement,
  waitForNavigation,
} from 'services/apis/pilot'
import { AbstractProvider } from '../abstract'
import { sleep } from 'services/utils/misc'
import { DateTime } from 'luxon'

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

  private async login() {
    console.log(1)
    await navigateTo('https://www.disneyplus.com/')
    console.log(2)
    await waitForNavigation()
    console.log(3)
    await sleep(100)
    console.log(4)
    await moveCursorToElementAndClick({ cssSelector: SELECTORS.LOGIN_BUTTON })
    await sleep(1000)
    console.log(5)
    await waitForNavigation()
    await sleep(1000)
    console.log(6)
    // await sleep(10000)
    await waitForElement({ cssSelector: SELECTORS.LOGIN_EMAIL_INPUT })
    // await moveCursorToElementAndClick(SELECTORS.LOGIN_EMAIL_INPUT)
    console.log(7)
    await type({ text: this.email })
    console.log(8)
    await moveCursorToElementAndClick({ cssSelector: SELECTORS.LOGIN_EMAIL_CONTINUE_BUTTON })
    console.log(9)
    await waitForElement({ cssSelector: SELECTORS.LOGIN_PASSWORD_INPUT })
    // await moveCursorToElementAndClick(SELECTORS.LOGIN_PASSWORD_INPUT)
    console.log(10)
    await type({ text: this.password })
    console.log(11)
    await moveCursorToElementAndClick({ cssSelector: SELECTORS.LOGIN_PASSWORD_CONTINUE_BUTTON })
    console.log(12)
    await waitForNavigation()
    console.log(13)
    await waitForElement({ cssSelector: SELECTORS.ANY_ELEMENT_PRESENT_WHILE_LOGGED_IN })
  }

  async subscribe(): Promise<void> {
    throw new Error('Not implemented')
  }

  async unsubscribe(): Promise<void> {
    await this.login()

    await moveCursorToElementAndClick({ cssSelector: SELECTORS.ACCEPT_COOKIES })

    await waitForElement({ cssSelector: SELECTORS.PROFILE_AVATAR })
    await sleep(100)
    await moveCursor({ ...(await getCoords({ cssSelector: SELECTORS.PROFILE_AVATAR }))!, straight: true })

    await moveCursorToElementAndClick({ cssSelector: SELECTORS.PROFILE_AVATAR_DROPDOWN_ITEM })

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
