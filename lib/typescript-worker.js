import * as esbuild from 'esbuild-wasm';
import { assertStandaloneTypeScript } from './typescript-source.js';

let initializePromise;

function initializeCompiler() {
  if (!initializePromise) {
    initializePromise = esbuild.initialize({
      wasmURL: new URL('/esbuild.wasm', self.location.origin),
      worker: false,
    }).catch((error) => {
      initializePromise = undefined;
      throw error;
    });
  }
  return initializePromise;
}

self.addEventListener('message', async ({ data }) => {
  const { id, source, filename } = data || {};
  try {
    await initializeCompiler();
    const result = await esbuild.transform(String(source || ''), {
      loader: 'ts',
      sourcefile: String(filename || 'script.ts'),
      target: 'es2020',
      format: 'iife',
      legalComments: 'none',
    });
    self.postMessage({ id, ok: true, code: assertStandaloneTypeScript(result.code) });
  } catch (error) {
    self.postMessage({
      id,
      ok: false,
      error: String(error?.message || 'TypeScript compilation failed').slice(0, 3000),
    });
  }
});
