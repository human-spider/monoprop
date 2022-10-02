import esbuild from 'esbuild';
import packageJson from './package.json' assert {type: 'json'};

const config = {
    allowOverwrite: true,
    bundle: true,
    external: Object.keys(packageJson.dependencies),
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
    outfile: './dist/index.esm.js',
    format: 'esm',
})
    .catch(() => process.exit(1));

    // build for node
esbuild.build({
    ...config,
    entryPoints: ['./src/index.ts'],
    outfile: './dist/index.common.js',
    format: 'esm',
})
    .catch(() => process.exit(1));