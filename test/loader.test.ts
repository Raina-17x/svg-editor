import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { DefaultHost } from '../src/host/DefaultHost.js';
import { PluginConfigLoader } from '../src/host/PluginConfigLoader.js';
import { PluginContext } from '../src/application/extensions/index.js';
import { PanelProvider } from './plugins/PanelProvider.js';
import { AccentHandler } from './plugins/AccentHandler.js';
import { SuffixDecorator } from './plugins/SuffixDecorator.js';
import { ProbeCommand } from './plugins/ProbeCommand.js';
import { LoaderFixture } from './LoaderFixture.js';

test('one install transaction registers all four categories and seals retained contexts', () => {
  const host = new DefaultHost();
  let retained: PluginContext | undefined;
  const plugin = new class {
    activate(ctx: PluginContext): void {
      retained = ctx; ctx.registerShape(new PanelProvider()); ctx.registerCommand(new ProbeCommand());
      ctx.registerAttribute(new AccentHandler()); ctx.registerDecorator(new SuffixDecorator('suffix', '(test)'));
    }
  }();
  const manifest = { name: 'all-four', contributes: {
    attributes: ['panel-accent'], decorators: ['suffix'], commands: ['probe'], shapes: ['panel']
  } };
  assert.deepEqual(host.startupErrors, []);
  assert.deepEqual(host.installer.install(manifest, plugin), []);
  assert.equal(host.extensions.shapeProviders().length, 7);
  assert.equal(host.extensions.commandPlugins().length, 20);
  assert.equal(host.extensions.attributeHandlers().length, 1);
  assert.equal(host.extensions.treeDecorators().length, 1);
  assert.throws(() => retained!.registerCommand(new ProbeCommand()), /context is closed/);
  assert.deepEqual(host.installer.install({ name: 'empty' }, { activate() {} }), []);
});

