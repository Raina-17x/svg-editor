import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import assert from 'node:assert/strict';

export class LoaderFixture {
  readonly root = mkdtempSync(join(process.cwd(), '.svg-editor-test-loader-'));
  write(file: string, contents: string): string {
    const target = resolve(this.root, file);
    assert.ok(target.startsWith(this.root + '\\') || target.startsWith(this.root + '/'));
    mkdirSync(dirname(target), { recursive: true }); writeFileSync(target, contents); return target;
  }
  plugin(folder: string, name: string, contributes: object, source: string, extension = 'cjs'): string {
    this.write(`${folder}/package.json`, JSON.stringify({ name, main: `index.${extension}`, contributes }));
    return this.write(`${folder}/index.${extension}`, source);
  }
  config(plugins: unknown[], file = 'plugins.config.json'): string { return this.write(file, JSON.stringify({ plugins })); }
  static commandSource(command = 'echo'): string {
    return `class EchoCommand {
      constructor(prefix) { this.name = ${JSON.stringify(command)}; this.help = [this.name + ' <text>']; this.prefix = prefix; }
      execute(args) { return [this.prefix + args.map(arg => arg.value).join('|')]; }
    }
    class EchoPlugin { activate(ctx, options) { ctx.registerCommand(new EchoCommand(options.prefix ?? '')); } }
    exports.default = new EchoPlugin();`;
  }
  close(): void {
    assert.equal(dirname(this.root), process.cwd());
    assert.ok(this.root.includes('.svg-editor-test-loader-'));
    rmSync(this.root, { recursive: true, force: true });
  }
}
