function formatBusuanziCount (value) {
  for (const [divisor, unit] of [[100000000, 'E'], [10000, 'W'], [1000, 'K']]) {
    if (value >= divisor) return String(Math.round(value * 100 / divisor) / 100) + unit
  }
  return String(value)
}

document.querySelectorAll('[data-busuanzi-total]').forEach(display => {
  const counter = document.getElementById(display.dataset.counter)
  const base = Number(display.dataset.base)
  if (!counter || !Number.isSafeInteger(base) || base < 0) return

  const update = () => {
    const value = counter.textContent.trim()
    if (/^\d+$/.test(value)) display.textContent = formatBusuanziCount(base + Number(value))
  }
  new MutationObserver(update).observe(counter, { childList: true, characterData: true, subtree: true })
  update()
})
