const esbuild = require('esbuild');
const { transformExtPlugin } = require("@gjsify/esbuild-plugin-transform-ext");
const { dependencies } = require('./package.json')

const config = {
  allowOverwrite: true,
  bundle: true,
  target: 'es2021',
  // minify: true,
  external: Object.keys(dependencies || {}),
}

// build for iife
esbuild.build({
  plugins: [transformExtPlugin({ outExtension: {'.ts': '.js'}})],
  ...config,
  entryPoints: ['./src/index.ts'],
  outfile: './dist/index.js',
})
  .catch(() => process.exit(1));

    
// build for esm
esbuild.build({
  plugins: [transformExtPlugin({ outExtension: {'.ts': '.js'}})],
  ...config,
  entryPoints: ['./src/index.ts'],
  outfile: './dist/index.mjs',
  format: 'esm',
})
  .catch(() => process.exit(1));

    // build for node
esbuild.build({
  plugins: [transformExtPlugin({ outExtension: {'.ts': '.js'}})],
  ...config,
  entryPoints: ['./src/index.ts'],
  outfile: './dist/index.cjs',
  format: 'cjs',
})
  .catch(() => process.exit(1));