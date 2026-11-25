import { ExecutableCommand, Args } from '../../../application/extensions/index.js';
export class HelpCommand extends ExecutableCommand {
  constructor(args: string[], private readonly lines: () => readonly string[]) { super(); Args.count(args, 0); }
  execute(): string[] { return [...this.lines()]; }
}
