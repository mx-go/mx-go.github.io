const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const pug = require('pug')
const post = (title, year, month, category) => ({ title, date: `${year}-${month}-08`, path: `posts/${title}/`, categories: { data: category ? [{ name: category, path: `categories/${category}/` }] : [] } })
const all = [post('最新文章', 2026, '10', '模型路由'), post('长标题必须完整显示而不被省略号截断', 2025, '04', '智能体工程'), post('旧文章', 2025, '01')]
all[0].cover = '/images/full.webp'
all[0].cover_thumbnail = '/images/thumb.webp'
all[1].cover = false
const collection = rows => ({ length: rows.length, sort: () => collection(rows), toArray: () => rows, each: fn => rows.forEach(fn) })
function render (page = {}) {
  const source = fs.readFileSync('themes/butterfly/layout/archive.pug', 'utf8').split('block content\n')[1].replace(/^  /gm, '').replace(/^.*include.*$/gm, '')
  return pug.render(source, {
    site: { posts: collection(all) }, page: { posts: collection(all.slice(0, 2)), current: 1, total: 2, ...page },
    theme: { error_img: { post_page: '/img/404.jpg' } }, config: { archive_dir: 'archives' }, date: (value, format) => format === 'YYYY' ? value.slice(0, 4) : format === 'MM' ? value.slice(5, 7) : format === 'MM-DD' ? value.slice(5) : value,
    date_xml: value => value, url_for: value => '/' + value.replace(/^\//, ''), _p: () => '文章总览'
  })
}
test('archive directory links to full years and retains complete article titles and categories', () => {
  const html = render()
  assert.match(html, /aria-label="按年份浏览"/)
  assert.match(html, /href="\/archives\/2025\/"/)
  assert.match(html, /全年 2 篇/)
  assert.match(html, /长标题必须完整显示而不被省略号截断/)
  assert.match(html, /href="\/categories\/智能体工程\/"/)
  assert.match(html, /第 1 \/ 2 页/)
  assert.match(html, /<img[^>]+src="\/images\/thumb.webp"/)
  assert.equal((html.match(/<img/g) || []).length, 1)
  assert.match(html, /<details[^>]*class="archive-year-section"[^>]*open/)
  assert.match(html, /<summary class="archive-year-heading">/)
})
test('year and month archives show their actual scope and matching article count', () => {
  const html = render({ year: 2025, month: 4, posts: collection([all[1]]), total: 1 })
  assert.match(html, /2025 年 04 月/)
  assert.match(html, /共 1 篇/)
  assert.doesNotMatch(html, /<img/)
  assert.match(html, /全年 2 篇/)
})
