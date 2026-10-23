import { EditCommand } from '../EditCommand.js';
import { Args } from '../Args.js';
import { SvgDocument } from '../../domain/SvgDocument.js';
export class AddToCommand extends EditCommand {
  constructor(private readonly args: string[]) { super(); Args.count(args, 2); }
  apply(document: SvgDocument): string { const [gid, id] = this.args; const label = document.require(id).label; document.addto(gid, id); return `${label} moved into g#${gid}`; }
  undoMessage(before: SvgDocument): string {
    const shape = before.require(this.args[1]);
    return `${shape.label} restored into ${before.parentLabel(shape)}`;
  }
}
