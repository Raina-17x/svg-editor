import { test } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { DefaultHost } from '../src/host/DefaultHost.js';
import { Group } from '../src/domain/Group.js';
import { Fixture } from './Fixture.js';
import { Panel } from './plugins/Panel.js';
import { PanelProvider } from './plugins/PanelProvider.js';
import { AccentHandler } from './plugins/AccentHandler.js';
import { SuffixDecorator } from './plugins/SuffixDecorator.js';
import { ProbeCommand } from './plugins/ProbeCommand.js';
import { BrokenGroup } from './plugins/BrokenGroup.js';

test('empty kernel starts, default assembly restores all builtins, optional commands register dynamically', () => {
  const empty = new DefaultHost(false);
  assert.deepEqual(empty.cli.run('init'), ['error: unknown command: init']);
  empty.api.init(100, 100);
  assert.deepEqual(empty.api.tree(), ['svg (100x100)']);
  assert.throws(() => empty.factory.create('rect', 'r', []), /unknown shape type/);
  const host = new DefaultHost();
  assert.equal(host.extensions.shapeProviders().length, 6);
  assert.deepEqual(host.extensions.commandPlugins().map(command => command.name), [
    'init', 'read', 'save', 'canvas', 'create', 'delete', 'move', 'scale', 'set', 'group',
    'ungroup', 'addto', 'front', 'back', 'undo', 'redo', 'tree', 'show', 'help'
  ]);
  assert.deepEqual(host.cli.run('probe'), ['error: unknown command: probe']);
  host.extensions.registerCommand(new ProbeCommand());
  assert.deepEqual(host.cli.run('probe "two words" plain'), ['two words:true', 'plain:false']);
  assert.ok(host.cli.run('help').includes('probe <value>'));
  host.cli.run('init'); host.cli.run('create rect r 1 2 3 4'); host.cli.run('move r 5 0'); host.cli.run('undo');
  host.cli.run('probe');
  assert.equal(host.api.document.width, 800);
  assert.deepEqual(host.cli.run('redo'), ['rect#r moved to (6,2)']);
  assert.throws(() => host.extensions.registerCommand(new ProbeCommand()), /duplicate registration: commands\/probe/);
});

test('shape registration, subtype snapshots, generic containers, serialization and missing-plugin fallback', t => {
  const f = new Fixture(); t.after(() => f.close());
  f.ok('init');
  f.error('create panel p', 'unknown shape type: panel (is the plugin loaded?)');
  f.host.extensions.registerShape(new PanelProvider());
  assert.ok(f.run('help').includes('create panel <id> [in <gid>]'));
  f.ok('create panel p'); f.ok('create circle c 1 2 3 in p');
  assert.ok(f.host.api.document.require('p') instanceof Panel);
  f.ok('move p 5 6'); f.ok('undo'); f.ok('redo');
  assert.equal(f.session.document.require('p-rect').get('x'), '5');
  const xml = f.snapshot();
  assert.match(xml, /data-kind="panel"/);
  assert.ok(f.codec.decode(xml).document.require('p') instanceof Panel);
  const fallback = new DefaultHost().codec.decode(xml).document;
  assert.ok(fallback.require('p') instanceof Group);
  assert.equal(fallback.require('p').children.length, 3);
  const before = f.snapshot();
  for (const command of ['delete p-rect', 'addto p p-text', 'group stolen p-text', 'ungroup p']) {
    assert.match(f.run(command)[0], /^error:/); assert.equal(f.snapshot(), before);
  }
  f.ok('delete p'); f.ok('undo');
  assert.ok(f.session.document.require('p') instanceof Panel);
  const bad = f.file('bad.svg');
  writeFileSync(bad, '<svg><g id="bad" data-kind="panel"/></svg>');
  assert.match(f.run(`read "${bad}"`)[0], /invalid panel/);
  assert.equal(f.snapshot(), before);
  assert.throws(() => f.codec.decode('<svg><g id="p" data-kind="panel"><rect id="dup"/><rect id="dup"/></g></svg>'), /id already exists/);
  f.ok('init'); f.ok('create rect q-rect 0 0 1 1');
  const collision = f.snapshot();
  f.error('create panel q', 'id already exists: q-rect');
  assert.equal(f.snapshot(), collision);
});

