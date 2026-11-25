import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, unlinkSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { Fixture } from './Fixture.js';
import { LoaderFixture } from './LoaderFixture.js';
import { TreeStarPlugin } from '../src/plugins/tree-star/TreeStarPlugin.js';
import starManifest from '../src/plugins/tree-star/package.json';
import { BoxPlugin } from '../src/plugins/shape-box/BoxPlugin.js';
import boxManifest from '../src/plugins/shape-box/package.json';

test('box and star coexist in either registration order and saving removes only the star', t => {
  for (const starFirst of [false, true]) {
    const f = new Fixture(); t.after(() => f.close());
    const plugins = [[starManifest, new TreeStarPlugin()], [boxManifest, new BoxPlugin()]] as const;
    for (const [manifest, plugin] of starFirst ? plugins : [...plugins].reverse()) assert.deepEqual(f.host.installer.install(manifest, plugin), []);
    f.ok('init'); assert.deepEqual(f.run('tree'), ['svg (800x600)']);
    f.ok('create g flow'); f.ok('create box n 0 0 10 10 "old" in flow');
    assert.equal(f.run('tree n')[0], starFirst ? 'g#n * (box)' : 'g#n (box) *');
    f.ok(`save "${f.file('saved.svg')}"`);
    assert.equal(f.run('tree n')[0], 'g#n (box)');
    assert.ok(f.run('tree').every(line => !line.endsWith('*')));
    f.ok('set n label new'); assert.ok(f.run('tree')[0].endsWith('*'));
    assert.match(f.run('tree flow')[0], /\*$/); assert.match(f.run('tree n-label')[0], /\*$/);
    f.ok('undo'); assert.equal(f.run('tree n')[0], 'g#n (box)');
    f.ok('redo'); assert.match(f.run('tree n')[0], starFirst ? /\* \(box\)$/ : /\(box\) \*$/);
  }
});

test('failed edits/read/save leave dirty baseline unchanged; undo recovers it; read/init reset it', t => {
  const f = new Fixture(); t.after(() => f.close()); f.host.installer.install(starManifest, new TreeStarPlugin());
  f.ok('init'); f.ok('create rect r 1 2 3 4'); const saved = f.file('saved.svg'); f.ok(`save "${saved}"`);
  f.ok('set r fill red'); const tree = f.run('tree');
  assert.match(f.run(`save "${f.file('missing/out.svg')}"`)[0], /^error: cannot write file/);
  assert.deepEqual(f.run('tree'), tree);
  assert.match(f.run(`read "${f.file('absent.svg')}"`)[0], /^error: cannot read file/);
  assert.deepEqual(f.run('tree'), tree);
  f.error('set r unknown invalid', 'unknown attribute: unknown'); assert.deepEqual(f.run('tree'), tree);
  f.ok('undo'); assert.ok(f.run('tree').every(line => !line.endsWith('*')));
  f.ok('redo'); assert.deepEqual(f.run('tree'), tree);
  f.ok(`read "${saved}"`); assert.ok(f.run('tree').every(line => !line.endsWith('*')));
  f.ok('canvas 100 200'); assert.equal(f.run('tree')[0], 'svg (100x200) *');
  f.ok('init'); assert.deepEqual(f.run('tree'), ['svg (800x600)']);
});

test('full code/config assembly produces identical saved-point label transcript and SVG', t => {
  const f = new LoaderFixture(); t.after(() => f.close());
  const entry = resolve('dist/src/main.js'); const input = readFileSync('doc/transcript/cli-labels.txt');
  const code = spawnSync(process.execPath, [entry, '--code'], { cwd: f.root, input });
  assert.equal(code.status, 0, code.stderr.toString());
  const svg = readFileSync(resolve(f.root, 'labels.svg')); unlinkSync(resolve(f.root, 'labels.svg'));
  const config = spawnSync(process.execPath, [entry, '--config', resolve('plugins.config.json')], { cwd: f.root, input });
  assert.equal(config.status, 0, config.stderr.toString()); assert.deepEqual(code.stdout, config.stdout);
  assert.deepEqual(code.stdout, readFileSync('doc/transcript/cli-labels.expected.txt'));
  assert.deepEqual(readFileSync(resolve(f.root, 'labels.svg')), svg);
  assert.deepEqual(svg, readFileSync('doc/transcript/fixtures/labels.svg'));
  assert.doesNotMatch(code.stdout.toString(), /error:/);
  assert.match(code.stdout.toString(), /g#n \(box\) \*/);
});
