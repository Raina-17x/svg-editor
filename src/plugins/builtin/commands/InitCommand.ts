import { ExecutableCommand as Command } from '../../../application/extensions/index.js';
import { SessionApi } from '../../../application/extensions/index.js';
import { Args } from '../../../application/extensions/index.js';
export class InitCommand extends Command {
  constructor(private readonly args: string[]) { super(); Args.count(args, 0, 2); }
  execute(session: SessionApi): string[] { return session.init(...Args.numbers([this.args[0] ?? '800', this.args[1] ?? '600']) as [number, number]); }
}
