import { ExecutableCommand as Command } from '../../../application/extensions/index.js';
import { SessionApi } from '../../../application/extensions/index.js';
import { Args } from '../../../application/extensions/index.js';
export class CanvasCommand extends Command {
  constructor(private readonly args: string[]) { super(); if (args.length !== 0 && args.length !== 2) Args.count(args, 2); }
  execute(session: SessionApi): string[] { return session.canvas(...Args.numbers(this.args)); }
}
