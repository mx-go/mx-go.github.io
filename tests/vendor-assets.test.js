const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const crypto = require('node:crypto')
const vm = require('node:vm')

const vendors = JSON.parse(fs.readFileSync('source/vendor/manifest.json', 'utf8'))

test('vendored assets match their recorded upstream hashes', () => {
  for (const vendor of vendors) {
    for (const asset of vendor.assets) {
      const content = fs.readFileSync('source/vendor/' + asset.file)
      assert.equal(crypto.createHash('sha256').update(content).digest('hex'), asset.sha256, asset.file)
    }
  }
})

test('classic script dependencies remain compatible with script-tag loading', () => {
  for (const vendor of vendors) {
    if (vendor.package === 'instant.page') continue // Loaded with type="module".
    for (const asset of vendor.assets.filter(asset => asset.file.endsWith('.js'))) {
      assert.doesNotThrow(() => new vm.Script(fs.readFileSync('source/vendor/' + asset.file, 'utf8')), asset.file)
    }
  }
})
