import { ExecutableCommand, Args, SessionApi } from '../../../application/extensions/index.js';
export class SetCommand extends ExecutableCommand {
  constructor(private readonly args: string[]) { super(); Args.count(args, 3); }
  execute(session: SessionApi): string[] { return session.setAttribute(this.args[0], this.args[1], this.args[2]); }
}
