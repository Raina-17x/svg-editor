import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { Fixture } from './Fixture.js';

test('no document, help, comments, exact argument validation and recovery', t => {
  const f = new Fixture(); t.after(() => f.close());
  f.error('tree', "no document. use 'init' or 'read' first");
  f.error('undo', "no document. use 'init' or 'read' first");
  f.ok('help'); assert.deepEqual(f.run('  # comment'), []); assert.deepEqual(f.run(''), []);
  f.ok('init'); assert.equal(f.session.document.width, 800); assert.equal(f.session.document.height, 600);
  f.error('create box b 0 0 1 1 title', 'unknown shape type: box (is the plugin loaded?)');
  f.error('move missing 1 2', 'no such shape: missing');
  assert.match(f.run('move r 1')[0], /^error:/);
  f.error('nonsense', 'unknown command: nonsense');
  f.error('create text t 1 2 "broken', 'unterminated double quote');
  f.ok('init 320'); assert.equal(f.session.document.height, 600);
});

test('all six types, styles, geometry, text escaping and case-sensitive unique ids', t => {
  const f = new Fixture(); t.after(() => f.close()); f.ok('init');
  for (const command of [
    'create rect R 1.5 -2 10 20 #ffffff', 'create circle c 3 4 5 red',
    'create ellipse e 6 7 8 9', 'create line l 10 11 12 13 black',
    'create text t 14 15 "中文 & <SVG> \\"test\\""', 'create g g', 'create rect r 0 0 1 1',
  ]) f.ok(command);
  f.error('create circle R 0 0 1', 'id already exists: R');
  assert.equal(f.session.document.all().length, 7);
  assert.equal(f.session.document.require('e').get('fill'), undefined);
  f.ok('move R 2.5 3'); assert.equal(f.session.document.require('R').get('x'), '4');
  f.ok('scale R 2'); assert.equal(f.session.document.require('R').get('x'), '8'); assert.equal(f.session.document.require('R').get('width'), '20');
  f.ok('set t text "hello world"'); f.ok('set l stroke-width 2'); f.ok('set g fill blue');
  f.error('set c width 10', 'unknown attribute: width');
  f.error('set c toString 10', 'unknown attribute: toString');
  f.error('set c id new', 'unknown attribute: id');
  f.ok('set R height 0');
  const before = f.snapshot();
  for (const command of ['set c r -1', 'set l stroke-width -2', 'move R NaN 0', 'move R Infinity 0', 'create rect bad 0 0 -1 1']) {
    assert.match(f.run(command)[0], /^error:/); assert.equal(f.snapshot(), before);
  }
  f.error('scale g 0', 'scale factor must be positive'); f.error('scale R -1', 'scale factor must be positive');
});

