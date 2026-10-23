'use strict'

function buildTagNavigation (tags, definitions) {
  const active = tags.filter(tag => tag.length > 0)
  const grouped = new Set()
  const groups = definitions.map(definition => {
    const entries = active.filter(tag => definition.tags.includes(tag.name))
      .sort((left, right) => right.length - left.length || left.name.localeCompare(right.name, 'zh-CN'))
      .map(tag => {
        grouped.add(tag.name)
        return { name: tag.name, path: tag.path, count: tag.length }
      })
    return { ...definition, tags: entries }
  }).filter(group => group.tags.length)
  const other = active.filter(tag => !grouped.has(tag.name))
  if (other.length) {
    groups.push({
      name: '其他标签', slug: 'other', icon: 'fas fa-tags', color: '#3978c5', tint: '#edf4ff', description: '',
      tags: other.sort((left, right) => left.name.localeCompare(right.name, 'zh-CN'))
        .map(tag => ({ name: tag.name, path: tag.path, count: tag.length }))
    })
  }
  return groups
}

if (typeof hexo !== 'undefined') {
  hexo.extend.helper.register('tag_navigation', function () {
    return buildTagNavigation(this.site.tags.toArray(), this.site.data.tag_navigation || [])
  })
}

module.exports = { buildTagNavigation }
