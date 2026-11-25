import { ExtensionRegistry } from '../application/ExtensionRegistry.js';
import { PluginContext, ShapeProvider, Command, TreeDecorator, AttributeHandler } from '../application/extensions/index.js';

export class RegistrationTransaction implements PluginContext {
  readonly candidate: ExtensionRegistry;
  private open = true;
  private failure?: unknown;
  private failed = false;
  private readonly names = { shapes: [] as string[], commands: [] as string[], decorators: [] as string[], attributes: [] as string[] };
  constructor(registry: ExtensionRegistry) { this.candidate = registry.fork(); }
  registerShape(provider: ShapeProvider): void {
    this.register('shapes', provider, () => this.candidate.registerShape(provider));
  }
  registerCommand(command: Command): void {
    this.register('commands', command, () => this.candidate.registerCommand(command));
  }
  registerDecorator(decorator: TreeDecorator): void {
    this.register('decorators', decorator, () => this.candidate.registerDecorator(decorator));
  }
  registerAttribute(handler: AttributeHandler): void {
    this.register('attributes', handler, () => this.candidate.registerAttribute(handler));
  }
  registered(): Record<string, readonly string[]> { return Object.fromEntries(Object.entries(this.names).map(([key, names]) => [key, [...names].sort()])); }
  close(): void { this.open = false; }
  assertSucceeded(): void { if (this.failed) throw this.failure; }
  private register(category: keyof RegistrationTransaction['names'], item: { readonly name: string }, action: () => void): void {
    if (!this.open) throw new Error('plugin registration context is closed');
    this.assertSucceeded();
    try { action(); this.names[category].push(item.name); } catch (error) {
      this.failure = error; this.failed = true; throw error;
    }
  }
}
