import { Shape } from './Shape.js';
export class Group extends Shape {
  private readonly nodes: Shape[] = [];
  constructor(id: string) { super(id, {}, {}); }
  get type(): string { return 'g'; }
  override get isContainer(): boolean { return true; }
  override get children(): readonly Shape[] { return [...this.nodes]; }
  protected emptyCopy(): Shape { return new Group(this.id); }
  summary(): string { return `${this.label} ${this.styles()}`.trim(); }
  insert(shape: Shape, index = this.nodes.length): void {
    if (shape === this || shape.children.some(child => this.contains(child, this))) throw new Error(`cannot move a container into its own descendant: ${shape.id}`);
    if (this.nodes.includes(shape)) throw new Error(`shape already in container: ${shape.id}`);
    this.nodes.splice(index, 0, shape);
  }
  private contains(node: Shape, target: Shape): boolean { return node === target || node.children.some(child => this.contains(child, target)); }
  remove(shape: Shape): void {
    const index = this.nodes.indexOf(shape);
    if (index < 0) throw new Error(`no such child: ${shape.id}`);
    this.nodes.splice(index, 1);
  }
  override move(dx: number, dy: number): void { for (const child of this.nodes) child.move(dx, dy); }
  override scale(factor: number): void { super.scale(factor); for (const child of this.nodes) child.scale(factor); }
  override clone(): Group {
    const copy = super.clone() as Group;
    for (const child of this.nodes) copy.insert(child.clone());
    return copy;
  }
}
