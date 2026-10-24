import { Command } from '../application/Command.js';
import { ShapeFactory } from '../application/ShapeFactory.js';
import { CreateCommand } from '../application/commands/CreateCommand.js';
import { DeleteCommand } from '../application/commands/DeleteCommand.js';
import { MoveCommand } from '../application/commands/MoveCommand.js';
import { ScaleCommand } from '../application/commands/ScaleCommand.js';
import { SetCommand } from '../application/commands/SetCommand.js';
import { GroupCommand } from '../application/commands/GroupCommand.js';
import { UngroupCommand } from '../application/commands/UngroupCommand.js';
import { AddToCommand } from '../application/commands/AddToCommand.js';
import { OrderCommand } from '../application/commands/OrderCommand.js';
import { InitCommand } from '../application/commands/InitCommand.js';
import { ReadCommand } from '../application/commands/ReadCommand.js';
import { SaveCommand } from '../application/commands/SaveCommand.js';
import { CanvasCommand } from '../application/commands/CanvasCommand.js';
import { UndoCommand } from '../application/commands/UndoCommand.js';
import { RedoCommand } from '../application/commands/RedoCommand.js';
import { TreeCommand } from '../application/commands/TreeCommand.js';
import { ShowCommand } from '../application/commands/ShowCommand.js';
import { HelpCommand } from '../application/commands/HelpCommand.js';
import { Token } from './Token.js';

export class CommandRegistry {
  private readonly commands = new Map<string, (args: Token[]) => Command>();
  constructor(factory: ShapeFactory) {
    const register = (name: string, create: (args: string[]) => Command): void => { this.commands.set(name, args => create(args.map(token => token.value))); };
    register('init', args => new InitCommand(args));
    register('read', args => new ReadCommand(args));
    register('save', args => new SaveCommand(args));
    register('canvas', args => new CanvasCommand(args));
    this.commands.set('create', args => {
      const hasParent = args.length >= 4 && args.at(-2)!.value === 'in' && !args.at(-2)!.isQuoted;
      const parent = hasParent ? args.at(-1)!.value : undefined;
      const params = (hasParent ? args.slice(0, -2) : args).map(token => token.value);
      return new CreateCommand(params, factory, parent);
    });
    register('delete', args => new DeleteCommand(args));
    register('move', args => new MoveCommand(args));
    register('scale', args => new ScaleCommand(args));
    register('set', args => new SetCommand(args));
    register('group', args => new GroupCommand(args));
    register('ungroup', args => new UngroupCommand(args));
    register('addto', args => new AddToCommand(args));
    register('front', args => new OrderCommand(args, true));
    register('back', args => new OrderCommand(args, false));
    register('undo', args => new UndoCommand(args));
    register('redo', args => new RedoCommand(args));
    register('tree', args => new TreeCommand(args));
    register('show', args => new ShowCommand(args));
    register('help', args => new HelpCommand(args));
  }
  parse(tokens: Token[]): Command {
    const name = tokens[0].value;
    const create = this.commands.get(name);
    if (!create) throw new Error(`unknown command: ${name}`);
    return create(tokens.slice(1));
  }
}
