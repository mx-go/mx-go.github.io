const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')

test('display baselines track raw counters without accumulating or changing page views', () => {
  const raw = { busuanzi_site_uv: { textContent: '' }, busuanzi_site_pv: { textContent: '2' }, busuanzi_page_pv: { textContent: '7' } }
  const displays = [
    { dataset: { counter: 'busuanzi_site_uv', base: '82985' }, textContent: '加载中…' },
    { dataset: { counter: 'busuanzi_site_pv', base: '189459' }, textContent: '加载中…' }
  ]
  const callbacks = {}
  class MutationObserver {
    constructor (callback) { this.callback = callback }
    observe (node) { callbacks[Object.keys(raw).find(key => raw[key] === node)] = this.callback }
  }
  vm.runInNewContext(fs.readFileSync('themes/butterfly/source/js/busuanzi-display.js', 'utf8'), {
    document: { querySelectorAll: () => displays, getElementById: id => raw[id] }, MutationObserver
  })
  assert.equal(displays[0].textContent, '加载中…')
  assert.equal(displays[1].textContent, '18.95W')
  raw.busuanzi_site_uv.textContent = '3'
  callbacks.busuanzi_site_uv()
  assert.equal(displays[0].textContent, '8.3W')
  callbacks.busuanzi_site_uv()
  assert.equal(displays[0].textContent, '8.3W')
  raw.busuanzi_site_uv.textContent = '10000'
  callbacks.busuanzi_site_uv()
  assert.equal(displays[0].textContent, '9.3W')
  assert.equal(raw.busuanzi_page_pv.textContent, '7')
})

test('counter formatting matches K, W and E examples and rounding', () => {
  const context = { document: { querySelectorAll: () => [] } }
  vm.runInNewContext(fs.readFileSync('themes/butterfly/source/js/busuanzi-display.js', 'utf8'), context)
  for (const [value, expected] of [[999, '999'], [1000, '1K'], [1014, '1.01K'], [1015, '1.02K'], [10000, '1W'], [10140, '1.01W'], [10150, '1.02W'], [100000000, '1E']]) {
    assert.equal(context.formatBusuanziCount(value), expected)
  }
})
