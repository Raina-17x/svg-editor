import { Command } from '../Command.js';
import { Args } from '../Args.js';
export class HelpCommand extends Command {
  constructor(args: string[]) { super(); Args.count(args, 0); }
  execute(): string[] { return [
    'init [w] [h] | read <file.svg> | save [file.svg] | canvas [w h]',
    'create rect <id> <x> <y> <w> <h> [fill] [in <gid>]',
    'create circle <id> <cx> <cy> <r> [fill] [in <gid>]',
    'create ellipse <id> <cx> <cy> <rx> <ry> [fill] [in <gid>]',
    'create line <id> <x1> <y1> <x2> <y2> [stroke] [in <gid>]',
    'create text <id> <x> <y> "content" [in <gid>]',
    'create g <id> [in <gid>]',
    'delete <id> | move <id> <dx> <dy> | scale <id> <factor>',
    'set <id> <attr> <value> | group <newGid> <id1> <id2>...',
    'ungroup <gid> | addto <gid> <id> | front <id> | back <id>',
    'tree [id] | show <id> | help | undo | redo',
    'Use double quotes for spaces; # at line start is a comment. EOF (Ctrl+Z then Enter on Windows) exits.',
  ]; }
}
