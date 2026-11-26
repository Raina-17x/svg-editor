const { test } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
let stat = async () => ({ type: 1 });
class EventEmitter {
  constructor() { this.listeners = []; this.event = listener => { this.listeners.push(listener); }; }
  fire(value) { this.listeners.forEach(listener => listener(value)); }
  dispose() { this.listeners = []; }
}
class FileDecoration {
  constructor(badge, tooltip) { Object.assign(this, { badge, tooltip }); }
}
const originalLoad = Module._load;
let SvgDecorationProvider;
try {
  Module._load = function(name, ...args) {
    return name === 'vscode' ? { EventEmitter, FileDecoration, FileType: { File: 1 }, workspace: { fs: { stat: uri => stat(uri) } } }
      : originalLoad.call(this, name, ...args);
  };
  ({ SvgDecorationProvider } = require('../dist/SvgDecorationProvider.js'));
} finally { Module._load = originalLoad; }

test('badge applies only to real SVG files, preserves uri, and does not propagate', async () => {
  const provider = new SvgDecorationProvider(); const token = { isCancellationRequested: false };
  const uri = { path: '/fixture/example.svg' }; const before = JSON.stringify(uri);
  stat = async () => ({ type: 1 });
  assert.deepEqual(await provider.provideFileDecoration(uri, token), Object.assign(new FileDecoration('[]', 'SVG file'), { propagate: false }));
  assert.equal(JSON.stringify(uri), before);
  assert.equal((await provider.provideFileDecoration({ path: '/fixture/UPPER.SVG' }, token)).badge, '[]');
  stat = async () => ({ type: 2 });
  assert.equal(await provider.provideFileDecoration({ path: '/fixture/folder.svg' }, token), undefined);
  stat = async () => { throw new Error('non-SVG files must not be statted'); };
  assert.equal(await provider.provideFileDecoration({ path: '/fixture/plain.txt' }, token), undefined);
});

test('deleted/unreadable paths and cancellation are safe; refresh and disposal remain local', async () => {
  const provider = new SvgDecorationProvider(); const uri = { path: '/example.svg' };
  stat = async () => { throw new Error('missing'); };
  assert.equal(await provider.provideFileDecoration(uri, { isCancellationRequested: false }), undefined);
  assert.equal(await provider.provideFileDecoration(uri, { isCancellationRequested: true }), undefined);
  const token = { isCancellationRequested: false }; stat = async () => { token.isCancellationRequested = true; return { type: 1 }; };
  assert.equal(await provider.provideFileDecoration(uri, token), undefined);
  const events = []; provider.onDidChangeFileDecorations(value => events.push(value));
  provider.refresh(uri); provider.refresh({ path: '/plain.txt' }); assert.deepEqual(events, [uri]);
  provider.dispose(); provider.refresh(uri); assert.equal(events.length, 1);
});
