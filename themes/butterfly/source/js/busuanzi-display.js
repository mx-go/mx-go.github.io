document.querySelectorAll('[data-busuanzi-total]').forEach(display => {
  const counter = document.getElementById(display.dataset.counter)
  const base = Number(display.dataset.base)
  if (!counter || !Number.isSafeInteger(base) || base < 0) return

  const update = () => {
    const value = counter.textContent.trim()
    if (/^\d+$/.test(value)) display.textContent = String(base + Number(value))
  }
  new MutationObserver(update).observe(counter, { childList: true, characterData: true, subtree: true })
  update()
})
