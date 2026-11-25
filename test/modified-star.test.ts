import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ModifiedStarDecorator } from '../src/plugins/tree-star/ModifiedStarDecorator.js';
import { TreeStarPlugin } from '../src/plugins/tree-star/TreeStarPlugin.js';
import { PluginContext, TreeDecorator } from '../src/application/extensions/index.js';
import { SvgDocument } from '../src/domain/SvgDocument.js';
import { Group } from '../src/domain/Group.js';
import { Rect } from '../src/domain/Rect.js';

test('star registers independently and activations create isolated decorator instances', () => {
  const decorators: TreeDecorator[] = [];
  const context: PluginContext = {
    registerDecorator: item => { decorators.push(item); },
    registerShape: () => { throw new Error('unexpected shape registration'); },
    registerCommand: () => { throw new Error('unexpected command registration'); },
    registerAttribute: () => { throw new Error('unexpected attribute registration'); }
  };
  const plugin = new TreeStarPlugin(); plugin.activate(context); plugin.activate(context);
  assert.equal(decorators[0].name, 'modified-star'); assert.notEqual(decorators[0], decorators[1]);
  const document = new SvgDocument();
  decorators[0].onChange({ reason: 'init', document });
  document.add(new Rect('r', 0, 0, 10, 10));
  decorators[1].onChange({ reason: 'read', document });
  assert.equal(decorators[0].decorate({ document }), '*');
  assert.equal(decorators[1].decorate({ document }), '');
});

test('content state machine: edit, save, edit, undo to save point, redo, read and new init', () => {
  const star = new ModifiedStarDecorator(); let document = new SvgDocument();
  assert.equal(star.decorate({ document }), '');
  star.onChange({ reason: 'init', document });
  assert.equal(star.decorate({ document }), '');
  document.add(new Rect('r', 1, 2, 3, 4)); star.onChange({ reason: 'edit', document });
  assert.equal(star.decorate({ document }), '*');
  assert.equal(star.decorate({ document, shape: document.require('r') }), '*');
  star.onChange({ reason: 'save', document }); const saved = document.clone();
  assert.equal(star.decorate({ document }), '');
  document.require('r').set('fill', 'red'); star.onChange({ reason: 'edit', document });
  assert.equal(star.decorate({ document }), '*');
  star.onChange({ reason: 'undo', document: saved });
  assert.equal(star.decorate({ document: saved }), '');
  star.onChange({ reason: 'redo', document }); assert.equal(star.decorate({ document }), '*');
  star.onChange({ reason: 'read', document }); assert.equal(star.decorate({ document }), '');
  document = new SvgDocument(); star.onChange({ reason: 'init', document });
  assert.equal(star.decorate({ document }), '');
  document.add(new Rect('r', 1, 2, 3, 4));
  assert.equal(star.decorate({ document, shape: document.require('r') }), '*');
});

test('changes propagate to ancestors, unrelated siblings stay clean, and no-op edits stay clean', () => {
  const document = new SvgDocument(); const group = new Group('group'); const nested = new Group('nested');
  const rectangle = new Rect('r', 1, 2, 3, 4); nested.insert(rectangle); group.insert(nested);
  document.add(group); document.add(new Rect('sibling', 9, 9, 1, 1));
  const star = new ModifiedStarDecorator(); star.onChange({ reason: 'save', document });
  rectangle.set('x', '1'); star.onChange({ reason: 'edit', document });
  assert.equal(star.decorate({ document }), '');
  rectangle.set('fill', 'blue'); star.onChange({ reason: 'edit', document });
  for (const id of ['r', 'nested', 'group']) assert.equal(star.decorate({ document, shape: document.require(id) }), '*');
  assert.equal(star.decorate({ document }), '*');
  assert.equal(star.decorate({ document, shape: document.require('sibling') }), '');
  star.onChange({ reason: 'save', document }); document.delete('r');
  assert.equal(star.decorate({ document, shape: group }), '*');
  assert.equal(star.decorate({ document, shape: nested }), '*');
});

test('ordered structure and canvas dimensions affect content while attribute insertion order does not', () => {
  const document = new SvgDocument(); document.add(new Rect('a', 1, 2, 3, 4)); document.add(new Rect('b', 5, 6, 7, 8));
  const star = new ModifiedStarDecorator(); star.onChange({ reason: 'save', document });
  document.reorder('a', true);
  assert.equal(star.decorate({ document }), '*');
  assert.equal(star.decorate({ document, shape: document.require('a') }), '');
  star.onChange({ reason: 'save', document }); document.resize(100, 200);
  star.onChange({ reason: 'resize', document }); assert.equal(star.decorate({ document }), '*');
  assert.equal(star.decorate({ document, shape: document.require('a') }), '');
  const other = new SvgDocument(); const r = new Rect('a', 1, 2, 3, 4); other.add(r); r.set('fill', 'red'); r.set('stroke', 'black');
  star.onChange({ reason: 'save', document: other });
  const reordered = new SvgDocument(); const r2 = new Rect('a', 1, 2, 3, 4); r2.set('stroke', 'black'); r2.set('fill', 'red'); reordered.add(r2);
  assert.equal(star.decorate({ document: reordered }), '');
});
