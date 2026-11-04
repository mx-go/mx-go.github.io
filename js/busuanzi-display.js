function formatBusuanziCount (value) {
  for (const [divisor, unit] of [[100000000, 'E'], [10000, 'W'], [1000, 'K']]) {
    if (value >= divisor) return String(Math.round(value * 100 / divisor) / 100) + unit
  }
  return String(value)
}

document.querySelectorAll('[data-busuanzi-total]').forEach(display => {
  const counter = document.getElementById(display.dataset.counter)
  if (!counter) return

  const timeout = setTimeout(() => {
    display.textContent = '暂不可用'
    display.title = '统计服务暂未返回数据，请稍后刷新'
  }, 8000)

  const update = () => {
    const value = counter.textContent.trim()
    if (!/^\d+$/.test(value)) return
    clearTimeout(timeout)
    display.textContent = formatBusuanziCount(Number(value))
    display.title = ''
  }
  new MutationObserver(update).observe(counter, { childList: true, characterData: true, subtree: true })
  update()
})
