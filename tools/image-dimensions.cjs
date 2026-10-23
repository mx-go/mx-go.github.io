const fs = require('node:fs')
const path = require('node:path')
const imageSize = require('image-size')

const attribute = (tag, name) => {
  const match = tag.match(new RegExp('\\s' + name + '\\s*=\\s*(?:"([^"]*)"|\'([^\']*)\'|([^\\s>]+))', 'i'))
  return match && (match[1] ?? match[2] ?? match[3])
}
const dimension = value => /^\d+(?:px)?$/.test(value || '') ? parseInt(value, 10) : null

function createImageEnhancer ({ sourceDir, themeDir, siteUrl, root = '/' }) {
  const directories = [sourceDir, path.join(themeDir, 'source')].map(dir => path.resolve(dir))
  const cache = new Map()
  const origin = new URL(siteUrl).origin
  return html => {
    const canonical = html.match(/<link\b(?=[^>]*\brel=["']canonical["'])[^>]*\bhref=["']([^"']+)["']/i)?.[1] || siteUrl
    return html.replace(/<img\b[^>]*>/gi, tag => {
      let width = dimension(attribute(tag, 'width'))
      let height = dimension(attribute(tag, 'height'))
      const lazy = attribute(tag, 'data-lazy-src')
      const additions = []
      if (!width || !height) {
        let url
        try { url = new URL((lazy || attribute(tag, 'src') || '').replace(/&amp;/g, '&'), canonical) } catch { return tag }
        if (url.origin !== origin) return tag
        let relative
        try { relative = decodeURIComponent(url.pathname) } catch { return tag }
        if (root !== '/' && relative.startsWith(root)) relative = relative.slice(root.length)
        let size
        for (const directory of directories) {
          const file = path.resolve(directory, '.' + (relative.startsWith('/') ? relative : '/' + relative))
          if (!file.startsWith(directory + path.sep)) continue
          if (!cache.has(file)) {
            try { cache.set(file, imageSize(fs.readFileSync(file))) } catch { cache.set(file, null) }
          }
          if (cache.get(file)) { size = cache.get(file); break }
        }
        if (!size?.width || !size?.height) return tag
        if (attribute(tag, 'width') && !width || attribute(tag, 'height') && !height) return tag
        if (!width) { width = height ? Math.round(height * size.width / size.height) : size.width; additions.push(`width="${width}"`) }
        if (!height) { height = Math.round(width * size.height / size.width); additions.push(`height="${height}"`) }
      }
      if (lazy && !/aspect-ratio\s*:/i.test(attribute(tag, 'style') || '')) {
        const ratio = `aspect-ratio:${width} / ${height}`
        const style = attribute(tag, 'style')
        if (style !== null) tag = tag.replace(/\sstyle\s*=\s*("[^"]*"|'[^']*')/i, ` style="${style};${ratio}"`)
        else additions.push(`style="${ratio}"`)
      }
      if (!additions.length) return tag
      return tag.replace(/\/?\>$/, end => ' ' + additions.join(' ') + end)
    })
  }
}
module.exports = { createImageEnhancer }
