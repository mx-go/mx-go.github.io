const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')

test('display baselines track raw counters without accumulating or changing page views', () => {
  const raw = { busuanzi_site_uv: { textContent: '' }, busuanzi_site_pv: { textContent: '2' }, busuanzi_page_pv: { textContent: '7' } }
  const displays = [
    { dataset: { counter: 'busuanzi_site_uv', base: '189458' }, textContent: '加载中…' },
    { dataset: { counter: 'busuanzi_site_pv', base: '982980' }, textContent: '加载中…' }
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
  assert.equal(displays[1].textContent, '982982')
  raw.busuanzi_site_uv.textContent = '3'
  callbacks.busuanzi_site_uv()
  assert.equal(displays[0].textContent, '189461')
  callbacks.busuanzi_site_uv()
  assert.equal(displays[0].textContent, '189461')
  raw.busuanzi_site_uv.textContent = '4'
  callbacks.busuanzi_site_uv()
  assert.equal(displays[0].textContent, '189462')
  assert.equal(raw.busuanzi_page_pv.textContent, '7')
})
