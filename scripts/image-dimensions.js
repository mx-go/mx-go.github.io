const { createImageEnhancer } = require('../tools/image-dimensions.cjs')
let enhance
hexo.extend.filter.register('after_render:html', function (html) {
  if (!enhance) enhance = createImageEnhancer({ sourceDir: this.source_dir, themeDir: this.theme_dir, siteUrl: this.config.url, root: this.config.root })
  return enhance(html)
}, 20)
