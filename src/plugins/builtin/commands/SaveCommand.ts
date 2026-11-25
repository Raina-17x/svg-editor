import { ExecutableCommand as Command } from '../../../application/extensions/index.js';
import { SessionApi } from '../../../application/extensions/index.js';
import { Args } from '../../../application/extensions/index.js';
export class SaveCommand extends Command {
  constructor(private readonly args: string[]) { super(); Args.count(args, 0, 1); }
  execute(session: SessionApi): string[] { return session.save(this.args[0]); }
}
