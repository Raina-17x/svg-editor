import { Command } from '../Command.js';
import { EditorSession } from '../EditorSession.js';
import { Args } from '../Args.js';
export class InitCommand extends Command {
  constructor(private readonly args: string[]) { super(); Args.count(args, 0, 2); }
  execute(session: EditorSession): string[] { return session.init(...Args.numbers([this.args[0] ?? '800', this.args[1] ?? '600']) as [number, number]); }
}
