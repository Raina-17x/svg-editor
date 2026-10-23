import { Command } from '../Command.js';
import { EditorSession } from '../EditorSession.js';
import { Args } from '../Args.js';
export class ShowCommand extends Command {
  constructor(private readonly args: string[]) { super(); Args.count(args, 1); }
  execute(session: EditorSession): string[] {
    const shape = session.document.require(this.args[0]);
    const result = [`${shape.label} parent=${session.document.parentLabel(shape)}`];
    for (const [key, value] of shape.attributes) result.push(`  ${key}=${value}`);
    if (shape.content !== undefined) result.push(`  text=${JSON.stringify(shape.content)}`);
    return result;
  }
}