test('mismatch and throwing activation roll back every category and preserve successful plugins', () => {
  for (const mode of ['mismatch', 'throw']) {
    const host = new DefaultHost();
    let context: PluginContext | undefined;
    const plugin = { activate(ctx: PluginContext) {
      context = ctx; ctx.registerShape(new PanelProvider()); ctx.registerCommand(new ProbeCommand());
      ctx.registerAttribute(new AccentHandler()); ctx.registerDecorator(new SuffixDecorator('suffix', '(x)'));
      if (mode === 'throw') throw new Error('after registrations');
    } };
    const result = host.installer.install({ name: mode }, plugin);
    assert.match(result[0], mode === 'throw' ? /^error: plugin failed to activate: throw \(after registrations\)$/ : /^error: plugin manifest mismatch: mismatch \(declared: .*registered: /);
    assert.equal(host.extensions.shapeProviders().length, 6);
    assert.equal(host.extensions.commandPlugins().length, 19);
    assert.equal(host.extensions.attributeHandlers().length, 0);
    assert.equal(host.extensions.treeDecorators().length, 0);
    assert.throws(() => context!.registerCommand(new ProbeCommand()), /context is closed/);
    assert.deepEqual(host.cli.run('probe'), ['error: unknown command: probe']);
    assert.deepEqual(host.cli.run('init'), ['canvas 800x600 created']);
    assert.deepEqual(host.installer.install({ name: 'later', contributes: { commands: ['probe'] } }, {
      activate(ctx: PluginContext) { ctx.registerCommand(new ProbeCommand()); }
    }), []);
  }
});

test('caught duplicate registrations still poison the transaction and roll back earlier entries', () => {
  const host = new DefaultHost();
  const result = host.installer.install({ name: 'duplicate', contributes: { commands: ['probe'] } }, {
    activate(ctx: PluginContext) {
      ctx.registerCommand(new ProbeCommand());
      try { ctx.registerCommand(new ProbeCommand()); } catch { /* cannot hide the failed registration */ }
    }
  });
  assert.deepEqual(result, ['error: duplicate registration: commands/probe']);
  assert.equal(host.extensions.commandPlugins().length, 19);
  const existing = new ProbeCommand();
  host.extensions.registerCommand(existing);
  assert.deepEqual(host.installer.install({ name: 'collision' }, {
    activate(ctx: PluginContext) { ctx.registerAttribute(new AccentHandler()); ctx.registerCommand(new ProbeCommand()); }
  }), ['error: duplicate registration: commands/probe']);
  assert.equal(host.extensions.attributeHandlers().length, 0);
  assert.equal(host.extensions.commandPlugins().at(-1), existing);
});

test('manifest validation rejects malformed declarations before activation and async activation never commits', async () => {
  const host = new DefaultHost(); let calls = 0;
  for (const contributes of [{ commands: null }, { commands: ['x', 'x'] }, { unknown: [] }, []]) {
    assert.match(host.installer.install({ name: 'invalid', contributes }, { activate() { calls++; } })[0], /^error: plugin failed to activate: invalid/);
  }
  assert.equal(calls, 0);
  assert.match(host.installer.install({ name: 'bad-default' }, {})[0], /default export must be/);
  assert.match(host.installer.install({ name: 'async' }, { async activate(ctx: PluginContext) {
    ctx.registerCommand(new ProbeCommand()); await Promise.resolve(); ctx.registerAttribute(new AccentHandler());
  } })[0], /activate must be synchronous/);
  await new Promise(done => setImmediate(done));
  assert.equal(host.extensions.commandPlugins().length, 19);
  assert.equal(host.extensions.attributeHandlers().length, 0);
});

test('config handles four required failure paths, dependency evaluation failure and continues in array order', async t => {
  const f = new LoaderFixture(); t.after(() => f.close());
  f.plugin('no-default', 'no-default', {}, 'exports.named = {};');
  f.plugin('mismatch', 'mismatch', {}, LoaderFixture.commandSource('ghost'));
  f.plugin('throws', 'throws', { commands: ['ghost'] }, LoaderFixture.commandSource('ghost').replace("ctx.registerCommand(new EchoCommand(options.prefix ?? ''));", "ctx.registerCommand(new EchoCommand('')); throw new Error('boom');"));
  f.plugin('dependency', 'dependency', {}, "require('./absent-dependency.cjs');");
  f.plugin('good', 'good', { commands: ['echo'] }, LoaderFixture.commandSource());
  const host = new DefaultHost();
  const config = f.config(['./missing', './no-default', './mismatch', './throws', './dependency', './good'].map(module => ({ module })));
  const output = await new PluginConfigLoader(host.installer).load(config);
  assert.equal(output.length, 5);
  assert.equal(output[0], 'error: plugin not found: ./missing');
  assert.equal(output[1], 'error: plugin has no default export: ./no-default');
  assert.match(output[2], /^error: plugin manifest mismatch: mismatch/);
  assert.equal(output[3], 'error: plugin failed to activate: throws (boom)');
  assert.match(output[4], /^error: plugin failed to activate: dependency \(Cannot find module/);
  assert.deepEqual(host.cli.run('ghost'), ['error: unknown command: ghost']);
  assert.deepEqual(host.cli.run('echo hello'), ['hello']);
  assert.deepEqual(host.cli.run('init'), ['canvas 800x600 created']);
});

test('invalid config is prevalidated as a whole; no partial activation, disabled entries are skipped', async t => {
  const f = new LoaderFixture(); t.after(() => f.close());
  f.plugin('good', 'good', { commands: ['echo'] }, LoaderFixture.commandSource());
  const host = new DefaultHost(); const loader = new PluginConfigLoader(host.installer);
  for (const config of [null, [], {}, { plugins: {} }, { plugins: [{ module: './good' }, { module: 1 }] },
    { plugins: [{ module: './good', options: [] }] }, { plugins: [{ module: './good', enabled: 'yes' }] }]) {
    assert.deepEqual(await loader.load(f.write('invalid.json', JSON.stringify(config))), ['error: invalid plugin config']);
    assert.deepEqual(host.cli.run('echo'), ['error: unknown command: echo']);
  }
  assert.deepEqual(await loader.load(f.write('invalid.json', '{')), ['error: invalid plugin config']);
  assert.deepEqual(await loader.load(resolve(f.root, 'missing.json')), ['error: invalid plugin config']);
  assert.deepEqual(await loader.load(f.config([{ module: './absent', enabled: false }, { module: './good' }], 'valid.json')), []);
  assert.deepEqual(host.cli.run('echo yes'), ['yes']);
});

test('paths are based on config location, package names use Node resolution, options pass unchanged', async t => {
  const f = new LoaderFixture(); t.after(() => f.close());
  f.plugin('local', 'local', { commands: ['local'] }, LoaderFixture.commandSource('local'));
  f.plugin('node_modules/@svgframe/example', '@svgframe/example', { commands: ['package'] }, LoaderFixture.commandSource('package'));
  const config = f.config([
    { module: '../local', options: { prefix: 'L:' } },
    { module: '@svgframe/example', options: { prefix: 'P:' } }
  ], 'settings/config.json');
  const host = new DefaultHost();
  assert.deepEqual(await new PluginConfigLoader(host.installer).load(config), []);
  assert.deepEqual(host.cli.run('local "two words"'), ['L:two words']);
  assert.deepEqual(host.cli.run('package text'), ['P:text']);
  assert.deepEqual(host.extensions.commandPlugins().slice(-2).map(command => command.name), ['local', 'package']);
});

test('ESM default instances and top-level await modules can be loaded', async t => {
  const f = new LoaderFixture(); t.after(() => f.close());
  const source = LoaderFixture.commandSource('esm').replace('exports.default =', 'export default');
  f.plugin('esm', 'esm', { commands: ['esm'] }, `await Promise.resolve();\n${source}`, 'mjs');
  const host = new DefaultHost();
  assert.deepEqual(await new PluginConfigLoader(host.installer).load(f.config([{ module: './esm' }])), []);
  assert.deepEqual(host.cli.run('esm ok'), ['ok']);
});

test('compiled TypeScript default export uses its copied package manifest and the same install path', async t => {
  const f = new LoaderFixture(); t.after(() => f.close());
  const host = new DefaultHost(false);
  assert.deepEqual(await new PluginConfigLoader(host.installer).load(f.config([
    { module: resolve('dist/src/plugins/builtin') }
  ])), []);
  assert.equal(host.extensions.commandPlugins().length, 19);
  assert.deepEqual(host.cli.run('init'), ['canvas 800x600 created']);
  assert.deepEqual(host.cli.run('create rect r 1 2 3 4'), ['rect#r created']);
});

test('code and config assembly execute the same plugin with identical options and byte-identical CLI stdout', async t => {
  const f = new LoaderFixture(); t.after(() => f.close());
  const pluginFile = f.plugin('echo', 'echo', { commands: ['echo'] }, LoaderFixture.commandSource());
  const options = { prefix: 'test:' }; const config = f.config([{ module: './echo', options }]);
  const a = new DefaultHost(); const b = new DefaultHost();
  const requireModule = createRequire(__filename);
  assert.deepEqual(a.installer.install(requireModule(resolve(f.root, 'echo/package.json')), requireModule(pluginFile).default, options), []);
  assert.deepEqual(await new PluginConfigLoader(b.installer).load(config), []);
  const commands = ['help', 'echo "hello world"', 'init', 'create rect r 1 2 3 4', 'set r fill red', 'tree', 'undo', 'redo'];
  assert.deepEqual(Buffer.from(commands.flatMap(line => a.cli.run(line)).join('\n')), Buffer.from(commands.flatMap(line => b.cli.run(line)).join('\n')));
  const hostFile = resolve('dist/src/host/DefaultHost.js'); const replFile = resolve('dist/src/cli/Repl.js');
  const bootstrap = f.write('code.cjs', `const {DefaultHost}=require(${JSON.stringify(hostFile)}); const {Repl}=require(${JSON.stringify(replFile)});
    const host=new DefaultHost(); const result=host.installer.install(require(${JSON.stringify(resolve(f.root, 'echo/package.json'))}),require(${JSON.stringify(pluginFile)}).default,${JSON.stringify(options)});
    result.forEach(line=>console.log(line)); new Repl(host.cli).start();`);
  const input = commands.join('\n') + '\n';
  const code = spawnSync(process.execPath, [bootstrap], { cwd: f.root, input });
  const configured = spawnSync(process.execPath, [resolve('dist/src/main.js'), '--config', config], { cwd: f.root, input });
  assert.equal(code.status, 0, code.stderr.toString()); assert.equal(configured.status, 0, configured.stderr.toString());
  assert.deepEqual(code.stdout, configured.stdout);
});

test('real CLI prints loader errors and keeps processing commands with builtin capabilities', t => {
  const f = new LoaderFixture(); t.after(() => f.close());
  const config = f.config([{ module: './missing' }]);
  const result = spawnSync(process.execPath, [resolve('dist/src/main.js'), '--config', config], {
    cwd: f.root, input: 'init\ncreate rect r 1 2 3 4\ntree\n'
  });
  assert.equal(result.status, 0, result.stderr.toString());
  assert.match(result.stdout.toString(), /error: plugin not found: .\/missing\nsvg-editor/);
  assert.match(result.stdout.toString(), /rect#r created/);
});
