const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const source = path.join(root, 'node_modules', 'esbuild-wasm', 'esbuild.wasm');
const target = path.join(root, 'public', 'esbuild.wasm');

if (!fs.existsSync(source)) {
  throw new Error('esbuild-wasm is missing. Install project dependencies before starting SYNTHCODE.');
}

fs.mkdirSync(path.dirname(target), { recursive: true });
fs.copyFileSync(source, target);
console.log('Prepared the local TypeScript compiler runtime.');
