import { ShapeProvider, ShapeReadInput, ShapeWriteOutput } from '../../src/application/extensions/index.js';
import { Shape } from '../../src/domain/Shape.js';
import { Panel } from './Panel.js';

export class PanelProvider implements ShapeProvider {
  readonly name = 'panel';
  readonly help = 'create panel <id> [in <gid>]';
  readonly svgTag = 'g';
  readonly dataKind = 'panel';
  create(id: string, args: readonly string[]): Shape {
    if (args.length) throw new Error('panel takes no geometry');
    return new Panel(id);
  }
  read(input: ShapeReadInput): Shape {
    return new Panel(input.id, input.children);
  }
  supports(shape: Shape): boolean { return shape instanceof Panel; }
  write(shape: Shape): ShapeWriteOutput {
    return { tag: 'g', attributes: { 'data-kind': 'panel', ...Object.fromEntries(shape.attributes) }, children: shape.children };
  }
}
