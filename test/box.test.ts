import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Box } from '../src/plugins/shape-box/Box.js';
import { BoxProvider } from '../src/plugins/shape-box/BoxProvider.js';
import { BoxPlugin } from '../src/plugins/shape-box/BoxPlugin.js';
import { BoxAttributeHandler } from '../src/plugins/shape-box/BoxAttributeHandler.js';
import { BoxTypeDecorator } from '../src/plugins/shape-box/BoxTypeDecorator.js';
import { PluginContext, ShapeProvider, AttributeHandler, TreeDecorator } from '../src/application/extensions/index.js';
import { Rect } from '../src/domain/Rect.js';
import { Text } from '../src/domain/Text.js';
import { SvgDocument } from '../src/domain/SvgDocument.js';

test('box registers three extensions independently, with no builtin or other plugin activation', () => {
  const shapes: ShapeProvider[] = []; const attributes: AttributeHandler[] = []; const decorators: TreeDecorator[] = [];
  const context: PluginContext = {
    registerShape: item => { shapes.push(item); }, registerAttribute: item => { attributes.push(item); },
    registerDecorator: item => { decorators.push(item); }, registerCommand: () => { throw new Error('unexpected command'); }
  };
  new BoxPlugin().activate(context);
  assert.deepEqual(shapes.map(item => item.name), ['box']);
  assert.deepEqual(attributes.map(item => item.name), ['box-attributes']);
  assert.deepEqual(decorators.map(item => item.name), ['box-type-label']);
});

test('box template, deep clone, nested movement, scale, encapsulation and component protection', () => {
  const provider = new BoxProvider(); const box = provider.create('n1', ['120', '100', '160', '60', '开始']);
  assert.equal(box.fill, '#4a90d9'); assert.equal(box.title, '开始');
  assert.deepEqual(box.children.map(child => child.id), ['n1-rect', 'n1-label']);
  assert.equal(box.children[1].get('x'), '140'); assert.equal(box.children[1].get('y'), '135');
  const nested = provider.create('nested', ['0', '0', '10', '20', 'nested']); box.insert(nested);
  const copy = box.clone(); copy.move(10, 20); copy.scale(2);
  assert.ok(copy instanceof Box); assert.ok(copy.children[2] instanceof Box);
  assert.equal(box.children[0].get('x'), '120'); assert.equal(copy.children[0].get('x'), '260');
  assert.equal(copy.children[2].children[0].get('x'), '20');
  const exposed = box.children as import('../src/domain/Shape.js').Shape[]; exposed.pop();
  assert.equal(box.children.length, 3);
  assert.throws(() => box.remove(box.children[0]), /cannot detach box component/);
  assert.throws(() => box.assertCanUngroup(), /cannot ungroup composite shape: n1/);
  assert.throws(() => provider.create('bad', ['0', '0', '-1', '20', 'x']), /non-negative/);
  assert.throws(() => provider.create('bad', ['0', '0']), /invalid arguments/);
});

test('box provider round-trips supplied children and styles without replacing imported geometry', () => {
  const rectangle = new Rect('p-rect', 99, 88, 77, 66); const text = new Text('p-label', 11, 22, 'A & B');
  const provider = new BoxProvider();
  const box = provider.read({ tag: 'g', id: 'p', attributes: { 'data-kind': 'box', stroke: 'black' }, content: '', children: [text, rectangle] });
  assert.equal(box.children[0].id, 'p-label'); assert.equal(box.fill, undefined);
  assert.equal(box.children[1].get('x'), '99'); assert.equal(box.get('stroke'), 'black');
  assert.equal(provider.write(box).attributes['data-kind'], 'box');
  assert.throws(() => provider.read({ tag: 'g', id: 'p', attributes: { 'data-kind': 'box' }, content: '', children: [rectangle] }), /invalid box structure/);
  assert.throws(() => new Box('p', [new Text('p-rect', 0, 0, ''), text]), /invalid box structure/);
});

test('attribute handler and type label use only public methods, without a session implementation', () => {
  const box = new BoxProvider().create('n', ['0', '0', '10', '10', 'old']);
  const document = new SvgDocument(); document.add(box);
  const context = { document, require: (id: string) => document.require(id) };
  const handler = new BoxAttributeHandler();
  assert.equal(handler.handles(box, 'label'), true); assert.equal(handler.handles(box.children[0], 'label'), false);
  assert.equal(handler.apply(context, 'n', 'fill', 'red').message, 'box#n fill propagated to n-rect');
  const result = handler.apply(context, 'n', 'label', 'new');
  assert.equal(box.title, 'new'); assert.equal(result.undoMessage, 'box#n label restored: "old"');
  const decorator = new BoxTypeDecorator();
  assert.equal(decorator.decorate({ document, shape: box }), '(box)');
  assert.equal(decorator.decorate({ document, shape: box.children[0] }), '');
  assert.equal(decorator.decorate({ document }), '');
});
