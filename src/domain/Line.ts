import { Shape } from './Shape.js';
export class Line extends Shape {
  constructor(id: string, x1 = 0, y1 = 0, x2 = 0, y2 = 0) { super(id, { x1: 'x', y1: 'y', x2: 'x', y2: 'y' }, { x1, y1, x2, y2 }); }
  get type(): string { return 'line'; }
  protected emptyCopy(): Shape { return new Line(this.id); }
  summary(): string { return `${this.label} (${this.get('x1')},${this.get('y1')}) -> (${this.get('x2')},${this.get('y2')}) ${this.styles()}`.trim(); }
}
