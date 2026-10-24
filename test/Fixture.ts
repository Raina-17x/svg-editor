import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { ShapeFactory } from '../src/application/ShapeFactory.js';
import { EditorSession } from '../src/application/EditorSession.js';
import { FileDocumentStore } from '../src/infrastructure/FileDocumentStore.js';
import { SvgCodec } from '../src/infrastructure/SvgCodec.js';
import { CommandRegistry } from '../src/cli/CommandRegistry.js';
import { CommandProcessor } from '../src/cli/CommandProcessor.js';

export class Fixture {
  readonly directory = mkdtempSync(join(process.cwd(), '.svg-editor-test-'));
  readonly factory = new ShapeFactory();
  readonly codec = new SvgCodec(this.factory);
  readonly session = new EditorSession(new FileDocumentStore(this.codec));
  readonly cli = new CommandProcessor(this.session, new CommandRegistry(this.factory));
  file(name: string): string { return join(this.directory, name); }
  run(line: string): string[] { return this.cli.run(line); }
  ok(line: string): string[] {
    const result = this.run(line);
    assert.ok(!result.some(message => message.startsWith('error:')), `${line}: ${result.join('\n')}`);
    return result;
  }
  error(line: string, expected: string): void { assert.deepEqual(this.run(line), [`error: ${expected}`]); }
  snapshot(): string { return this.codec.encode(this.session.document); }
  close(): void { rmSync(this.directory, { recursive: true, force: true }); }
}
