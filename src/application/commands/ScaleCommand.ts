import { EditCommand } from '../EditCommand.js';
import { Args } from '../Args.js';
import { SvgDocument } from '../../domain/SvgDocument.js';
export class ScaleCommand extends EditCommand {
  constructor(private readonly args: string[]) { super(); Args.count(args, 2); }
  apply(document: SvgDocument): string { const shape = document.require(this.args[0]); const [factor] = Args.numbers(this.args.slice(1)); shape.scale(factor); return `${shape.label} scaled by ${factor}`; }
  undoMessage(before: SvgDocument): string { return `${before.require(this.args[0]).label} scale restored`; }
}
