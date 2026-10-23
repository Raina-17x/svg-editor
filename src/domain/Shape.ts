import { Value } from './Value.js';

export abstract class Shape {
  private readonly values = new Map<string, string>();
  private readonly geometry: Readonly<Record<string, 'x' | 'y' | 'size'>>;
  private readonly identifier: string;

  protected constructor(id: string, geometry: Readonly<Record<string, 'x' | 'y' | 'size'>>, values: Record<string, string | number>) {
    this.identifier = Value.id(id);
    this.geometry = geometry;
    for (const [key, value] of Object.entries(values)) this.set(key, String(value));
  }

  abstract get type(): string;
  protected abstract emptyCopy(): Shape;
  abstract summary(): string;
  get id(): string { return this.identifier; }
  get label(): string { return `${this.type}#${this.id}`; }
  get isContainer(): boolean { return false; }
  get children(): readonly Shape[] { return []; }
  get content(): string | undefined { return undefined; }
  get position(): readonly [number, number] | undefined {
    const axes = Object.entries(this.geometry);
    const x = axes.find(([, axis]) => axis === 'x')?.[0];
    const y = axes.find(([, axis]) => axis === 'y')?.[0];
    return x !== undefined && y !== undefined ? [this.n(x), this.n(y)] : undefined;
  }
  get attributes(): ReadonlyMap<string, string> { return new Map(this.values); }
  get(name: string): string | undefined { return this.values.get(name); }
  protected n(name: string): number { return Number(this.values.get(name)); }
  protected styles(): string {
    return ['fill', 'stroke', 'stroke-width'].filter(key => this.values.has(key))
      .map(key => `${key}=${this.values.get(key)}`).join(' ');
  }

  set(name: string, value: string): void {
    if (Object.hasOwn(this.geometry, name) || name === 'stroke-width') {
      const number = Value.number(value);
      if ((this.geometry[name] === 'size' || name === 'stroke-width') && number < 0) {
        throw new Error(`${name} must be non-negative`);
      }
      this.values.set(name, String(number));
    } else if (name === 'fill' || name === 'stroke') {
      if (!value.trim()) throw new Error(`${name} must not be empty`);
      this.values.set(name, Value.xmlText(value));
    } else throw new Error(`unknown attribute: ${name}`);
  }

  move(dx: number, dy: number): void {
    for (const [key, axis] of Object.entries(this.geometry)) {
      if (axis !== 'size') this.set(key, String(this.n(key) + (axis === 'x' ? dx : dy)));
    }
  }

  scale(factor: number): void {
    Value.positive(factor, 'scale factor');
    for (const key of Object.keys(this.geometry)) this.set(key, String(this.n(key) * factor));
  }

  clone(): Shape {
    const copy = this.emptyCopy();
    for (const [key, value] of this.values) copy.set(key, value);
    return copy;
  }
}
