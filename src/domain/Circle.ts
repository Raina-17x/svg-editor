import { Shape } from './Shape.js';
export class Circle extends Shape {
  constructor(id: string, cx = 0, cy = 0, r = 0) { super(id, { cx: 'x', cy: 'y', r: 'size' }, { cx, cy, r }); }
  get type(): string { return 'circle'; }
  protected emptyCopy(): Shape { return new Circle(this.id); }
  summary(): string { return `${this.label} cx=${this.get('cx')} cy=${this.get('cy')} r=${this.get('r')} ${this.styles()}`.trim(); }
}
