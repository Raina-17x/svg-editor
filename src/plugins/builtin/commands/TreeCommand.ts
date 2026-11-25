import { ExecutableCommand, Args, SessionApi } from '../../../application/extensions/index.js';
export class TreeCommand extends ExecutableCommand {
  constructor(private readonly args: string[]) { super(); Args.count(args, 0, 1); }
  execute(session: SessionApi): string[] { return session.tree(this.args[0]); }
}
