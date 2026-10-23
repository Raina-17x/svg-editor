import { Shape } from './Shape.js';
import { Value } from './Value.js';
export class Text extends Shape {
  private text: string;
  constructor(id: string, x = 0, y = 0, text = '') { super(id, { x: 'x', y: 'y' }, { x, y }); this.text = Value.xmlText(text); }
  get type(): string { return 'text'; }
  override get content(): string { return this.text; }
  protected emptyCopy(): Shape { return new Text(this.id, 0, 0, this.text); }
  override set(name: string, value: string): void {
    if (name === 'text') this.text = Value.xmlText(value);
    else super.set(name, value);
  }
  summary(): string { return `${this.label} (${this.get('x')},${this.get('y')}) ${JSON.stringify(this.text)} ${this.styles()}`.trim(); }
}
