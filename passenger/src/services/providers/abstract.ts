import type { DateTime } from 'luxon'

export interface AbstractProvider {
  login(): Promise<void>
  subscribe(): Promise<void>
  unsubscribe(): Promise<void>
  getSubscriptionStatus(): Promise<boolean> // TODO: have more statuses like 'subscribed' | 'unsubscribed' | 'cancelledButRemainingDays'
  getNextBillDate(): Promise<DateTime>
}
