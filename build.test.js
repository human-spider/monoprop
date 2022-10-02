import esbuild from 'esbuild';

// build for iife
esbuild.buildSync({
    allowOverwrite: true,
    bundle: true,
    entryPoints: ['./src/index.ts'],
    outfile: './test/dist/index.js',
    format: 'esm'
})