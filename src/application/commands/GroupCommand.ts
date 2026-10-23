import { EditCommand } from '../EditCommand.js';
import { Args } from '../Args.js';
import { SvgDocument } from '../../domain/SvgDocument.js';
export class GroupCommand extends EditCommand {
  constructor(private readonly args: string[]) { super(); Args.count(args, 2, Infinity); }
  apply(document: SvgDocument): string { document.group(this.args[0], this.args.slice(1)); return `g#${this.args[0]} created with ${this.args.length - 1} children`; }
  undoMessage(): string { return `g#${this.args[0]} removed; ${this.args.length - 1} children restored to original parents`; }
}
