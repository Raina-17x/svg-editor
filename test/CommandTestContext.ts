import { CommandContext, DirectoryAccess, SessionApi, PluginContext, Command } from '../src/application/extensions/index.js';
import { SvgDocument } from '../src/domain/SvgDocument.js';

/** Minimal isolated context: unexpected access fails rather than silently editing. */
export class CommandTestContext {
  static registrations(commands: Command[]): PluginContext {
    return {
      registerCommand: command => { commands.push(command); },
      registerShape: () => { throw new Error('unexpected shape registration'); },
      registerAttribute: () => { throw new Error('unexpected attribute registration'); },
      registerDecorator: () => { throw new Error('unexpected decorator registration'); }
    };
  }
  static create(document?: SvgDocument, directory?: DirectoryAccess): CommandContext {
    return {
      session: new Proxy({ snapshot: () => document?.clone() }, {
        get(target, key) {
          if (key === 'snapshot') return target.snapshot;
          throw new Error(`unexpected session access: ${String(key)}`);
        }
      }) as unknown as SessionApi,
      directory: directory ?? { get cwd(): string { throw new Error('unexpected directory access'); }, list: () => [] },
      shapes: { create: () => { throw new Error('unexpected shape access'); } }, help: () => []
    };
  }
}
