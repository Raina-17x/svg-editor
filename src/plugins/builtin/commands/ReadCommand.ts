import { ExecutableCommand as Command } from '../../../application/extensions/index.js';
import { SessionApi } from '../../../application/extensions/index.js';
import { Args } from '../../../application/extensions/index.js';
export class ReadCommand extends Command {
  constructor(private readonly args: string[]) { super(); Args.count(args, 1); }
  execute(session: SessionApi): string[] { return session.read(this.args[0]); }
}
