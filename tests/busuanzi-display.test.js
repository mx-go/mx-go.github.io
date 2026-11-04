const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')

test('display tracks provider counters without offsets, accumulation or changing page views', () => {
  const raw = { busuanzi_value_site_uv: { textContent: '' }, busuanzi_value_site_pv: { textContent: '2' }, busuanzi_value_page_pv: { textContent: '7' } }
  const displays = [
    { dataset: { counter: 'busuanzi_value_site_uv' }, textContent: '加载中…' },
    { dataset: { counter: 'busuanzi_value_site_pv' }, textContent: '加载中…' }
  ]
  const callbacks = {}
  class MutationObserver {
    constructor (callback) { this.callback = callback }
    observe (node) { callbacks[Object.keys(raw).find(key => raw[key] === node)] = this.callback }
  }
  vm.runInNewContext(fs.readFileSync('themes/butterfly/source/js/busuanzi-display.js', 'utf8'), {
    document: { querySelectorAll: () => displays, getElementById: id => raw[id] }, MutationObserver, setTimeout, clearTimeout
  })
  assert.equal(displays[0].textContent, '加载中…')
  assert.equal(displays[1].textContent, '2')
  raw.busuanzi_value_site_uv.textContent = '3'
  callbacks.busuanzi_value_site_uv()
  assert.equal(displays[0].textContent, '3')
  callbacks.busuanzi_value_site_uv()
  assert.equal(displays[0].textContent, '3')
  raw.busuanzi_value_site_uv.textContent = '10000'
  callbacks.busuanzi_value_site_uv()
  assert.equal(displays[0].textContent, '1W')
  assert.equal(raw.busuanzi_value_page_pv.textContent, '7')
})

test('unavailable counters stop loading after eight seconds and accept late data', t => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const raw = { textContent: '' }
  const display = { dataset: { counter: 'busuanzi_value_site_uv' }, textContent: '加载中…' }
  let update
  class MutationObserver {
    constructor (callback) { update = callback }
    observe () {}
  }
  vm.runInNewContext(fs.readFileSync('themes/butterfly/source/js/busuanzi-display.js', 'utf8'), {
    document: { querySelectorAll: () => [display], getElementById: () => raw }, MutationObserver, setTimeout, clearTimeout
  })
  t.mock.timers.tick(7999)
  assert.equal(display.textContent, '加载中…')
  t.mock.timers.tick(1)
  assert.equal(display.textContent, '暂不可用')
  assert.match(display.title, /统计服务/)
  raw.textContent = '3'
  update()
  assert.equal(display.textContent, '3')
  assert.equal(display.title, '')
})

test('successful zero and nonzero counters are not replaced by a timeout', t => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const raw = { textContent: '0' }
  const display = { dataset: { counter: 'busuanzi_value_page_pv' }, textContent: '加载中…' }
  let update
  class MutationObserver {
    constructor (callback) { update = callback }
    observe () {}
  }
  vm.runInNewContext(fs.readFileSync('themes/butterfly/source/js/busuanzi-display.js', 'utf8'), {
    document: { querySelectorAll: () => [display], getElementById: () => raw }, MutationObserver, setTimeout, clearTimeout
  })
  assert.equal(display.textContent, '0')
  raw.textContent = '12'
  update()
  t.mock.timers.tick(8000)
  assert.equal(display.textContent, '12')
})

test('counter formatting matches K, W and E examples and rounding', () => {
  const context = { document: { querySelectorAll: () => [] } }
  vm.runInNewContext(fs.readFileSync('themes/butterfly/source/js/busuanzi-display.js', 'utf8'), context)
  for (const [value, expected] of [[999, '999'], [1000, '1K'], [1014, '1.01K'], [1015, '1.02K'], [10000, '1W'], [10140, '1.01W'], [10150, '1.02W'], [100000000, '1E']]) {
    assert.equal(context.formatBusuanziCount(value), expected)
  }
})
