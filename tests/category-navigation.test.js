const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const fm = require('hexo-front-matter')
const yaml = require('js-yaml')
const { buildNavigation } = require('../scripts/category-navigation')
const { buildRedirects } = require('../scripts/legacy-category-routes')
const definitions = yaml.load(fs.readFileSync('source/_data/category_navigation.yml', 'utf8'))

test('every article has one valid two-level category path', () => {
  const allowed = new Map(definitions.map(group => [group.name, new Set(group.children)]))
  const posts = fs.readdirSync('source/_posts').filter(file => file.endsWith('.md'))
  const used = new Set()
  for (const file of posts) {
    const post = fm.parse(fs.readFileSync(path.join('source/_posts', file), 'utf8'))
    assert.equal(post.categories.length, 2, file)
    const [parent, child] = post.categories
    assert.equal(typeof parent, 'string', file)
    assert.ok(allowed.get(parent)?.has(child), `${file}: ${parent}/${child}`)
    used.add(`${parent}/${child}`)
  }
  assert.equal(used.size, definitions.reduce((count, group) => count + group.children.length, 0))
})

test('navigation follows configured order and keeps counts and category paths', () => {
  const items = [
    { _id: 'c', parent: 'a', name: '并发与调度', path: 'categories/Java开发/并发与调度/', length: 3 },
    { _id: 'a', name: 'Java开发', path: 'categories/Java开发/', length: 5 },
    { _id: 'b', parent: 'a', name: '基础与JVM', path: 'categories/Java开发/基础与JVM/', length: 2 }
  ]
  const groups = buildNavigation(items, definitions)
  assert.equal(groups[0].count, 5)
  assert.deepEqual(groups[0].children.map(child => child.count), [2, 3])
  assert.equal(groups[0].children[0].path, items[2].path)
  assert.equal(groups.length, 1)
})

test('future categories remain visible without editing navigation metadata', () => {
  const groups = buildNavigation([{ _id: 'new', name: '新领域', path: 'categories/新领域/', length: 1 }], definitions)
  assert.equal(groups[0].name, '新领域')
  assert.equal(groups[0].count, 1)
})

test('legacy category redirects honor the site root and safely escape URLs', () => {
  const result = buildRedirects([{ path: 'categories/old/index.html', to: 'categories/新分类/' }], '/blog/')
  assert.equal(result[0].path, 'categories/old/index.html')
  assert.ok(result[0].data.includes('url=/blog/categories/新分类/'))
  assert.ok(result[0].data.includes('noindex,follow'))
  assert.ok(!buildRedirects([{ path: 'old', to: 'a"<b' }], '/')[0].data.includes('a"<b'))
})
