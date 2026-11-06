let worker;
let sequence = 0;
const pending = new Map();

function rejectAll(error) {
  for (const { reject } of pending.values()) reject(error);
  pending.clear();
  worker?.terminate();
  worker = undefined;
}

function getWorker() {
  if (typeof Worker === 'undefined') throw new Error('This browser does not support the TypeScript preview compiler.');
  if (!worker) {
    worker = new Worker(new URL('./typescript-worker.js', import.meta.url), {
      type: 'module',
      name: 'synth-typescript-compiler',
    });
    worker.onmessage = ({ data }) => {
      const task = pending.get(data?.id);
      if (!task) return;
      pending.delete(data.id);
      if (data.ok) task.resolve({ code: data.code });
      else task.reject(new Error(data.error || 'TypeScript compilation failed.'));
    };
    worker.onerror = (event) => {
      event.preventDefault?.();
      rejectAll(new Error(event.message || 'The TypeScript compiler could not start.'));
    };
    worker.onmessageerror = () => rejectAll(new Error('The TypeScript compiler returned an unreadable result.'));
  }
  return worker;
}

export function compileTypeScript(source, filename = 'script.ts') {
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    try {
      pending.set(id, { resolve, reject });
      getWorker().postMessage({ id, source: String(source || ''), filename: String(filename || 'script.ts') });
    } catch (error) {
      pending.delete(id);
      reject(error);
    }
  });
}