test('attribute fallback, one multi-part undo unit, conflicts and partial failure preserve history and events', t => {
  const f = new Fixture(); t.after(() => f.close());
  const label = new SuffixDecorator('events', '');
  f.host.extensions.registerShape(new PanelProvider());
  f.host.extensions.registerDecorator(label);
  f.host.extensions.registerAttribute(new AccentHandler());
  f.ok('init'); f.ok('create panel p'); f.ok('create rect r 1 2 3 4');
  f.ok('set r fill red'); f.error('set r label title', 'unknown attribute: label');
  const before = f.snapshot();
  f.ok('set p accent blue');
  assert.equal(f.session.document.require('p-rect').get('fill'), 'blue');
  assert.equal(f.session.document.require('p-text').content, 'blue');
  f.ok('undo'); assert.equal(f.snapshot(), before);
  f.ok('redo'); assert.equal(f.session.document.require('p-text').content, 'blue');
  f.ok('move p 1 0'); f.ok('undo');
  const rollback = f.snapshot(); const eventCount = label.reasons.length;
  f.error('set p accent fail', 'injected attribute failure');
  assert.equal(f.snapshot(), rollback); assert.equal(label.reasons.length, eventCount);
  f.ok('redo'); assert.equal(f.session.document.require('p-rect').get('x'), '1');
  f.host.extensions.registerAttribute(new AccentHandler('conflicting-accent'));
  const conflict = f.snapshot();
  f.error('set p accent green', 'attribute handler conflict: p/accent');
  assert.equal(f.snapshot(), conflict);
});

test('labels compose in registration order, notify on success only, and isolate faults and snapshots', t => {
  const f = new Fixture(); t.after(() => f.close());
  const first = new SuffixDecorator('first', '(a)');
  const broken = new SuffixDecorator('broken', '(bad)', true);
  const last = new SuffixDecorator('last', '(b)');
  [first, broken, last].forEach(label => f.host.extensions.registerDecorator(label));
  f.ok('init');
  assert.deepEqual(f.run('tree'), ['svg (800x600) (a) (b)', 'error: tree decorator failed: broken (injected label failure)']);
  f.ok('create rect r 1 2 3 4'); f.ok('move r 1 0'); f.ok('undo'); f.ok('redo');
  const count = first.reasons.length;
  f.error('move missing 1 0', 'no such shape: missing');
  assert.equal(first.reasons.length, count);
  f.ok(`save "${f.file('saved.svg')}"`); f.ok('canvas 100 200');
  assert.deepEqual(first.reasons, ['init', 'edit', 'edit', 'undo', 'redo', 'save', 'resize']);
  assert.deepEqual(first.reasons, last.reasons);
  assert.match(f.run('tree r')[0], /\(a\) \(b\)$/);
  assert.equal(f.session.document.width, 100);
});

test('bad clones, retained edit references and failing undo feedback cannot corrupt a session', () => {
  const host = new DefaultHost();
  host.api.init(800, 600); host.cli.run('create rect r 1 2 3 4'); host.cli.run('move r 5 0'); host.api.undo();
  assert.throws(() => host.api.edit({
    apply: context => { context.require('r').move(1, 0); return 'changed'; },
    undoMessage: () => { throw new Error('bad undo feedback'); }
  }), /bad undo feedback/);
  assert.equal(host.api.document.require('r').get('x'), '1');
  assert.deepEqual(host.api.redo(), ['rect#r moved to (6,2)']);
  assert.throws(() => host.api.edit({
    apply: context => { context.document.add(new BrokenGroup('broken')); return 'added'; }, undoMessage: () => 'removed'
  }), /clone lost shape type/);
  assert.equal(host.api.document.has('broken'), false);
  let retained: import('../src/domain/Shape.js').Shape | undefined;
  host.api.edit({ apply: context => { retained = context.require('r'); retained.move(1, 0); return 'moved'; }, undoMessage: () => 'back' });
  retained!.move(100, 0);
  assert.equal(host.api.document.require('r').get('x'), '7');
  host.api.undo(); assert.equal(host.api.document.require('r').get('x'), '6');
});
