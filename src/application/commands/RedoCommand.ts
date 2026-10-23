import { Command } from '../Command.js';
import { EditorSession } from '../EditorSession.js';
import { Args } from '../Args.js';
export class RedoCommand extends Command {
  constructor(args: string[]) { super(); Args.count(args, 0); }
  execute(session: EditorSession): string[] { return session.redo(); }
}
