import { EditCommand } from '../EditCommand.js';
import { Args } from '../Args.js';
import { SvgDocument } from '../../domain/SvgDocument.js';
export class MoveCommand extends EditCommand {
  constructor(private readonly args: string[]) { super(); Args.count(args, 3); }
  apply(document: SvgDocument): string {
    const shape = document.require(this.args[0]); const [dx, dy] = Args.numbers(this.args.slice(1));
    shape.move(dx, dy);
    const position = shape.position;
    return position ? `${shape.label} moved to (${position[0]},${position[1]})` : `${shape.label} moved by (${dx},${dy})`;
  }
  undoMessage(before: SvgDocument): string {
    const shape = before.require(this.args[0]);
    const position = shape.position;
    if (position) return `${shape.label} moved back to (${position[0]},${position[1]})`;
    const [dx, dy] = Args.numbers(this.args.slice(1));
    return `${shape.label} moved back by (${-dx},${-dy})`;
  }
}
