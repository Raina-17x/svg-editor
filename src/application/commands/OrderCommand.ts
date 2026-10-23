import { EditCommand } from '../EditCommand.js';
import { Args } from '../Args.js';
import { SvgDocument } from '../../domain/SvgDocument.js';
export class OrderCommand extends EditCommand {
  constructor(private readonly args: string[], private readonly front: boolean) { super(); Args.count(args, 1); }
  apply(document: SvgDocument): string { const label = document.require(this.args[0]).label; document.reorder(this.args[0], this.front); return `${label} moved to ${this.front ? 'front' : 'back'}`; }
  undoMessage(before: SvgDocument): string { return `${before.require(this.args[0]).label} restored to previous z-order`; }
}
