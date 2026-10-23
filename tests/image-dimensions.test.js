const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { createImageEnhancer } = require('../tools/image-dimensions.cjs')

function fixture () {
  const sourceDir = fs.mkdtempSync(path.join(os.tmpdir(), 'blog-images-'))
  fs.mkdirSync(path.join(sourceDir, 'images'))
  fs.writeFileSync(path.join(sourceDir, 'images', 'diagram.svg'), '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 600"></svg>')
  return { sourceDir, enhance: createImageEnhancer({ sourceDir, themeDir: sourceDir, siteUrl: 'https://example.com' }) }
}

test('local lazy images reserve their actual aspect ratio before decoding the placeholder', () => {
  const { sourceDir, enhance } = fixture()
  try {
    const html = enhance('<img src="/loading.gif" data-lazy-src="../../../../images/diagram.svg" alt="架构">')
    assert.match(html, /width="1200"/)
    assert.match(html, /height="600"/)
    assert.match(html, /aspect-ratio:1200 \/ 600/)
    assert.match(html, /data-lazy-src="\.\.\/\.\.\/\.\.\/\.\.\/images\/diagram.svg"/)
  } finally { fs.rmSync(sourceDir, { recursive: true }) }
})

test('an authored width keeps its scale and existing inline styles', () => {
  const { sourceDir, enhance } = fixture()
  try {
    const html = enhance('<img src="/images/diagram.svg" width="300" style="border:0">')
    assert.match(html, /width="300"/)
    assert.match(html, /height="150"/)
    assert.match(html, /style="border:0"/)
  } finally { fs.rmSync(sourceDir, { recursive: true }) }
})

test('remote images, missing files, and explicit dimensions are not rewritten', () => {
  const { sourceDir, enhance } = fixture()
  try {
    for (const html of ['<img src="https://other.example/a.png">', '<img src="/missing.png">', '<img src="/images/diagram.svg" width="300" height="200">']) assert.equal(enhance(html), html)
  } finally { fs.rmSync(sourceDir, { recursive: true }) }
})
