const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const yaml = require('js-yaml')
const fm = require('hexo-front-matter')
const { buildTagNavigation } = require('../scripts/tag-navigation')
const definitions = yaml.load(fs.readFileSync('source/_data/tag_navigation.yml', 'utf8'))

test('article tags use a unique canonical vocabulary, without generic legacy labels', () => {
  const vocabulary = definitions.flatMap(group => group.tags)
  assert.equal(new Set(vocabulary.map(name => name.toLowerCase())).size, vocabulary.length)
  const used = new Set()
  for (const file of fs.readdirSync('source/_posts').filter(file => file.endsWith('.md'))) {
    const { tags } = fm.parse(fs.readFileSync('source/_posts/' + file, 'utf8'))
    assert.ok(Array.isArray(tags) && tags.length >= 1 && tags.length <= 4, file)
    assert.equal(new Set(tags).size, tags.length, file)
    for (const tag of tags) {
      assert.ok(vocabulary.includes(tag), `${file}: ${tag}`)
      assert.ok(!['tips', 'tools', '工具', 'bug', 'java', '架构'].includes(tag), file)
      used.add(tag)
    }
  }
  assert.equal(used.size, vocabulary.length)
})

test('tag groups sort by frequency and preserve real archive paths', () => {
  const tags = [
    { name: 'Java', path: 'tags/java/', length: 3 },
    { name: 'Spring', path: 'tags/spring/', length: 7 },
    { name: 'tips', path: 'tags/tips/', length: 0 }
  ]
  const groups = buildTagNavigation(tags, definitions)
  assert.equal(groups.length, 1)
  assert.deepEqual(groups[0].tags.map(tag => tag.name), ['Spring', 'Java'])
  assert.equal(groups[0].tags[1].path, 'tags/java/')
})

test('new tags remain visible even before a navigation group is configured', () => {
  const groups = buildTagNavigation([{ name: '新技术', path: 'tags/new/', length: 1 }], definitions)
  assert.equal(groups.at(-1).name, '其他标签')
  assert.equal(groups.at(-1).tags[0].name, '新技术')
})

test('page layout compiles with both the category and tag directory includes', () => {
  const pug = require('pug')
  assert.doesNotThrow(() => pug.compileFile('themes/butterfly/layout/page.pug'))
})
