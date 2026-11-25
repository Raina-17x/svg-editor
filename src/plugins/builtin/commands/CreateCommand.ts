import { EditCommand } from '../../../application/extensions/index.js';
import { ShapeAccess } from '../../../application/extensions/index.js';
import { Args } from '../../../application/extensions/index.js';
import { SvgDocument } from '../../../domain/SvgDocument.js';
export class CreateCommand extends EditCommand {
  constructor(private readonly args: string[], private readonly factory: ShapeAccess, private readonly parent?: string) { super(); Args.count(args, 2, Infinity); }
  apply(document: SvgDocument): string {
    const [type, id, ...params] = this.args;
    if (document.has(id)) throw new Error(`id already exists: ${id}`);
    const shape = this.factory.create(type, id, params);
    document.add(shape, this.parent);
    return `${shape.creationSummary()}${this.parent === undefined ? '' : ` in g#${this.parent}`}`;
  }
  undoMessage(_before: SvgDocument, after: SvgDocument): string { return `${after.require(this.args[1]).label} deleted`; }
}