test('create in, recursive move and scale, inherited styles, tree/show', t => {
  const f = new Fixture(); t.after(() => f.close()); f.ok('init');
  f.ok('create g scene'); f.ok('create g node in scene');
  f.ok('create rect r 10 20 30 40 in node'); f.ok('create text t 15 25 "in" in node');
  f.ok('create line l 1 2 3 4 in scene');
  f.ok('move scene 5 -10');
  assert.equal(f.session.document.require('r').get('x'), '15'); assert.equal(f.session.document.require('t').get('y'), '15');
  assert.equal(f.session.document.require('l').get('y2'), '-6');
  f.ok('scale scene 0.5'); assert.equal(f.session.document.require('r').get('width'), '15');
  assert.equal(f.session.document.require('t').get('x'), '10');
  f.ok('set scene fill red'); assert.equal(f.session.document.require('r').get('fill'), undefined);
  assert.match(f.ok('tree').join('\n'), /└── g#scene fill=red/);
  assert.match(f.ok('tree node').join('\n'), /^g#node\n├── rect#r x=/);
  assert.match(f.ok('show r').join('\n'), /^rect#r parent=g#node\n  x=7.5/);
  f.error('create circle bad 0 0 1 in missing', 'no such container: missing');
  f.error('create g bad in r', 'not a container: r');
});

test('group preserves document order across parents and is one undo unit', t => {
  const f = new Fixture(); t.after(() => f.close()); f.ok('init');
  f.ok('create g p'); f.ok('create rect a 1 2 3 4 in p'); f.ok('create circle b 1 2 3'); f.ok('create text c 0 0 "C"');
  const before = f.snapshot(); f.ok('group new c a b');
  assert.deepEqual(f.session.document.require('new').children.map(child => child.id), ['a', 'b', 'c']);
  const grouped = f.snapshot(); f.ok('undo'); assert.equal(f.snapshot(), before); f.ok('redo'); assert.equal(f.snapshot(), grouped);
  f.error('group bad a new', 'cannot group a container into its own descendant: new');
  assert.equal(f.snapshot(), grouped);
  f.error('group bad a a', 'duplicate group member');
});

test('ungroup replaces nested container in place, rejects top-level, restores on undo', t => {
  const f = new Fixture(); t.after(() => f.close()); f.ok('init');
  for (const command of ['create g p', 'create g first in p', 'create g nested in p', 'create g last in p',
    'create circle a 0 0 1 in nested', 'create rect b 0 0 1 1 in nested']) f.ok(command);
  f.error('ungroup p', 'cannot ungroup top-level container: p'); f.error('ungroup a', 'not a container: a');
  const before = f.snapshot(); f.ok('ungroup nested');
  assert.deepEqual(f.session.document.require('p').children.map(child => child.id), ['first', 'a', 'b', 'last']);
  assert.equal(f.session.document.has('nested'), false); f.ok('undo'); assert.equal(f.snapshot(), before);
});

test('addto rejects cycles atomically; front/back are sibling operations; delete restores subtree', t => {
  const f = new Fixture(); t.after(() => f.close()); f.ok('init');
  for (const command of ['create g p', 'create g q in p', 'create rect a 0 0 1 1 in q', 'create circle b 0 0 1 in q', 'create g other']) f.ok(command);
  const before = f.snapshot(); f.error('addto q p', 'cannot move a container into its own descendant: p');
  f.error('addto p p', 'cannot move a container into its own descendant: p'); assert.equal(f.snapshot(), before);
  f.ok('front a'); assert.deepEqual(f.session.document.require('q').children.map(child => child.id), ['b', 'a']);
  f.ok('back a'); assert.deepEqual(f.session.document.require('q').children.map(child => child.id), ['a', 'b']);
  f.ok('addto other a'); assert.equal(f.session.document.parentLabel(f.session.document.require('a')), 'g#other'); f.ok('undo');
  const restored = f.snapshot(); f.ok('delete p'); assert.equal(f.session.document.has('a'), false);
  f.ok('undo'); assert.equal(f.snapshot(), restored);
});

test('history branches, displays, failed edits and numeric overflow preserve atomicity', t => {
  const f = new Fixture(); t.after(() => f.close()); f.ok('init');
  f.ok('create g g'); f.ok('create rect r 0 0 1 1 in g'); f.ok('create circle c 1e308 0 1 in g');
  f.ok('move r 1 2'); f.ok('undo'); const before = f.snapshot();
  f.ok('tree'); f.ok('show r'); f.ok('help'); f.ok('canvas');
  f.error('scale g 10', 'invalid number: Infinity'); assert.equal(f.snapshot(), before);
  f.error('create g g', 'id already exists: g');
  f.ok('redo'); assert.equal(f.session.document.require('r').get('x'), '1');
  f.ok('undo'); f.ok('set r fill blue'); f.error('redo', 'nothing to redo');
  f.ok('undo'); f.ok('undo'); f.ok('undo'); f.ok('undo'); f.error('undo', 'nothing to undo');
});

test('successful IO barriers, failed IO preservation, default save path and resize validation', t => {
  const f = new Fixture(); t.after(() => f.close()); f.ok('init');
  f.error('redo', 'undo not allowed after io command'); f.ok('create circle c 1 2 3');
  f.error(`read "${f.file('missing.svg')}"`, `cannot read file: ${f.file('missing.svg')}`);
  f.error(`save "${f.file('missing/sub.svg')}"`, `cannot write file: ${f.file('missing/sub.svg')}`);
  f.error('save', 'no file path. use save <file.svg>');
  f.ok('undo'); assert.equal(f.session.document.has('c'), false); f.ok('redo');
  const path = f.file('space file.svg'); f.ok(`save "${path}"`); f.error('undo', 'undo not allowed after io command');
  f.ok('move c 1 1'); f.ok('save'); assert.match(readFileSync(path, 'utf8'), /cx="2"/);
  f.ok('move c 1 1'); f.ok('canvas'); f.ok('undo');
  const before = f.snapshot(); assert.match(f.run('canvas 1 -2')[0], /^error:/); assert.equal(f.snapshot(), before);
  f.ok('canvas 100 200'); assert.equal(f.session.document.height, 200); f.error('redo', 'undo not allowed after io command');
  f.ok('move c 1 1'); f.ok(`read "${path}"`); f.error('undo', 'undo not allowed after io command');
  f.ok('init'); f.error('save', 'no file path. use save <file.svg>');
  assert.deepEqual(readdirSync(f.directory), ['space file.svg']);
});

test('SVG round-trip preserves hierarchy, child order, styles, Unicode and escaped text', t => {
  const f = new Fixture(); t.after(() => f.close()); f.ok('init 400 300');
  for (const command of ['create g g', 'set g stroke red', 'create rect r -1.5 2 3 4 in g', 'create circle c 1 2 3 in g',
    'create ellipse e 1 2 3 4 in g', 'create line l 1 2 3 4 black', 'create text t 1 2 "中文 & <tag> \\"quoted\\"" in g']) f.ok(command);
  f.ok('create text empty 0 0 ""');
  const xml = f.snapshot(); assert.match(xml, /&amp;/); assert.match(xml, /&lt;tag&gt;/);
  const decoded = f.codec.decode(xml); assert.deepEqual(decoded.warnings, []); assert.equal(f.codec.encode(decoded.document), xml);
  const path = f.file('demo.svg'); f.ok(`save "${path}"`); f.ok('delete g'); f.ok(`read "${path}"`); assert.equal(f.snapshot(), xml);
});

test('SVG auto ids reserve explicit ids throughout the file and reject duplicates', t => {
  const f = new Fixture(); t.after(() => f.close());
  const result = f.codec.decode('<svg width="400px" height="300"><rect/><g><rect id="rect1"/><text>hello &amp; world</text></g><circle/></svg>');
  assert.deepEqual(result.warnings, [
    'warning: assigned id rect2 to unnamed <rect>', 'warning: assigned id g1 to unnamed <g>',
    'warning: assigned id text1 to unnamed <text>', 'warning: assigned id circle1 to unnamed <circle>',
  ]);
  assert.equal(result.document.require('text1').content, 'hello & world');
  assert.throws(() => f.codec.decode('<svg><g id="x"><rect id="x"/></g></svg>'), /id already exists: x/);
  assert.equal(f.codec.decode('<svg><g id="b" data-kind="box"><rect id="r"/></g></svg>').document.require('b').type, 'g');
});

test('failed imports preserve current document, remembered path and redo history', t => {
  const f = new Fixture(); t.after(() => f.close()); f.ok('init'); f.ok('create g g');
  const path = f.file('good.svg'); f.ok(`save "${path}"`); f.ok('create circle c 0 0 1'); f.ok('undo');
  const before = f.snapshot();
  for (const xml of ['<svg><rect></svg>', '<html/>', '<svg><path id="p"/></svg>',
    '<svg><g id="g" transform="translate(1,2)"/></svg>', '<svg viewBox="1 2 3 4"/>',
    '<!DOCTYPE svg [<!ENTITY x "bad">]><svg/>', '<svg><rect id="r" width="-1"/></svg>',
    '<svg><text id="t"><tspan>x</tspan></text></svg>', '<svg><g id="g">bad text</g></svg>']) {
    const bad = f.file('bad.svg'); writeFileSync(bad, xml); assert.match(f.run(`read "${bad}"`)[0], /^error:/); assert.equal(f.snapshot(), before);
  }
  f.ok('redo'); assert.equal(f.session.document.has('c'), true); f.ok('save'); assert.match(readFileSync(path, 'utf8'), /id="c"/);
});

test('real CLI accepts CRLF piped scripts and continues after errors', () => {
  const child = spawnSync(process.execPath, ['dist/src/main.js'], { encoding: 'utf8', input: '# comment\r\ninit 100 200\r\ncreate rect r 1 2 3 4 #eee\r\nscale r 0\r\nmove r 2 3\r\ntree\r\n' });
  assert.equal(child.status, 0); assert.equal(child.stderr, '');
  assert.match(child.stdout, /error: scale factor must be positive/);
  assert.match(child.stdout, /rect#r x=3 y=5 w=3 h=4 fill=#eee/);
});

test('scale multiplies every geometric field, including line endpoints and text positions', t => {
  const f = new Fixture(); t.after(() => f.close()); f.ok('init');
  for (const command of ['create g g', 'create rect r 1 2 3 4 in g', 'create circle c 1 2 3 in g',
    'create ellipse e 1 2 3 4 in g', 'create line l 1 2 3 4 black in g', 'create text t 1 2 "Title" in g', 'set l stroke-width 3']) f.ok(command);
  const before = f.snapshot(); f.ok('scale g 2');
  for (const [id, expected] of Object.entries({ r: { x: '2', y: '4', width: '6', height: '8' },
    c: { cx: '2', cy: '4', r: '6' }, e: { cx: '2', cy: '4', rx: '6', ry: '8' },
    l: { x1: '2', y1: '4', x2: '6', y2: '8' }, t: { x: '2', y: '4' } })) {
    for (const [key, value] of Object.entries(expected)) assert.equal(f.session.document.require(id).get(key), value);
  }
  assert.equal(f.session.document.require('l').get('stroke-width'), '3');
  assert.equal(f.session.document.require('t').content, 'Title');
  f.ok('undo'); assert.equal(f.snapshot(), before);
});

test('XML-invalid text is rejected as an edit instead of breaking later save', t => {
  const f = new Fixture(); t.after(() => f.close()); f.ok('init'); f.ok('create text t 0 0 "你好 😀"');
  const before = f.snapshot(); f.error('set t text "bad\u0001"', 'invalid XML character');
  f.error('set t fill "bad\ud800"', 'invalid XML character'); assert.equal(f.snapshot(), before);
  assert.equal(f.codec.decode(before).document.require('t').content, '你好 😀');
});

test('assignment transcript has exact move, undo, redo, set and delete feedback', t => {
  const f = new Fixture(); t.after(() => f.close());
  for (const line of ['init 800 600', 'create rect bg 0 0 800 600 #ffffff',
    'create text title 20 40 "My Diagram"', 'create circle c1 100 100 20 red',
    'create rect box 200 80 60 60 #3366ff', 'group markers c1 box']) f.ok(line);
  const transcript: [string, string][] = [
    ['move c1 30 0', 'circle#c1 moved to (130,100)'],
    ['undo', 'circle#c1 moved back to (100,100)'],
    ['redo', 'circle#c1 moved to (130,100)'],
    ['set title text "My Diagram v2"', 'text#title updated: text="My Diagram v2"'],
    ['undo', 'text#title updated: text="My Diagram"'],
    ['group bad c1 markers', 'error: cannot group a container into its own descendant: markers'],
    ['delete box', 'rect#box deleted'],
    ['undo', 'rect#box restored into g#markers'],
  ];
  for (const [line, expected] of transcript) {
    assert.deepEqual(f.run(line), [expected]);
    if (expected === 'circle#c1 moved back to (100,100)') assert.equal(f.session.document.require('c1').get('cx'), '100');
  }
  assert.equal(f.session.document.require('title').content, 'My Diagram');
  assert.equal(f.session.document.parentLabel(f.session.document.require('box')), 'g#markers');
  const path = f.file('demo.svg');
  assert.deepEqual(f.run(`save "${path}"`), [`saved to ${path} (5 elements)`]);
  f.error('undo', 'undo not allowed after io command');
});

test('move feedback uses each leaf position and inverse group deltas without type dispatch', t => {
  const f = new Fixture(); t.after(() => f.close()); f.ok('init');
  for (const create of ['create rect r 1 2 3 4', 'create circle c 1 2 3', 'create ellipse e 1 2 3 4',
    'create line l 1 2 3 4', 'create text t 1 2 "T"']) f.ok(create);
  for (const [id, type] of [['r', 'rect'], ['c', 'circle'], ['e', 'ellipse'], ['l', 'line'], ['t', 'text']]) {
    assert.deepEqual(f.run(`move ${id} 3 -2`), [`${type}#${id} moved to (4,0)`]);
    assert.deepEqual(f.run('undo'), [`${type}#${id} moved back to (1,2)`]);
    assert.deepEqual(f.run('redo'), [`${type}#${id} moved to (4,0)`]);
  }
  f.ok('group g r c e l t');
  assert.deepEqual(f.run('move g 0 100'), ['g#g moved by (0,100)']);
  assert.deepEqual(f.run('undo'), ['g#g moved back by (0,-100)']);
  assert.equal(f.session.document.require('c').get('cy'), '0');
  assert.deepEqual(f.run('redo'), ['g#g moved by (0,100)']);
  assert.equal(f.session.document.require('c').get('cy'), '100');
});

test('undo feedback describes removed attributes, restored values and root deletions', t => {
  const f = new Fixture(); t.after(() => f.close()); f.ok('init'); f.ok('create circle c 1 2 3');
  f.ok('set c fill red'); assert.deepEqual(f.run('undo'), ['circle#c updated: fill removed']);
  assert.equal(f.session.document.require('c').get('fill'), undefined);
  assert.deepEqual(f.run('redo'), ['circle#c updated: fill="red"']);
  f.ok('set c fill blue'); assert.deepEqual(f.run('undo'), ['circle#c updated: fill="red"']);
  f.ok('set c cx 8'); assert.deepEqual(f.run('undo'), ['circle#c updated: cx="1"']);
  assert.equal(f.session.document.require('c').get('cx'), '1');
  f.ok('delete c'); assert.deepEqual(f.run('undo'), ['circle#c restored into svg']);
  assert.deepEqual(f.run('redo'), ['circle#c deleted']);
  assert.equal(f.session.document.has('c'), false);
});
