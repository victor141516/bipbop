export class BrowserError extends Error {}
export class MissingParameterBrowserError extends BrowserError {}
export class TimeoutBrowserError extends BrowserError {}
export class KeyboardBrowserError extends BrowserError {}
export class MouseBrowserError extends BrowserError {}
export class UsingKeyboardWithKeyCodesKeyboardBrowserError extends KeyboardBrowserError {}
