const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')

function target (extra = {}) {
  const listeners = new Map()
  return Object.assign({
    addEventListener (name, fn) {
      if (!listeners.has(name)) listeners.set(name, new Set())
      listeners.get(name).add(fn)
    },
    removeEventListener (name, fn) { listeners.get(name)?.delete(fn) },
    emit (name) { for (const fn of [...(listeners.get(name) || [])]) if (typeof fn === 'function') fn() }
  }, extra)
}
const read = path => fs.readFileSync(path, 'utf8')
const pugScript = text => text.split('\n').slice(1).map(line => line.replace(/^  /, '')).join('\n')

test('loading ends on DOM ready without waiting for window load', () => {
  const classes = new Set()
  const window = target()
  const document = target({ readyState: 'loading', body: { style: {} }, getElementById: () => ({ classList: { add: v => classes.add(v), remove: v => classes.delete(v) } }) })
  vm.runInNewContext(pugScript(read('themes/butterfly/layout/includes/loading/loading-js.pug')), { window, document })
  assert.equal(classes.has('loaded'), false)
  document.emit('DOMContentLoaded')
  assert.equal(classes.has('loaded'), true)
  assert.equal(document.body.style.overflow, 'auto')
})

function searchContext () {
  const elements = new Map()
  const element = selector => {
    if (!elements.has(selector)) elements.set(selector, target({ style: {}, textContent: '', hidden: true, focus () {} }))
    return elements.get(selector)
  }
  const document = target({ body: { style: {} }, querySelector: element, getElementById: element })
  const window = target()
  let starts = 0
  const requests = []
  const instantsearch = () => ({ addWidget () {}, start () { starts++ } })
  instantsearch.widgets = Object.fromEntries(['searchBox', 'hits', 'stats', 'pagination'].map(name => [name, () => ({})]))
  vm.runInNewContext(read('themes/butterfly/source/js/search/algolia.js'), {
    window, document, console, instantsearch,
    getScript: () => new Promise((resolve, reject) => requests.push({ resolve, reject })),
    GLOBAL_CONFIG: { root: '/', algolia: { script: '/vendor/search.js', appId: 'test', apiKey: 'test', indexName: 'test', hits: {}, languages: {} } },
    btf: { fadeIn () {}, fadeOut () {} }, setTimeout, clearTimeout
  })
  document.emit('DOMContentLoaded')
  return { element, requests, starts: () => starts }
}
const settleSearch = () => new Promise(resolve => setImmediate(resolve))

test('search loads only on first open and reuses its initialized client', async () => {
  const ctx = searchContext()
  assert.equal(ctx.requests.length, 0)
  assert.equal(ctx.starts(), 0)
  ctx.element('#search-button > .search').emit('click')
  assert.equal(ctx.element('#algolia-search .search-dialog').style.display, 'block')
  assert.equal(ctx.requests.length, 1)
  ctx.element('#search-button > .search').emit('click')
  assert.equal(ctx.requests.length, 1)
  ctx.requests[0].resolve()
  await settleSearch()
  assert.equal(ctx.starts(), 1)
  ctx.element('#algolia-search .search-close-button').emit('click')
  ctx.element('#search-button > .search').emit('click')
  await settleSearch()
  assert.equal(ctx.requests.length, 1)
  assert.equal(ctx.starts(), 1)
})

test('search can retry after a failed dependency download', async () => {
  const ctx = searchContext()
  ctx.element('#search-button > .search').emit('click')
  ctx.requests[0].reject(new Error('Download failed'))
  await settleSearch()
  assert.equal(ctx.element('algolia-search-retry').hidden, false)
  ctx.element('algolia-search-retry').emit('click')
  assert.equal(ctx.requests.length, 2)
  ctx.requests[1].resolve()
  await settleSearch()
  assert.equal(ctx.starts(), 1)
  assert.equal(ctx.element('algolia-search-retry').hidden, true)
})

test('homepage hint waits only for the hero, with a bounded fallback', () => {
  const timers = new Map()
  const images = []
  let next = 0
  const window = target({ scrollY: 0, innerHeight: 800, matchMedia: () => target({ matches: false }) })
  const document = target({ readyState: 'loading', hidden: false,
    querySelector: () => ({ style: { backgroundImage: 'url("/img/index_image.jpg")' } }), getElementById: () => ({}) })
  vm.runInNewContext(read('source/js/home-scroll-hint.js'), {
    window, document, location: { hash: '' }, performance: { getEntriesByType: () => [] },
    Image: function () { images.push(this) },
    setTimeout (fn, delay) { const id = ++next; timers.set(id, { fn, delay }); return id },
    clearTimeout: id => timers.delete(id), requestAnimationFrame () {}, cancelAnimationFrame () {}
  })
  document.emit('DOMContentLoaded')
  assert.equal(images.length, 1)
  assert.equal(images[0].src, '/img/index_image.jpg')
  const deadline = [...timers.values()].find(timer => timer.delay === 1500)
  assert.ok(deadline)
  deadline.fn()
  assert.equal([...timers.values()].filter(timer => timer.delay === 900).length, 1)
  images[0].onload?.()
  assert.equal([...timers.values()].filter(timer => timer.delay === 900).length, 1)
  window.emit('wheel')
  assert.equal(timers.size, 0)
})

