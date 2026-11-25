import { ShapeProvider } from './ShapeProvider.js';
import { Command } from './Command.js';
import { AttributeHandler } from './AttributeHandler.js';
import { TreeDecorator } from './TreeDecorator.js';

/** Activation-scoped staging facade, closed after activate returns or throws. */
export interface PluginContext {
  registerShape(provider: ShapeProvider): void;
  registerCommand(command: Command): void;
  registerAttribute(handler: AttributeHandler): void;
  registerDecorator(decorator: TreeDecorator): void;
}
