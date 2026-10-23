import { Shape } from './Shape.js';
export class Ellipse extends Shape {
  constructor(id: string, cx = 0, cy = 0, rx = 0, ry = 0) { super(id, { cx: 'x', cy: 'y', rx: 'size', ry: 'size' }, { cx, cy, rx, ry }); }
  get type(): string { return 'ellipse'; }
  protected emptyCopy(): Shape { return new Ellipse(this.id); }
  summary(): string { return `${this.label} cx=${this.get('cx')} cy=${this.get('cy')} rx=${this.get('rx')} ry=${this.get('ry')} ${this.styles()}`.trim(); }
}
