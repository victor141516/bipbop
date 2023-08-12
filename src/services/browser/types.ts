import { findObjectsWithProperties } from 'puppeteer-heap-snapshot'
import Tesseract from 'tesseract.js'
import { z } from 'zod'
import { MouseButtons } from '.'

type BuildFunction<P, R> = (params: P) => Promise<R>

export const waitForNavigationParams = z.object({
  timeout: z.number().max(60000).optional().default(30000),
})

export const newTabParams = z
  .object({
    url: z.string().optional().default(''),
  })
  .optional()
  .default({})
export const moveToTabParams = z.object({
  targetId: z.string(),
})
export const navigateToParams = z.object({
  url: z.string(),
})
export const getCoordsParams = z.object({
  cssSelector: z.string(),
  index: z.number().optional().default(0),
  all: z.boolean().optional().default(false),
})
export const moveCursorParams = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number().optional(),
  height: z.number().optional(),
  straight: z.boolean().optional().default(false),
})
export const clickParams = z.object({
  button: z
    .enum(
      Object.keys(MouseButtons) as [keyof typeof MouseButtons, keyof typeof MouseButtons, keyof typeof MouseButtons],
    )
    .optional()
    .default('left'),
})
export const pressKeysParams = z.object({
  keys: z.array(z.number()).min(1),
})
export const releaseKeysParams = z.object({
  keys: z.array(z.number()).min(1),
})
export const typeParams = z.object({
  text: z.array(z.string().or(z.number())).min(1),
  useClipboard: z.boolean().optional().default(false),
})
export const waitForElementParams = z.object({
  cssSelector: z.string(),
  timeout: z.number().max(60000).optional().default(30000),
})
export const waitForElementToNotExistParams = z.object({
  cssSelector: z.string(),
  timeout: z.number().max(60000).optional().default(30000),
})
export const findImageCoordsParams = z.object({
  image: z.string(),
  confidence: z.number().optional(),
})
export const execJSParams = z.object({
  code: z.string(),
})
export const scrollIntoViewParams = z.object({
  cssSelector: z.string(),
})
export const parseHeapSnapshotParams = z.object({
  include: z.array(z.string()).optional().default([]),
  exclude: z.array(z.string()).optional().default([]),
})
export const screenOcrParams = z.object({
  lang: z.string().optional(),
  full: z.boolean().optional().default(false),
})

export type WaitForNavigationFunction = BuildFunction<z.input<typeof waitForNavigationParams>, void>
export type NewTabFunction = BuildFunction<z.input<typeof newTabParams>, { targetId: string }>
export type GetTabsFunction = BuildFunction<Record<string, never>, { targetId: string; title: string; url: string }[]>
export type GetActiveTabFunction = BuildFunction<
  Record<string, never>,
  { targetId: string; title: string; url: string } | undefined
>
export type GetPageSourceFunction = BuildFunction<Record<string, never>, string>
export type HistoryBackFunction = BuildFunction<Record<string, never>, void>
export type HistoryForwardFunction = BuildFunction<Record<string, never>, void>
export type ClickFunction = BuildFunction<z.input<typeof clickParams>, void>
export type MoveToTabFunction = BuildFunction<z.input<typeof moveToTabParams>, void>
export type NavigateToFunction = BuildFunction<z.input<typeof navigateToParams>, { frameId: string }>
export type GetCoordsFunction = BuildFunction<
  z.input<typeof getCoordsParams>,
  | null
  | {
      x: number
      y: number
      width: number
      height: number
    }
  | Array<{
      x: number
      y: number
      width: number
      height: number
    }>
>
export type MoveCursorFunction = BuildFunction<z.input<typeof moveCursorParams>, void>
export type PressKeysFunction = BuildFunction<z.input<typeof pressKeysParams>, void>
export type ReleaseKeysFunction = BuildFunction<z.input<typeof releaseKeysParams>, void>
export type TypeFunction = BuildFunction<z.input<typeof typeParams>, void>
export type WaitForElementFunction = BuildFunction<
  z.input<typeof waitForElementParams>,
  {
    x: number
    y: number
    width: number
    height: number
  }
>
export type WaitForElementToNotExistFunction = BuildFunction<z.input<typeof waitForElementToNotExistParams>, void>
export type FindImageCoordsFunction = BuildFunction<
  z.input<typeof findImageCoordsParams>,
  { x: number; y: number; width: number; height: number }
>
export type ExecJSFunction = BuildFunction<z.input<typeof execJSParams>, void>
export type ScrollIntoViewFunction = BuildFunction<z.input<typeof scrollIntoViewParams>, void>
export type ParseHeapSnapshotFunction = BuildFunction<
  z.input<typeof parseHeapSnapshotParams>,
  ReturnType<typeof findObjectsWithProperties>
>
export type ScreenOcrFunction = BuildFunction<z.input<typeof screenOcrParams>, string | Tesseract.RecognizeResult>

export const isStringArray = (value: unknown): value is string[] => {
  if (!Array.isArray(value)) {
    return false
  }
  return typeof value[0] === 'string'
}

export const isNumberArray = (value: unknown): value is number[] => {
  if (!Array.isArray(value)) {
    return false
  }
  return typeof value[0] === 'number'
}
