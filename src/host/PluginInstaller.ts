import { ExtensionRegistry } from '../application/ExtensionRegistry.js';
import { DuplicateRegistrationError } from '../application/DuplicateRegistrationError.js';
import { Plugin } from '../application/extensions/index.js';
import { RegistrationTransaction } from './RegistrationTransaction.js';

/** Both code and config assembly must enter here. No concrete plugin imports. */
export class PluginInstaller {
  constructor(private readonly registry: ExtensionRegistry) {}
  install(manifest: unknown, plugin: unknown, options: Readonly<Record<string, unknown>> = {}): string[] {
    let name = '<unknown>';
    const transaction = new RegistrationTransaction(this.registry);
    try {
      if (!manifest || typeof manifest !== 'object' || !('name' in manifest) || typeof manifest.name !== 'string' || !manifest.name.trim()) {
        throw new Error('invalid plugin manifest');
      }
      name = manifest.name;
      const declared = this.declarations(manifest);
      if (!plugin || (typeof plugin !== 'object' && typeof plugin !== 'function') || typeof (plugin as Plugin).activate !== 'function') {
        throw new Error('default export must be a plugin instance with activate');
      }
      const result: unknown = (plugin as Plugin).activate(transaction, options);
      transaction.close();
      if (result && (typeof result === 'object' || typeof result === 'function') && 'then' in result && typeof result.then === 'function') {
        void Promise.resolve(result).catch(() => undefined);
        throw new Error('activate must be synchronous');
      }
      transaction.assertSucceeded();
      const registered = transaction.registered();
      if (JSON.stringify(declared) !== JSON.stringify(registered)) {
        return [`error: plugin manifest mismatch: ${name} (declared: ${JSON.stringify(declared)}, registered: ${JSON.stringify(registered)})`];
      }
      this.registry.replaceWith(transaction.candidate);
      return [];
    } catch (error) {
      if (error instanceof DuplicateRegistrationError) return [`error: ${error.message}`];
      const reason = String(error instanceof Error ? error.message : error).replace(/[\r\n]+/g, ' ');
      return [`error: plugin failed to activate: ${name} (${reason})`];
    } finally {
      transaction.close();
    }
  }
  private declarations(manifest: object): Record<string, readonly string[]> {
    const contributes: unknown = 'contributes' in manifest ? manifest.contributes : {};
    if (!contributes || typeof contributes !== 'object' || Array.isArray(contributes)) throw new Error('invalid contributes');
    const result: Record<string, readonly string[]> = {};
    const categories = ['shapes', 'commands', 'decorators', 'attributes'];
    if (Object.keys(contributes).some(key => !categories.includes(key))) throw new Error('unknown contributes category');
    for (const category of categories) {
      const raw: unknown = (contributes as Record<string, unknown>)[category];
      const names: unknown = raw === undefined ? [] : raw;
      if (!Array.isArray(names) || names.some(name => typeof name !== 'string' || !name.trim()) || new Set(names).size !== names.length) {
        throw new Error(`invalid contributes: ${category}`);
      }
      result[category] = [...names].sort();
    }
    return result;
  }
}
