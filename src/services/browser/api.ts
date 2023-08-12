import { Browser } from '.'

type AllBrowserMethods = (typeof Browser)['prototype']
export type BrowserMethods = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [K in keyof AllBrowserMethods as AllBrowserMethods[K] extends (...args: any) => any ? K : never]: (
    ...args: Parameters<AllBrowserMethods[K]>
  ) => Awaited<ReturnType<AllBrowserMethods[K]>>
}
