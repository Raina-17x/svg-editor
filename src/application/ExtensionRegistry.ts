import { PluginContext } from './extensions/PluginContext.js';
import { ShapeProvider } from './extensions/ShapeProvider.js';
import { Command } from './extensions/Command.js';
import { TreeDecorator } from './extensions/TreeDecorator.js';
import { AttributeHandler } from './extensions/AttributeHandler.js';

/** Generic registry only. Transactional plugin installation is a host concern. */
export class ExtensionRegistry implements PluginContext {
  private readonly shapes = new Map<string, ShapeProvider>();
  private readonly commands = new Map<string, Command>();
  private readonly decorators = new Map<string, TreeDecorator>();
  private readonly attributes = new Map<string, AttributeHandler>();
  registerShape(provider: ShapeProvider): void {
    this.validate(provider, ['create', 'read', 'supports', 'write']);
    if (!provider.svgTag || typeof provider.help !== 'string') throw new Error('invalid shape provider');
    if (this.shapes.has(provider.name)) throw new Error(`duplicate registration: shapes/${provider.name}`);
    if (this.shapeProviders().some(item => item.svgTag === provider.svgTag && item.dataKind === provider.dataKind)) {
      throw new Error(`duplicate shape selector: ${provider.svgTag}/${provider.dataKind ?? ''}`);
    }
    this.add(this.shapes, 'shapes', provider);
  }
  registerCommand(command: Command): void {
    this.validate(command, ['execute']);
    if (!Array.isArray(command.help) || command.help.some(line => typeof line !== 'string')) throw new Error('invalid command help');
    this.add(this.commands, 'commands', command);
  }
  registerDecorator(decorator: TreeDecorator): void {
    this.validate(decorator, ['onChange', 'decorate']); this.add(this.decorators, 'decorators', decorator);
  }
  registerAttribute(handler: AttributeHandler): void {
    this.validate(handler, ['handles', 'apply']); this.add(this.attributes, 'attributes', handler);
  }
  shapeProviders(): ShapeProvider[] { return [...this.shapes.values()]; }
  commandPlugins(): Command[] { return [...this.commands.values()]; }
  treeDecorators(): TreeDecorator[] { return [...this.decorators.values()]; }
  attributeHandlers(): AttributeHandler[] { return [...this.attributes.values()]; }
  private validate(value: unknown, methods: readonly string[]): void {
    if (!value || typeof value !== 'object') throw new Error('invalid extension object');
    const item = value as Record<string, unknown>;
    if (typeof item.name !== 'string' || !item.name.trim() || methods.some(name => typeof item[name] !== 'function')) {
      throw new Error('invalid extension contract');
    }
  }
  private add<T extends { readonly name: string }>(map: Map<string, T>, category: string, value: T): void {
    if (map.has(value.name)) throw new Error(`duplicate registration: ${category}/${value.name}`);
    map.set(value.name, value);
  }
}
