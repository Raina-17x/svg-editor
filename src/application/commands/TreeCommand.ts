import { Command } from '../Command.js';
import { EditorSession } from '../EditorSession.js';
import { Args } from '../Args.js';
import { Shape } from '../../domain/Shape.js';
export class TreeCommand extends Command {
  constructor(private readonly args: string[]) { super(); Args.count(args, 0, 1); }
  execute(session: EditorSession): string[] {
    const document = session.document;
    const lines: string[] = [];
    const visit = (nodes: readonly Shape[], prefix: string): void => {
      nodes.forEach((node, index) => {
        const last = index === nodes.length - 1;
        lines.push(`${prefix}${last ? '└── ' : '├── '}${node.summary()}`);
        visit(node.children, `${prefix}${last ? '    ' : '│   '}`);
      });
    };
    if (this.args.length) {
      const root = document.require(this.args[0]); lines.push(root.summary()); visit(root.children, '');
    } else { lines.push(`svg (${document.width}x${document.height})`); visit(document.children, ''); }
    return lines;
  }
}
