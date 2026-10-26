const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')

function fixture () {
  const links = []
  const downloads = []
  const opens = []
  const images = [0, 1].map(i => ({
    getAttribute: name => ({ src: '/placeholder.gif', 'data-lazy-src': `/image-${i}.webp`, alt: `Caption ${i}` })[name],
    replaceWith (link) { links.push(link) }
  }))
  const document = {
    createElement: () => ({ isConnected: true, dataset: {}, setAttribute () {}, removeAttribute () {}, append () {}, addEventListener (name, fn) { this[name] = fn } }),
    head: { append (link) { downloads.push('css'); queueMicrotask(() => link.onload()) } },
    querySelectorAll: () => []
  }
  const jq = { fancybox: { open: (...args) => opens.push(args) } }
  const context = {
    document, window: {}, console, setTimeout, clearTimeout,
    GLOBAL_CONFIG: { source: { jQuery: 'jquery', fancybox: { js: 'fancybox', css: 'css' } } },
    getScript: async url => { downloads.push(url); context.window.jQuery = jq },
    btf: { isJqueryLoad () { downloads.push('eager-jquery') } }
  }
  const source = fs.readFileSync('themes/butterfly/source/js/main.js', 'utf8')
  const block = source.slice(source.indexOf('  let fancyboxReady'), source.indexOf('  const addMediumZoom ='))
  vm.runInNewContext(block + '\nthis.bind = addFancybox', context)
  context.bind(images)
  const click = async index => {
    const event = { button: 0, preventDefault () {}, stopPropagation () {} }
    await links[index].click(event)
  }
  return { links, downloads, opens, click, context, jq }
}

test('image viewer downloads nothing until first click and opens the selected image', async () => {
  const f = fixture()
  assert.equal(f.downloads.length, 0)
  await f.click(1)
  assert.equal(f.opens.length, 1)
  assert.equal(f.opens[0][2], 1)
  assert.equal(f.opens[0][0][1].src, '/image-1.webp')
  assert.equal(f.opens[0][0][1].opts.caption, 'Caption 1')
  await f.click(0)
  assert.equal(f.opens.length, 2)
  assert.equal(f.downloads.filter(x => x === 'jquery').length, 1)
})

test('failed dependencies can retry without leaving the image unusable', async () => {
  const f = fixture()
  let fail = true
  f.context.getScript = async url => {
    f.downloads.push(url)
    if (fail) { fail = false; throw new Error('Network failure') }
    f.context.window.jQuery = f.jq
  }
  await f.click(0)
  assert.equal(f.opens.length, 0)
  await f.click(0)
  assert.equal(f.opens.length, 1)
})

test('rapid clicks share the download and only open the last selected image', async () => {
  const f = fixture()
  let release
  f.context.getScript = url => {
    f.downloads.push(url)
    return new Promise(resolve => { release = () => { f.context.window.jQuery = f.jq; resolve() } })
  }
  const first = f.click(0)
  const second = f.click(1)
  assert.equal(f.downloads.length, 1)
  release()
  await Promise.all([first, second])
  assert.equal(f.opens.length, 1)
  assert.equal(f.opens[0][2], 1)
})
