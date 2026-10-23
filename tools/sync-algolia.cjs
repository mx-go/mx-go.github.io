const Hexo = require('hexo')
const crypto = require('node:crypto')
const { createRequire } = require('node:module')
const pluginRequire = createRequire(require.resolve('hexo-algolia'))
const algoliasearch = pluginRequire('algoliasearch')
const { preparePosts, getBasicFields, getFieldsWithFilters } = require('hexo-algoliasearch/lib/algolia')

async function sync () {
  const hexo = new Hexo(process.cwd(), { silent: true })
  try {
    await hexo.init()
    await hexo.load()
    const config = hexo.config.algolia
    const appId = process.env.ALGOLIA_APP_ID || config.applicationID || config.appId
    const key = process.env.HEXO_ALGOLIA_INDEXING_KEY || process.env.ALGOLIA_ADMIN_API_KEY
    if (!appId || !key || !config.indexName) throw new Error('Algolia configuration or indexing credential is missing')
    const posts = hexo.database.model('Post').find({ published: true }).toArray()
    if (!posts.length) throw new Error('No published posts; refusing to replace search records')
    const fields = config.fields || ['title', 'permalink', 'excerpt', 'tags', 'categories']
    const records = preparePosts(posts, getBasicFields(fields), getFieldsWithFilters(fields))
    records.forEach((record, i) => {
      record.objectID = crypto.createHash('sha1').update(posts[i].path).digest('hex')
      record.date_as_int = Date.parse(posts[i].date) / 1000
      record.updated_as_int = Date.parse(posts[i].updated) / 1000
    })
    const desired = new Set(records.map(record => record.objectID))
    if (desired.size !== records.length) throw new Error('Duplicate post paths; refusing to sync')
    const index = algoliasearch(appId, key).initIndex(config.indexName)
    const existing = []
    let cursor
    let result
    do {
      result = cursor
        ? await index.browseFrom(cursor)
        : await index.browse({ hitsPerPage: 1000, attributesToRetrieve: ['objectID'] })
      existing.push(...result.hits)
      cursor = result.cursor
    } while (cursor)
    const write = await index.addObjects(records)
    console.log(`Index upsert task:${write.taskID}, records:${records.length}`)
    await index.waitTask(write.taskID)
    // Only remove obsolete records after every current article has been accepted.
    const stale = existing.filter(record => !desired.has(record.objectID)).map(record => record.objectID)
    if (stale.length) {
      const remove = await index.deleteObjects(stale)
      console.log(`Index cleanup task:${remove.taskID}, obsolete records:${stale.length}`)
      await index.waitTask(remove.taskID)
    }
    const check = await index.search('', { hitsPerPage: 0 })
    if (check.nbHits !== records.length) throw new Error(`Index count mismatch: expected ${records.length}, got ${check.nbHits}`)
    console.log(`Search index verified, published articles:${check.nbHits}`)
  } finally {
    await hexo.exit()
  }
}

sync().catch(error => {
  console.error(error.message)
  process.exitCode = 1
})
