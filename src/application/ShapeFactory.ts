import { Shape } from '../domain/Shape.js';
import { Rect } from '../domain/Rect.js';
import { Circle } from '../domain/Circle.js';
import { Ellipse } from '../domain/Ellipse.js';
import { Line } from '../domain/Line.js';
import { Text } from '../domain/Text.js';
import { Group } from '../domain/Group.js';
import { Value } from '../domain/Value.js';

export class ShapeFactory {
  // The only dispatch by shape type. Plugin registration is deferred to Phase 2.
  private readonly providers = new Map<string, { count: number; style?: string; make: (id: string, args: string[]) => Shape }>([
    ['rect', { count: 4, style: 'fill', make: (id, a) => new Rect(id, Value.number(a[0]), Value.number(a[1]), Value.number(a[2]), Value.number(a[3])) }],
    ['circle', { count: 3, style: 'fill', make: (id, a) => new Circle(id, Value.number(a[0]), Value.number(a[1]), Value.number(a[2])) }],
    ['ellipse', { count: 4, style: 'fill', make: (id, a) => new Ellipse(id, Value.number(a[0]), Value.number(a[1]), Value.number(a[2]), Value.number(a[3])) }],
    ['line', { count: 4, style: 'stroke', make: (id, a) => new Line(id, Value.number(a[0]), Value.number(a[1]), Value.number(a[2]), Value.number(a[3])) }],
    ['text', { count: 3, make: (id, a) => new Text(id, Value.number(a[0]), Value.number(a[1]), a[2]) }],
    ['g', { count: 0, make: id => new Group(id) }],
  ]);
  private provider(type: string) {
    const provider = this.providers.get(type);
    if (!provider) throw new Error(`unknown shape type: ${type} (is the plugin loaded?)`);
    return provider;
  }
  create(type: string, id: string, args: string[]): Shape {
    const provider = this.provider(type);
    if (args.length < provider.count || args.length > provider.count + (provider.style ? 1 : 0)) {
      throw new Error(`invalid parameters for ${type}; type 'help' for syntax`);
    }
    const shape = provider.make(id, args);
    if (provider.style && args.length > provider.count) shape.set(provider.style, args[provider.count]);
    return shape;
  }
  fromSvg(type: string, id: string, attributes: Record<string, string>, content: string): Shape {
    const provider = this.provider(type);
    const args = Array<string>(provider.count).fill('0');
    const shape = provider.make(id, args);
    for (const [key, value] of Object.entries(attributes)) {
      if (key === 'id' || (shape.isContainer && key === 'data-kind')) continue;
      shape.set(key, value);
    }
    if (shape.content !== undefined) shape.set('text', content);
    return shape;
  }
}
