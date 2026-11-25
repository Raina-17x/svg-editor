import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { DefaultHost } from '../src/host/DefaultHost.js';
import { PluginConfigLoader } from '../src/host/PluginConfigLoader.js';
import { CommandProcessor } from '../src/cli/CommandProcessor.js';
import { StatsPlugin } from '../src/plugins/command-stats/StatsPlugin.js';
import statsManifest from '../src/plugins/command-stats/package.json';
import { DirPlugin } from '../src/plugins/command-dir/DirPlugin.js';
import dirManifest from '../src/plugins/command-dir/package.json';
import { Fixture } from './Fixture.js';
import { LoaderFixture } from './LoaderFixture.js';
import { SuffixDecorator } from './plugins/SuffixDecorator.js';

test('stats and dir can each be enabled/disabled in config with matching dynamic help', async t => {
  const f = new LoaderFixture(); t.after(() => f.close());
  for (const [stats, dir] of [[false, false], [true, false], [false, true], [true, true]]) {
    const host = new DefaultHost();
    const config = f.config([
      { module: resolve('dist/src/plugins/command-stats'), enabled: stats },
      { module: resolve('dist/src/plugins/command-dir'), enabled: dir }
    ]);
    assert.deepEqual(await new PluginConfigLoader(host.installer).load(config), []);
    const help = host.cli.run('help');
    assert.equal(help.some(line => line.startsWith('stats ')), stats);
    assert.equal(help.some(line => line.startsWith('dir ')), dir);
    assert.deepEqual(host.cli.run('stats'), [stats ? "error: no document. use 'init' or 'read' first" : 'error: unknown command: stats']);
    if (!dir) assert.deepEqual(host.cli.run('dir'), ['error: unknown command: dir']);
    else assert.ok(host.cli.run('dir').every(line => !line.startsWith('error:')));
  }
});

test('successful and failed read-only commands preserve SVG, dirty events, path, cwd, both histories and IO barriers', t => {
  const f = new Fixture(); t.after(() => f.close());
  assert.deepEqual(f.host.installer.install(statsManifest, new StatsPlugin()), []);
  assert.deepEqual(f.host.installer.install(dirManifest, new DirPlugin()), []);
  const observer = new SuffixDecorator('observer', ''); f.host.extensions.registerDecorator(observer);
  let fail = false; const cwd = process.cwd();
  const directory = { cwd: '/fixed', list() { if (fail) throw new Error('injected'); return []; } };
  const cli = new CommandProcessor(f.session, f.host.commands, f.factory, directory, () => f.factory.help());
  assert.deepEqual(cli.run('dir'), ['(empty directory)']);
  cli.run('init'); cli.run('dir'); cli.run('stats');
  assert.deepEqual(cli.run('undo'), ['error: undo not allowed after io command']);
  cli.run('create rect r 1 2 3 4'); cli.run('move r 5 0'); cli.run('undo');
  let before = f.snapshot(); let events = observer.reasons.length;
  assert.deepEqual(cli.run('stats'), ['rect: 1  (total 1, containers 0)']);
  assert.deepEqual(cli.run('dir'), ['(empty directory)']);
  assert.equal(f.snapshot(), before); assert.equal(observer.reasons.length, events);
  assert.deepEqual(cli.run('redo'), ['rect#r moved to (6,2)']);
  assert.deepEqual(cli.run('undo'), ['rect#r moved back to (1,2)']);
  before = f.snapshot(); events = observer.reasons.length; fail = true;
  assert.deepEqual(cli.run('dir'), ['error: cannot read directory: /fixed']);
  assert.match(cli.run('dir extra')[0], /^error: invalid arguments/);
  assert.equal(f.snapshot(), before); assert.equal(observer.reasons.length, events);
  assert.deepEqual(cli.run('redo'), ['rect#r moved to (6,2)']);
  const saved = f.file('saved.svg'); cli.run(`save "${saved}"`);
  cli.run('dir'); cli.run('stats');
  assert.deepEqual(cli.run('undo'), ['error: undo not allowed after io command']);
  assert.match(cli.run('save')[0], /^saved to /);
  cli.run(`read "${saved}"`); cli.run('dir');
  assert.equal(process.cwd(), cwd); assert.equal(directory.cwd, '/fixed');
  assert.equal(f.session.document.require('r').get('x'), '6');
});

test('both real assembly entrypoints produce identical stdout and SVG using one unchanged fixed cwd', t => {
  const f = new LoaderFixture(); t.after(() => f.close());
  f.write('work/docs/inside.txt', 'nested'); f.write('work/plugins/inside.txt', 'nested');
  f.write('work/.hidden', 'hidden'); f.write('work/demo.svg', '<svg/>'); f.write('work/package.json', '{}');
  f.write('input.svg', readFileSync('doc/transcript/fixtures/commands-input.svg', 'utf8'));
  const input = readFileSync('doc/transcript/cli-commands.txt');
  const work = resolve(f.root, 'work'); const initial = readdirSync(work).sort();
  const entry = resolve('dist/src/main.js');
  // Pin this earlier session to its original stats/dir collection as new plugins arrive.
  const bootstrap = f.write('commands-code.cjs', `const {DefaultHost}=require(${JSON.stringify(resolve('dist/src/host/DefaultHost.js'))});
    const {Repl}=require(${JSON.stringify(resolve('dist/src/cli/Repl.js'))}); const host=new DefaultHost();
    for(const name of ['command-stats','command-dir']) { const pkg=${JSON.stringify(resolve('dist/src/plugins'))}+'/'+name;
      const manifest=require(pkg+'/package.json'); host.installer.install(manifest,require(pkg).default); }
    new Repl(host.cli).start();`);
  const config = f.config(['command-stats', 'command-dir'].map(name => ({ module: resolve('dist/src/plugins', name) })));
  const code = spawnSync(process.execPath, [bootstrap], { cwd: work, input });
  assert.equal(code.status, 0, code.stderr.toString());
  const svg = readFileSync(resolve(f.root, 'output.svg'));
  assert.deepEqual(readdirSync(work).sort(), initial);
  const configured = spawnSync(process.execPath, [entry, '--config', config], { cwd: work, input });
  assert.equal(configured.status, 0, configured.stderr.toString());
  assert.deepEqual(code.stdout, configured.stdout);
  assert.deepEqual(code.stdout, readFileSync('doc/transcript/cli-commands.expected.txt'));
  assert.deepEqual(readFileSync(resolve(f.root, 'output.svg')), svg);
  assert.deepEqual(svg, readFileSync('doc/transcript/fixtures/commands-output.svg'));
  assert.deepEqual(readdirSync(work).sort(), initial);
  const output = code.stdout.toString();
  const listing = '[DIR]  docs\n[DIR]  plugins\n[FILE]  .hidden\n[FILE]  demo.svg\n[FILE]  package.json';
  assert.equal(output.split(listing).length - 1, 4);
  assert.match(output, /rect: 1  circle: 1  text: 1  \(total 3, containers 1\)/);
  assert.match(output, /circle: 1  \(total 1, containers 0\)/);
  assert.match(output, /error: undo not allowed after io command/);
  assert.equal(code.stderr.length, 0); assert.equal(configured.stderr.length, 0);
});
