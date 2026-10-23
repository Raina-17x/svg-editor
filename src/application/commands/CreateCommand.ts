import { EditCommand } from '../EditCommand.js';
import { ShapeFactory } from '../ShapeFactory.js';
import { Args } from '../Args.js';
import { SvgDocument } from '../../domain/SvgDocument.js';
export class CreateCommand extends EditCommand {
  constructor(private readonly args: string[], private readonly factory: ShapeFactory, private readonly parent?: string) { super(); Args.count(args, 2, Infinity); }
  apply(document: SvgDocument): string {
    const [type, id, ...params] = this.args;
    if (document.has(id)) throw new Error(`id already exists: ${id}`);
    const shape = this.factory.create(type, id, params);
    document.add(shape, this.parent);
    return `${shape.label} created${this.parent === undefined ? '' : ` in g#${this.parent}`}`;
  }
  undoMessage(_before: SvgDocument, after: SvgDocument): string { return `${after.require(this.args[1]).label} deleted`; }
}
