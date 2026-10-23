'use strict'

const escape = value => value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character])

function buildRedirects (redirects, root, label = '分类') {
  const directory = escape(label)
  const prefix = `/${(root || '/').replace(/^\/+|\/+$/g, '')}`.replace(/\/$/, '')
  return redirects.map(redirect => {
    const destination = escape(`${prefix}/${redirect.to}`)
    return {
      path: redirect.path,
      data: `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,follow"><meta http-equiv="refresh" content="0;url=${destination}"><title>${directory}已更新</title></head><body><p>${directory}已重新整理，正在前往<a href="${destination}">新的${directory}目录</a>。</p></body></html>`
    }
  })
}

if (typeof hexo !== 'undefined') {
  hexo.extend.generator.register('legacy-tag-routes', function () {
    return buildRedirects(this.locals.get('data').legacy_tag_routes || [], this.config.root, '标签')
  })
  hexo.extend.generator.register('legacy-category-routes', function () {
    return buildRedirects(this.locals.get('data').legacy_category_routes || [], this.config.root)
  })
}

module.exports = { buildRedirects }
