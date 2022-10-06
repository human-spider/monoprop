const esbuild = require('esbuild');
const fs = require('fs')

const testDir = './test'
const testFiles = fs.readdirSync(testDir)
  .filter(f => f.endsWith('.ts'))
  .map(f => `${testDir}/${f}`)

const srcDir = './src'
const srcFiles = fs.readdirSync(srcDir)
  .filter(f => f.endsWith('.ts'))
  .map(f => `${srcDir}/${f}`)

esbuild.buildSync({
  allowOverwrite: true,
  // bundle: true,
  entryPoints: [...srcFiles, ...testFiles],
  outdir: `${testDir}/dist`,
  format: 'cjs'
})