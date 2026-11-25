import { ExecutableCommand as Command } from '../../../application/extensions/index.js';
import { SessionApi } from '../../../application/extensions/index.js';
import { Args } from '../../../application/extensions/index.js';
export class RedoCommand extends Command {
  constructor(args: string[]) { super(); Args.count(args, 0); }
  execute(session: SessionApi): string[] { return session.redo(); }
}
