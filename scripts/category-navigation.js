'use strict'

function buildNavigation (categories, definitions) {
  const order = new Map(definitions.map((entry, index) => [entry.name, index]))
  const byOrder = (names, left, right) => (names.get(left.name) ?? Infinity) - (names.get(right.name) ?? Infinity) || left.name.localeCompare(right.name, 'zh-CN')
  return categories.filter(category => !category.parent && category.length > 0)
    .sort((left, right) => byOrder(order, left, right))
    .map(category => {
      const definition = definitions.find(entry => entry.name === category.name) || {}
      const childOrder = new Map((definition.children || []).map((name, index) => [name, index]))
      return {
        name: category.name,
        path: category.path,
        count: category.length,
        slug: definition.slug || `category-${category._id}`,
        icon: definition.icon || 'fas fa-folder-open',
        color: definition.color || '#3978c5',
        tint: definition.tint || '#edf4ff',
        description: definition.description || '',
        children: categories.filter(child => child.parent === category._id && child.length > 0)
          .sort((left, right) => byOrder(childOrder, left, right))
          .map(child => ({ name: child.name, path: child.path, count: child.length }))
      }
    })
}

if (typeof hexo !== 'undefined') {
  hexo.extend.helper.register('category_navigation', function () {
    return buildNavigation(this.site.categories.toArray(), this.site.data.category_navigation || [])
  })
}

module.exports = { buildNavigation }
