import { Shape } from '../../domain/Shape.js';
import { Group } from '../../domain/Group.js';
import { Rect } from '../../domain/Rect.js';
import { Text } from '../../domain/Text.js';

export class Box extends Group {
  constructor(id: string, children: readonly Shape[]) {
    super(id);
    children.forEach(child => this.insert(child));
    this.assertValid();
  }
  override get type(): string { return 'box'; }
  override summary(): string { return `g#${this.id} ${this.styles()}`.trim(); }
  override creationSummary(): string {
    return `${this.label} created (g#${this.id} + rect#${this.id}-rect + text#${this.id}-label)`;
  }
  get fill(): string | undefined { return this.rectangle.get('fill'); }
  get title(): string { return this.titleShape.content!; }
  setFill(value: string): void { this.rectangle.set('fill', value); }
  setTitle(value: string): void { this.titleShape.set('text', value); }
  override assertCanDetach(child: Shape): void {
    if (child.id === `${this.id}-rect` || child.id === `${this.id}-label`) throw new Error(`cannot detach box component: ${child.id}`);
  }
  override assertCanUngroup(): void { throw new Error(`cannot ungroup composite shape: ${this.id}`); }
  override assertValid(): void {
    const rectangles = this.children.filter(child => child.id === `${this.id}-rect`);
    const labels = this.children.filter(child => child.id === `${this.id}-label`);
    if (rectangles.length !== 1 || !(rectangles[0] instanceof Rect) || labels.length !== 1 || !(labels[0] instanceof Text)) {
      throw new Error(`invalid box structure: ${this.id}`);
    }
  }
  override clone(): Box {
    const copy = new Box(this.id, this.children.map(child => child.clone()));
    for (const [key, value] of this.attributes) copy.set(key, value);
    return copy;
  }
  private get rectangle(): Rect { this.assertValid(); return this.children.find(child => child.id === `${this.id}-rect`) as Rect; }
  private get titleShape(): Text { this.assertValid(); return this.children.find(child => child.id === `${this.id}-label`) as Text; }
}
