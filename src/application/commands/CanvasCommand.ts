import { Command } from '../Command.js';
import { EditorSession } from '../EditorSession.js';
import { Args } from '../Args.js';
export class CanvasCommand extends Command {
  constructor(private readonly args: string[]) { super(); if (args.length !== 0 && args.length !== 2) Args.count(args, 2); }
  execute(session: EditorSession): string[] { return session.canvas(...Args.numbers(this.args)); }
}
