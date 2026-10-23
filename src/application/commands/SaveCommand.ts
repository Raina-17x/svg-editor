import { Command } from '../Command.js';
import { EditorSession } from '../EditorSession.js';
import { Args } from '../Args.js';
export class SaveCommand extends Command {
  constructor(private readonly args: string[]) { super(); Args.count(args, 0, 1); }
  execute(session: EditorSession): string[] { return session.save(this.args[0]); }
}
