import { ShapeProvider, ShapeReadInput, ShapeWriteOutput } from '../../application/extensions/index.js';
import { Shape } from '../../domain/Shape.js';

/** A class instance per builtin shape, registered through the same extension API. */
export class BuiltinShapeProvider implements ShapeProvider {
  readonly svgTag: string;
  constructor(readonly name: string, readonly help: string, private readonly count: number,
    private readonly make: (id: string, args: readonly string[]) => Shape,
    private readonly shapeClass: Shape['constructor'], private readonly style?: string) {
    this.svgTag = name;
  }
  create(id: string, args: readonly string[]): Shape {
    if (args.length < this.count || args.length > this.count + (this.style ? 1 : 0)) {
      throw new Error(`invalid parameters for ${this.name}; type 'help' for syntax`);
    }
    const shape = this.make(id, args);
    if (this.style && args.length > this.count) shape.set(this.style, args[this.count]);
    return shape;
  }
  read(input: ShapeReadInput): Shape {
    const shape = this.make(input.id, Array<string>(this.count).fill('0'));
    for (const [key, value] of Object.entries(input.attributes)) {
      if (key === 'id' || (shape.isContainer && key === 'data-kind')) continue;
      shape.set(key, value);
    }
    if (shape.content !== undefined) shape.set('text', input.content);
    if (shape.isContainer && input.content.trim()) throw new Error('invalid SVG: unexpected text outside text element');
    if (!shape.isContainer && input.children.length) throw new Error(`unsupported nested element inside ${input.tag}`);
    if (!shape.isContainer && shape.content === undefined && input.content.trim()) throw new Error(`invalid SVG: unexpected text inside ${input.tag}`);
    for (const child of input.children) shape.insert(child);
    return shape;
  }
  supports(shape: Shape): boolean { return shape.constructor === this.shapeClass; }
  write(shape: Shape): ShapeWriteOutput {
    return { tag: this.svgTag, attributes: Object.fromEntries(shape.attributes), content: shape.content, children: shape.children };
  }
}
