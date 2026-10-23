import { Shape } from './Shape.js';
export class Rect extends Shape {
  constructor(id: string, x = 0, y = 0, width = 0, height = 0) {
    super(id, { x: 'x', y: 'y', width: 'size', height: 'size' }, { x, y, width, height });
  }
  get type(): string { return 'rect'; }
  protected emptyCopy(): Shape { return new Rect(this.id); }
  summary(): string { return `${this.label} x=${this.get('x')} y=${this.get('y')} w=${this.get('width')} h=${this.get('height')} ${this.styles()}`.trim(); }
}
