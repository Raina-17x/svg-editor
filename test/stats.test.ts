import { test } from 'node:test';
import assert from 'node:assert/strict';
import { StatsCommand } from '../src/plugins/command-stats/StatsCommand.js';
import { StatsPlugin } from '../src/plugins/command-stats/StatsPlugin.js';
import { Command } from '../src/application/extensions/index.js';
import { SvgDocument } from '../src/domain/SvgDocument.js';
import { Group } from '../src/domain/Group.js';
import { Rect } from '../src/domain/Rect.js';
import { Circle } from '../src/domain/Circle.js';
import { Text } from '../src/domain/Text.js';
import { CommandTestContext } from './CommandTestContext.js';
import { Panel } from './plugins/Panel.js';

test('stats plugin registers independently without builtins or other plugins', () => {
  const commands: Command[] = [];
  new StatsPlugin().activate(CommandTestContext.registrations(commands));
  assert.equal(commands.length, 1); assert.equal(commands[0].name, 'stats');
  assert.match(commands[0].help[0], /^stats/);
});

test('stats uses ordered depth-first traversal, counts composite containers generically, and never counts SVG root', () => {
  const document = new SvgDocument();
  const group = new Group('flow');
  group.insert(new Text('first', 1, 2, 'first'));
  group.insert(new Panel('panel'));
  const nested = new Group('nested');
  nested.insert(new Circle('circle', 1, 2, 3)); nested.insert(new Rect('last', 1, 2, 3, 4));
  group.insert(nested); document.add(group);
  const command = new StatsCommand();
  const before = document.clone();
  assert.deepEqual(command.execute([], CommandTestContext.create(document)), ['text: 2  rect: 2  circle: 1  (total 5, containers 3)']);
  assert.deepEqual(document, before);
});

test('stats handles empty document, empty groups, uninitialized document and extra arguments', () => {
  const command = new StatsCommand(); const document = new SvgDocument();
  assert.deepEqual(command.execute([], CommandTestContext.create(document)), ['(total 0, containers 0)']);
  document.add(new Group('empty'));
  assert.deepEqual(command.execute([], CommandTestContext.create(document)), ['(total 0, containers 1)']);
  assert.throws(() => command.execute([], CommandTestContext.create()), /no document/);
  assert.throws(() => command.execute([{ value: 'extra', isQuoted: false }], CommandTestContext.create(document)), /invalid arguments/);
});
