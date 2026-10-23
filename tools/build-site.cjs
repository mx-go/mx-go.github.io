const { spawnSync } = require('node:child_process')
const path = require('node:path')
const root = path.resolve(__dirname, '..')
const cli = require.resolve('hexo/bin/hexo')
const result = spawnSync(process.execPath, [cli, 'generate'], { cwd: root, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 })
process.stdout.write(result.stdout || '')
process.stderr.write(result.stderr || '')
const logs = ((result.stdout || '') + (result.stderr || '')).replace(/\x1b\[[0-9;]*m/g, '')
if (result.status !== 0 || /^\s*(?:ERROR|FATAL)\b/m.test(logs)) {
  process.exitCode = 1
} else {
  const check = spawnSync(process.execPath, [path.join(__dirname, 'check-site.cjs')], { cwd: root, stdio: 'inherit' })
  process.exitCode = check.status || (check.signal ? 1 : 0)
}
