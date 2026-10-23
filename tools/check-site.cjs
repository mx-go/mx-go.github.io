const fs = require('node:fs')
const path = require('node:path')
const yaml = require('js-yaml')

const root = path.resolve(__dirname, '..')
const config = yaml.load(fs.readFileSync(path.join(root, '_config.yml'), 'utf8'))
const publicDir = path.resolve(root, config.public_dir || 'public')
const issues = []
let pages = 0
let images = 0
const attr = (tag, name) => tag.match(new RegExp('\\s' + name + '=["\']([^"\']*)["\']', 'i'))?.[1]

function inspect (directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name)
    if (entry.isDirectory()) { inspect(file); continue }
    if (!entry.name.endsWith('.html')) continue
    pages++
    const html = fs.readFileSync(file, 'utf8')
    if (!html.trim()) issues.push(`Empty page:${file}`)
    if (html.includes('mailto:undefined')) issues.push(`Invalid author link:${file}`)
    const canonical = html.match(/<link\b(?=[^>]*rel=["']canonical["'])[^>]*href=["']([^"']+)/i)?.[1]
    if (canonical && new URL(canonical).origin !== new URL(config.url).origin) issues.push(`Unexpected canonical origin:${file}`)
    for (const tag of html.match(/<(?:img|script|link)\b[^>]*>/gi) || []) {
      const src = attr(tag, 'data-lazy-src') || attr(tag, 'src') || attr(tag, 'href')
      if (!src || /^(?:[a-z]+:|\/\/|#)/i.test(src)) continue
      const base = 'https://site.invalid/' + path.relative(publicDir, file).split(path.sep).join('/')
      const url = new URL(src.replace(/&amp;/g, '&'), base)
      const target = path.join(publicDir, decodeURIComponent(url.pathname))
      if (!fs.existsSync(target)) issues.push(`Missing asset:${src}, page:${file}`)
      if (tag.startsWith('<img') && fs.existsSync(target)) {
        images++
        if (!attr(tag, 'width') || !attr(tag, 'height')) issues.push(`Image dimensions missing:${src}, page:${file}`)
      }
    }
  }
}

try {
  for (const name of ['index.html', 'categories/index.html', 'tags/index.html', '404.html']) {
    if (!fs.existsSync(path.join(publicDir, name))) issues.push(`Required page missing:${name}`)
  }
  const cname = path.join(publicDir, 'CNAME')
  if (fs.existsSync(cname) && fs.readFileSync(cname, 'utf8').trim() !== new URL(config.url).hostname) issues.push('CNAME and canonical hostname differ')
  inspect(publicDir)
  if (issues.length) throw new Error(issues.slice(0, 15).join('\n') + `\nTotal issues:${issues.length}`)
  console.log(`Site checks passed, pages:${pages}, local images:${images}`)
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
}
