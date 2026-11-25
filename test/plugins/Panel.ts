import { Shape } from '../../src/domain/Shape.js';
import { Rect } from '../../src/domain/Rect.js';
import { Text } from '../../src/domain/Text.js';

/** Test composite deliberately does not inherit Group. */
export class Panel extends Shape {
  private readonly nodes: Shape[];
  constructor(id: string, children?: readonly Shape[]) {
    super(id, {}, {});
    this.nodes = children ? [...children] : [new Rect(`${id}-rect`, 0, 0, 10, 10), new Text(`${id}-text`, 1, 2, 'title')];
    this.assertValid();
  }
  get type(): string { return 'panel'; }
  override get isContainer(): boolean { return true; }
  override get children(): readonly Shape[] { return [...this.nodes]; }
  protected emptyCopy(): Shape { return new Panel(this.id); }
  summary(): string { return `g#${this.id}`; }
  override insert(shape: Shape, index = this.nodes.length): void { this.nodes.splice(index, 0, shape); }
  override remove(shape: Shape): void {
    this.assertCanDetach(shape);
    const index = this.nodes.indexOf(shape);
    if (index < 0) throw new Error('no such panel child');
    this.nodes.splice(index, 1);
  }
  override assertCanDetach(child: Shape): void {
    if ([`${this.id}-rect`, `${this.id}-text`].includes(child.id)) throw new Error(`protected component: ${child.id}`);
  }
  override assertValid(): void {
    if (!(this.nodes.find(child => child.id === `${this.id}-rect`) instanceof Rect) ||
        !(this.nodes.find(child => child.id === `${this.id}-text`) instanceof Text)) throw new Error(`invalid panel: ${this.id}`);
  }
  override move(dx: number, dy: number): void { this.nodes.forEach(child => child.move(dx, dy)); }
  override scale(factor: number): void { super.scale(factor); this.nodes.forEach(child => child.scale(factor)); }
  override clone(): Panel {
    const copy = new Panel(this.id, this.nodes.map(child => child.clone()));
    for (const [key, value] of this.attributes) copy.set(key, value);
    return copy;
  }
}