function poemContext (effect = true, failure = false, readyState = 'loading') {
  const pug = require('pug')
  const html = pug.renderFile('themes/butterfly/layout/includes/third-party/subtitle.pug', {
    theme: { subtitle: { source: 4, effect, loop: false, sub: [] }, CDN: { typed: '/typed.js' } },
    config: { subtitle: '不忘初心 方得始终' }, url_for: value => value
  })
  const requests = []
  const timers = []
  const animations = []
  const element = { textContent: '', dataset: {}, isConnected: true }
  const window = target()
  const document = { readyState, getElementById: () => element }
  const context = { window, document, setTimeout: (fn, delay) => { timers.push(fn); fn.delay = delay; return fn }, clearTimeout: fn => { const i = timers.indexOf(fn); if (i >= 0) timers.splice(i, 1) },
    getScript: url => { requests.push(url); return failure ? Promise.reject(new Error('offline')) : Promise.resolve() },
    jinrishici: { load: callback => callback({ data: { content: '海内存知己' } }) },
    Typed: function (selector, options) { assert.equal(element.textContent, '', 'Typed must start with an empty element'); animations.push(options); element.textContent = options.strings[0]; this.destroy = () => { element.textContent = '' } }
  }
  vm.runInNewContext(html.replace(/^<script>|<\/script>$/g, ''), context)
  return { context, requests, timers, animations, element, window, document }
}

test('poetry waits until after load and keeps the typewriter effect', async () => {
  const state = poemContext()
  assert.equal(state.element.textContent, '不忘初心 方得始终')
  assert.deepEqual(state.requests, [])
  state.window.emit('load')
  assert.deepEqual(state.requests, [])
  state.timers.shift()()
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(state.requests[0], 'https://sdk.jinrishici.com/v2/browser/jinrishici.js')
  assert.equal(state.element.textContent, '海内存知己')
  assert.equal(state.animations.length, 1)
})

test('poetry failure keeps local text and late execution still starts', async () => {
  const state = poemContext(false, true, 'complete')
  state.context.subtitleType()
  state.timers.shift()()
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(state.element.textContent, '不忘初心 方得始终')
  assert.equal(state.animations.length, 0)
})


test('poetry fetches the next verse after typing and reuses the SDK', async () => {
  const state = poemContext()
  state.window.emit('load')
  state.timers.shift()()
  await new Promise(resolve => setImmediate(resolve))
  state.animations[0].onComplete()
  assert.equal(state.timers[0].delay, 3000)
  state.context.jinrishici.load = callback => callback({ data: { content: '天涯若比邻' } })
  state.timers.shift()()
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(state.element.textContent, '天涯若比邻')
  assert.equal(state.requests.length, 1)
  assert.equal(state.animations.length, 2)
  state.animations[1].onComplete()
  state.element.isConnected = false
  state.timers.shift()()
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(state.animations.length, 2)
})

test('poetry retries after a response timeout without erasing the current text', async () => {
  const state = poemContext(false)
  state.context.jinrishici.load = () => {}
  state.window.emit('load')
  state.timers.shift()()
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(state.timers[0].delay, 10000)
  state.timers.shift()()
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(state.element.textContent, '不忘初心 方得始终')
  assert.equal(state.timers[0].delay, 3000)
})

test('poetry without typewriter also schedules the next verse', async () => {
  const state = poemContext(false)
  state.window.emit('load')
  state.timers.shift()()
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(state.element.textContent, '海内存知己')
  assert.equal(state.timers[0].delay, 3000)
})

test('post-only typography leaves navigation and filing text untouched', () => {
  const pug = require('pug')
  const html = pug.renderFile('themes/butterfly/layout/includes/third-party/pangu.pug', {
    theme: { pangu: { field: 'post' }, CDN: { pangu: '/vendor/pangu.js' } }, url_for: value => value
  })
  const document = target()
  const calls = []
  vm.runInNewContext(html.match(/<script>([\s\S]*)<\/script>/)[1], {
    document, GLOBAL_CONFIG_SITE: { isPost: true },
    pangu: { spacingElementById: id => calls.push(id), autoSpacingPage: () => calls.push('whole-page') }
  })
  document.emit('DOMContentLoaded')
  assert.deepEqual(calls, ['article-container'])
})
