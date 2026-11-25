import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DefaultHost } from '../src/host/DefaultHost.js';

export class Fixture {
  readonly directory = mkdtempSync(join(process.cwd(), '.svg-editor-test-'));
  readonly host = new DefaultHost();
  readonly factory = this.host.factory;
  readonly codec = this.host.codec;
  readonly session = this.host.session;
  readonly cli = this.host.cli;
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
