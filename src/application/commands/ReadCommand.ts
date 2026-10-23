import { Command } from '../Command.js';
import { EditorSession } from '../EditorSession.js';
import { Args } from '../Args.js';
export class ReadCommand extends Command {
  constructor(private readonly args: string[]) { super(); Args.count(args, 1); }
  execute(session: EditorSession): string[] { return session.read(this.args[0]); }
}
