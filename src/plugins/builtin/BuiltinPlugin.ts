import { Plugin, PluginContext, ExecutableCommand } from '../../application/extensions/index.js';
import { Rect } from '../../domain/Rect.js';
import { Circle } from '../../domain/Circle.js';
import { Ellipse } from '../../domain/Ellipse.js';
import { Line } from '../../domain/Line.js';
import { Text } from '../../domain/Text.js';
import { Group } from '../../domain/Group.js';
import { Value } from '../../domain/Value.js';
import { BuiltinShapeProvider } from './BuiltinShapeProvider.js';
import { BuiltinCommand } from './BuiltinCommand.js';
import { CreateCommand } from './commands/CreateCommand.js';
import { DeleteCommand } from './commands/DeleteCommand.js';
import { MoveCommand } from './commands/MoveCommand.js';
import { ScaleCommand } from './commands/ScaleCommand.js';
import { SetCommand } from './commands/SetCommand.js';
import { GroupCommand } from './commands/GroupCommand.js';
import { UngroupCommand } from './commands/UngroupCommand.js';
import { AddToCommand } from './commands/AddToCommand.js';
import { OrderCommand } from './commands/OrderCommand.js';
import { InitCommand } from './commands/InitCommand.js';
import { ReadCommand } from './commands/ReadCommand.js';
import { SaveCommand } from './commands/SaveCommand.js';
import { CanvasCommand } from './commands/CanvasCommand.js';
import { UndoCommand } from './commands/UndoCommand.js';
import { RedoCommand } from './commands/RedoCommand.js';
import { TreeCommand } from './commands/TreeCommand.js';
import { ShowCommand } from './commands/ShowCommand.js';
import { HelpCommand } from './commands/HelpCommand.js';

export class BuiltinPlugin implements Plugin {
  activate(context: PluginContext): void {
    const shapes = [
      new BuiltinShapeProvider('rect', 'create rect <id> <x> <y> <w> <h> [fill] [in <gid>]', 4,
        (id, a) => new Rect(id, Value.number(a[0]), Value.number(a[1]), Value.number(a[2]), Value.number(a[3])), Rect, 'fill'),
      new BuiltinShapeProvider('circle', 'create circle <id> <cx> <cy> <r> [fill] [in <gid>]', 3,
        (id, a) => new Circle(id, Value.number(a[0]), Value.number(a[1]), Value.number(a[2])), Circle, 'fill'),
      new BuiltinShapeProvider('ellipse', 'create ellipse <id> <cx> <cy> <rx> <ry> [fill] [in <gid>]', 4,
        (id, a) => new Ellipse(id, Value.number(a[0]), Value.number(a[1]), Value.number(a[2]), Value.number(a[3])), Ellipse, 'fill'),
      new BuiltinShapeProvider('line', 'create line <id> <x1> <y1> <x2> <y2> [stroke] [in <gid>]', 4,
        (id, a) => new Line(id, Value.number(a[0]), Value.number(a[1]), Value.number(a[2]), Value.number(a[3])), Line, 'stroke'),
      new BuiltinShapeProvider('text', 'create text <id> <x> <y> "content" [in <gid>]', 3,
        (id, a) => new Text(id, Value.number(a[0]), Value.number(a[1]), a[2]), Text),
      new BuiltinShapeProvider('g', 'create g <id> [in <gid>]', 0, id => new Group(id), Group)
    ];
    shapes.forEach(shape => context.registerShape(shape));
    const register = (name: string, make: (args: string[]) => ExecutableCommand, help: readonly string[] = []): void => {
      context.registerCommand(new BuiltinCommand(name, help, args => make(args.map(token => token.value))));
    };
    register('init', args => new InitCommand(args), ['init [w] [h] | read <file.svg> | save [file.svg] | canvas [w h]']);
    register('read', args => new ReadCommand(args));
    register('save', args => new SaveCommand(args));
    register('canvas', args => new CanvasCommand(args));
    context.registerCommand(new BuiltinCommand('create', shapes.map(shape => shape.help), (args, ctx) => {
      const hasParent = args.length >= 4 && args.at(-2)!.value === 'in' && !args.at(-2)!.isQuoted;
      const parent = hasParent ? args.at(-1)!.value : undefined;
      const params = (hasParent ? args.slice(0, -2) : args).map(token => token.value);
      return new CreateCommand(params, ctx.shapes, parent);
    }));
    register('delete', args => new DeleteCommand(args), ['delete <id> | move <id> <dx> <dy> | scale <id> <factor>']);
    register('move', args => new MoveCommand(args));
    register('scale', args => new ScaleCommand(args));
    register('set', args => new SetCommand(args), ['set <id> <attr> <value> | group <newGid> <id1> <id2>...']);
    register('group', args => new GroupCommand(args));
    register('ungroup', args => new UngroupCommand(args), ['ungroup <gid> | addto <gid> <id> | front <id> | back <id>']);
    register('addto', args => new AddToCommand(args));
    register('front', args => new OrderCommand(args, true));
    register('back', args => new OrderCommand(args, false));
    register('undo', args => new UndoCommand(args));
    register('redo', args => new RedoCommand(args));
    register('tree', args => new TreeCommand(args), ['tree [id] | show <id> | help | undo | redo']);
    register('show', args => new ShowCommand(args));
    context.registerCommand(new BuiltinCommand('help', [
      'Use double quotes for spaces; # at line start is a comment. EOF (Ctrl+Z then Enter on Windows) exits.'
    ], (args, ctx) => new HelpCommand(args.map(token => token.value), () => ctx.help())));
  }
}

export default new BuiltinPlugin();
