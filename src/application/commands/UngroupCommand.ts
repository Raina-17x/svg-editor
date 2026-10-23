import { EditCommand } from '../EditCommand.js';
import { Args } from '../Args.js';
import { SvgDocument } from '../../domain/SvgDocument.js';
export class UngroupCommand extends EditCommand {
  constructor(private readonly args: string[]) { super(); Args.count(args, 1); }
  apply(document: SvgDocument): string { document.ungroup(this.args[0]); return `g#${this.args[0]} ungrouped`; }
  undoMessage(before: SvgDocument): string {
    const group = before.require(this.args[0]);
    return `${group.label} restored into ${before.parentLabel(group)} with ${group.children.length} children`;
  }
}
