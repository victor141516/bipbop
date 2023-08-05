export const getElementRect = (selector: string) =>
  `var elements = Array.from(document.querySelectorAll('${selector}')); { JSON.stringify(elements.map((e) => e.getClientRects()?.['0']).filter((e) => e !== undefined)); }`

export const getScreenPosition = () =>
  `JSON.stringify({offsetY: window.screen.height - window.innerHeight, offsetX: window.screen.width - window.innerWidth})`

export const getElementPosition = (selector: string) => `(()=>{
  const { y: scrollPos, height: elHeight } = document.querySelector('${selector}').getBoundingClientRect();
  const viewportHeight = document.documentElement.clientHeight
  return { viewportHeight, scrollPos, elHeight }
})()`
