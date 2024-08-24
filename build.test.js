const esbuild = require('esbuild');
const fs = require('fs')
const { transformExtPlugin } = require("@gjsify/esbuild-plugin-transform-ext");

const testDir = './test'
const testFiles = fs.readdirSync(testDir)
  .filter(f => f.endsWith('.ts'))
  .map(f => `${testDir}/${f}`)

const srcDir = './src'
const srcFiles = fs.readdirSync(srcDir)
  .filter(f => f.endsWith('.ts'))
  .map(f => `${srcDir}/${f}`)

;(async () => {
  await esbuild.build({
    plugins: [transformExtPlugin({ outExtension: {'.ts': '.js'}})],
    allowOverwrite: true,
    // bundle: true,
    entryPoints: [...srcFiles, ...testFiles],
    outdir: `${testDir}/dist`,
    format: 'cjs'
  })
})()