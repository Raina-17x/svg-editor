import { EditCommand } from '../../../application/extensions/index.js';
import { Args } from '../../../application/extensions/index.js';
import { SvgDocument } from '../../../domain/SvgDocument.js';
export class DeleteCommand extends EditCommand {
  constructor(private readonly args: string[]) { super(); Args.count(args, 1); }
  apply(document: SvgDocument): string { const label = document.require(this.args[0]).label; document.delete(this.args[0]); return `${label} deleted`; }
  undoMessage(before: SvgDocument): string {
    const shape = before.require(this.args[0]);
    return `${shape.label} restored into ${before.parentLabel(shape)}`;
  }
}
