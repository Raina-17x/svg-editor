import { ShapeProvider, ShapeReadInput, ShapeWriteOutput, Args } from '../../application/extensions/index.js';
import { Shape } from '../../domain/Shape.js';
import { Rect } from '../../domain/Rect.js';
import { Text } from '../../domain/Text.js';
import { Box } from './Box.js';

export class BoxProvider implements ShapeProvider {
  readonly name = 'box';
  readonly help = 'create box <id> <x> <y> <w> <h> "title" [in <gid>]';
  readonly svgTag = 'g';
  readonly dataKind = 'box';
  create(id: string, args: readonly string[]): Box {
    Args.count(args, 5);
    const [x, y, width, height] = Args.numbers([...args.slice(0, 4)]);
    const rectangle = new Rect(`${id}-rect`, x, y, width, height);
    rectangle.set('fill', '#4a90d9');
    return new Box(id, [rectangle, new Text(`${id}-label`, x + 20, y + 35, args[4])]);
  }
  read(input: ShapeReadInput): Box {
    if (input.tag !== this.svgTag || input.attributes['data-kind'] !== this.dataKind || input.content.trim()) {
      throw new Error(`invalid box encoding: ${input.id}`);
    }
    const box = new Box(input.id, input.children);
    for (const [key, value] of Object.entries(input.attributes)) {
      if (key !== 'id' && key !== 'data-kind') box.set(key, value);
    }
    return box;
  }
  supports(shape: Shape): boolean { return shape instanceof Box; }
  write(shape: Shape): ShapeWriteOutput {
    if (!(shape instanceof Box)) throw new Error(`not a box: ${shape.id}`);
    shape.assertValid();
    return { tag: 'g', attributes: { ...Object.fromEntries(shape.attributes), 'data-kind': 'box' }, children: shape.children };
  }
}
