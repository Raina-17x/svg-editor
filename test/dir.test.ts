import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DirCommand } from '../src/plugins/command-dir/DirCommand.js';
import { DirPlugin } from '../src/plugins/command-dir/DirPlugin.js';
import { Command, DirectoryEntry } from '../src/application/extensions/index.js';
import { NodeDirectoryAdapter } from '../src/infrastructure/NodeDirectoryAdapter.js';
import { CommandTestContext } from './CommandTestContext.js';
import { LoaderFixture } from './LoaderFixture.js';

test('dir plugin registers independently without a document or builtin command package', () => {
  const commands: Command[] = [];
  new DirPlugin().activate(CommandTestContext.registrations(commands));
  assert.equal(commands.length, 1); assert.equal(commands[0].name, 'dir');
});

test('dir substitute covers mixed entries, hidden names, special entries, stable ordinal sorting and exact spacing', () => {
  const entries: DirectoryEntry[] = [
    { name: 'z.txt', kind: 'file' }, { name: 'z-dir', kind: 'directory' },
    { name: '.hidden', kind: 'file' }, { name: 'A.txt', kind: 'file' },
    { name: 'a-dir', kind: 'directory' }, { name: 'link', kind: 'other' },
    { name: '.', kind: 'directory' }, { name: '..', kind: 'directory' }
  ];
  const snapshot = JSON.stringify(entries); let calls = 0;
  const command = new DirCommand();
  const expected = ['[DIR]  a-dir', '[DIR]  z-dir', '[FILE]  .hidden', '[FILE]  A.txt', '[FILE]  z.txt', '[OTHER]  link'];
  for (const input of [entries, [...entries].reverse(), entries]) {
    const context = CommandTestContext.create(undefined, { cwd: '/fixed', list(path) { calls++; assert.equal(path, '/fixed'); return input; } });
    assert.deepEqual(command.execute([], context), expected);
  }
  assert.equal(calls, 3); assert.equal(JSON.stringify(entries), snapshot);
});

test('dir empty and failed reads have exact feedback, extra arguments never access the filesystem', () => {
  const command = new DirCommand();
  assert.deepEqual(command.execute([], CommandTestContext.create(undefined, { cwd: '/empty', list: () => [] })), ['(empty directory)']);
  const directory = { cwd: '/unreadable', list(): never { throw new Error('permission denied'); } };
  assert.deepEqual(command.execute([], CommandTestContext.create(undefined, directory)), ['error: cannot read directory: /unreadable']);
  assert.throws(() => command.execute([{ value: 'extra', isQuoted: false }], CommandTestContext.create()), /invalid arguments/);
});

test('dir combines with the real filesystem adapter, including hidden files and empty/missing paths', t => {
  const f = new LoaderFixture(); t.after(() => f.close());
  const real = new NodeDirectoryAdapter();
  assert.deepEqual(new DirCommand().execute([], CommandTestContext.create(undefined, { cwd: f.root, list: target => real.list(target) })), ['(empty directory)']);
  f.write('work/z-dir/inside.txt', 'nested file must not appear');
  f.write('work/a-dir/inside.txt', 'nested'); f.write('work/z.txt', 'z'); f.write('work/.hidden', 'hidden');
  const path = f.root + '/work';
  const command = new DirCommand();
  const context = CommandTestContext.create(undefined, { cwd: path, list: target => real.list(target) });
  assert.deepEqual(command.execute([], context), ['[DIR]  a-dir', '[DIR]  z-dir', '[FILE]  .hidden', '[FILE]  z.txt']);
  assert.deepEqual(command.execute([], CommandTestContext.create(undefined, { cwd: f.root + '/missing', list: target => real.list(target) })), [`error: cannot read directory: ${f.root}/missing`]);
});
