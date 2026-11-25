import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { Fixture } from './Fixture.js';
import { LoaderFixture } from './LoaderFixture.js';
import { Box } from '../src/plugins/shape-box/Box.js';
import { BoxProvider } from '../src/plugins/shape-box/BoxProvider.js';
import { BoxPlugin } from '../src/plugins/shape-box/BoxPlugin.js';
import manifest from '../src/plugins/shape-box/package.json';
import { StatsPlugin } from '../src/plugins/command-stats/StatsPlugin.js';
import statsManifest from '../src/plugins/command-stats/package.json';
import { Group } from '../src/domain/Group.js';

test('box fill and label each have one undo unit; nested containers, movement, deletion and stats interoperate', t => {
  const f = new Fixture(); t.after(() => f.close());
  assert.deepEqual(f.host.installer.install(manifest, new BoxPlugin()), []);
  assert.deepEqual(f.host.installer.install(statsManifest, new StatsPlugin()), []);
  f.ok('init'); f.ok('create g flow'); f.ok('create box n 120 100 160 60 "开始" in flow');
  assert.equal(f.run('tree n')[0], 'g#n (box)');
  assert.deepEqual(f.ok('set n fill #f5a623'), ['box#n fill propagated to n-rect']);
  f.ok('undo'); assert.equal((f.session.document.require('n') as Box).fill, '#4a90d9');
  f.ok('redo'); assert.equal((f.session.document.require('n') as Box).fill, '#f5a623');
  f.ok('set n label "处理数据 v2"');
  assert.deepEqual(f.ok('undo'), ['box#n label restored: "开始"']);
  f.ok('redo'); assert.equal((f.session.document.require('n') as Box).title, '处理数据 v2');
  f.ok('create box nested 0 0 10 20 "nested" in n'); f.ok('move n 10 20');
  assert.equal(f.session.document.require('nested-rect').get('x'), '10');
  f.ok('undo'); f.ok('redo');
  assert.deepEqual(f.ok('stats'), ['rect: 2  text: 2  (total 4, containers 3)']);
  const before = f.snapshot(); f.ok('delete n'); f.ok('undo'); assert.equal(f.snapshot(), before);
  assert.ok(f.session.document.require('nested') instanceof Box);
});

test('id collisions and protected component operations fail atomically with redo preserved', t => {
  const f = new Fixture(); t.after(() => f.close()); f.host.installer.install(manifest, new BoxPlugin());
  f.ok('init'); f.ok('create g dest'); f.ok('create box n 0 0 10 10 "title"');
  f.ok('move n 1 0'); f.ok('undo');
  const before = f.snapshot();
  for (const line of ['delete n-rect', 'delete n-label', 'addto dest n-label', 'group stolen n-rect', 'ungroup n']) {
    assert.match(f.run(line)[0], /^error:/); assert.equal(f.snapshot(), before);
  }
  f.ok('redo'); assert.equal(f.session.document.require('n-rect').get('x'), '1');
  for (const id of ['q', 'q-rect', 'q-label']) {
    f.ok('init'); f.ok(`create rect ${id} 0 0 1 1`); const snapshot = f.snapshot();
    f.error('create box q 0 0 10 10 "x"', `id already exists: ${id}`); assert.equal(f.snapshot(), snapshot);
  }
  f.ok('init'); f.ok('create rect r 0 0 1 1'); f.error('set r label title', 'unknown attribute: label');
});

test('box read round-trip, missing-plugin fallback and malformed reads preserve the old document/history', t => {
  const f = new Fixture(); t.after(() => f.close()); f.host.installer.install(manifest, new BoxPlugin());
  f.ok('init'); f.ok('create box n 1 2 10 20 "A & 中文"'); f.ok('set n fill red');
  const xml = f.snapshot(); assert.equal(f.codec.encode(f.codec.decode(xml).document), xml);
  const fallback = new Fixture(); t.after(() => fallback.close());
  const downgraded = fallback.codec.decode(xml).document;
  assert.ok(downgraded.require('n') instanceof Group); assert.equal(downgraded.require('n').type, 'g');
  assert.equal(downgraded.require('n-label').content, 'A & 中文');
  f.ok('move n 5 0'); f.ok('undo'); const before = f.snapshot();
  const invalid = f.file('invalid.svg');
  for (const children of ['', '<text id="n-rect">bad</text><text id="n-label">x</text>', '<rect id="dup"/><rect id="dup"/>']) {
    writeFileSync(invalid, `<svg><g id="n" data-kind="box">${children}</g></svg>`);
    assert.match(f.run(`read "${invalid}"`)[0], /^error:/); assert.equal(f.snapshot(), before);
  }
  f.ok('redo'); assert.equal(f.session.document.require('n-rect').get('x'), '6');
});

test('injected box handler failure after two modifications preserves document and both history branches', t => {
  const f = new Fixture(); t.after(() => f.close());
  f.host.extensions.registerShape(new BoxProvider());
  f.host.extensions.registerAttribute(new class {
    readonly name = 'failing-box-handler';
    handles(shape: import('../src/domain/Shape.js').Shape, attribute: string): boolean { return shape instanceof Box && attribute === 'label'; }
    apply(context: import('../src/application/extensions/index.js').EditContext, id: string): never {
      const box = context.require(id) as Box; box.setFill('red'); box.setTitle('partially changed'); throw new Error('injected box failure');
    }
  }());
  f.ok('init'); f.ok('create box n 0 0 10 10 "old"'); f.ok('move n 5 0'); f.ok('undo');
  const before = f.snapshot(); f.error('set n label new', 'injected box failure'); assert.equal(f.snapshot(), before);
  f.ok('redo'); assert.equal(f.session.document.require('n-rect').get('x'), '5');
  f.ok('undo'); f.ok('undo'); assert.equal(f.session.document.has('n'), false);
});

test('official Phase 1 section 6.1 B runs byte-identically in code and config assembly', t => {
  const f = new LoaderFixture(); t.after(() => f.close());
  const entry = resolve('dist/src/main.js'); const input = readFileSync('doc/transcript/cli-1-box.txt');
  const code = spawnSync(process.execPath, [entry, '--code'], { cwd: f.root, input });
  assert.equal(code.status, 0, code.stderr.toString());
  const svg = readFileSync(resolve(f.root, 'flowchart-box.svg'));
  const configured = spawnSync(process.execPath, [entry, '--config', resolve('plugins.config.json')], { cwd: f.root, input });
  assert.equal(configured.status, 0, configured.stderr.toString()); assert.deepEqual(code.stdout, configured.stdout);
  assert.deepEqual(code.stdout, readFileSync('doc/transcript/cli-1-box.expected.txt'));
  assert.deepEqual(svg, readFileSync('doc/transcript/fixtures/flowchart-box.svg'));
  assert.deepEqual(readFileSync(resolve(f.root, 'flowchart-box.svg')), svg);
  assert.doesNotMatch(code.stdout.toString(), /error:/);
  assert.match(code.stdout.toString(), /g#n1 \(box\)/);
  assert.match(code.stdout.toString(), /box#n2 label restored: "处理数据"/);
});
