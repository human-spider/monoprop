const esbuild = require('esbuild');
const fs = require('fs')

const testDir = './test'
const testFiles = fs.readdirSync(testDir)
    .filter(f => f.endsWith('.spec.ts'))
    .map(f => `${testDir}/${f}`)

const srcFiles = ['./src/index.ts']

// esbuild.buildSync({
//     allowOverwrite: true,
//     bundle: true,
//     entryPoints: ,
//     outfile: `${testDir}/dist/index.js`,
//     format: 'esm'
// })

esbuild.buildSync({
    allowOverwrite: true,
    // bundle: true,
    entryPoints: [...srcFiles, ...testFiles],
    outdir: `${testDir}/dist`,
    format: 'cjs'
})