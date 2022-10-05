const esbuild = require('esbuild');
const { dependencies } = require('./package.json')

const config = {
    allowOverwrite: true,
    bundle: true,
    target: 'es2021',
    external: Object.keys(dependencies),
}

// build for iife
esbuild.build({
    ...config,
    entryPoints: ['./src/index.ts'],
    outfile: './dist/index.js',
})
    .catch(() => process.exit(1));

    
// build for esm
esbuild.build({
    ...config,
    entryPoints: ['./src/index.ts'],
    outfile: './dist/index.mjs',
    format: 'esm',
})
    .catch(() => process.exit(1));

    // build for node
esbuild.build({
    ...config,
    entryPoints: ['./src/index.ts'],
    outfile: './dist/index.cjs',
    format: 'cjs',
})
    .catch(() => process.exit(1));