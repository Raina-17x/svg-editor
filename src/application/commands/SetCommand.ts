import { EditCommand } from '../EditCommand.js';
import { Args } from '../Args.js';
import { SvgDocument } from '../../domain/SvgDocument.js';
export class SetCommand extends EditCommand {
  constructor(private readonly args: string[]) { super(); Args.count(args, 3); }
  apply(document: SvgDocument): string { const [id, attr, value] = this.args; const shape = document.require(id); shape.set(attr, value); return `${shape.label} updated: ${attr}=${JSON.stringify(value)}`; }
  undoMessage(before: SvgDocument): string {
    const [id, attr] = this.args;
    const shape = before.require(id);
    const value = attr === 'text' ? shape.content : shape.get(attr);
    return value === undefined ? `${shape.label} updated: ${attr} removed` : `${shape.label} updated: ${attr}=${JSON.stringify(value)}`;
  }
}
