import { Group } from './Group.js';
import { Shape } from './Shape.js';
import { Value } from './Value.js';

export class SvgDocument {
  private canvasWidth: number;
  private canvasHeight: number;
  private rootNode = new Group('__canvas__');
  constructor(width = 800, height = 600) {
    this.canvasWidth = Value.positive(width, 'canvas width');
    this.canvasHeight = Value.positive(height, 'canvas height');
  }
  get width(): number { return this.canvasWidth; }
  get height(): number { return this.canvasHeight; }
  get children(): readonly Shape[] { return this.rootNode.children; }
  resize(width: number, height: number): void {
    const w = Value.positive(width, 'canvas width');
    const h = Value.positive(height, 'canvas height');
    this.canvasWidth = w; this.canvasHeight = h;
  }
  all(): Shape[] {
    const walk = (nodes: readonly Shape[]): Shape[] => nodes.flatMap(node => [node, ...walk(node.children)]);
    return walk(this.children);
  }
  has(id: string): boolean { return this.all().some(shape => shape.id === id); }
  require(id: string): Shape {
    const shape = this.all().find(shape => shape.id === id);
    if (!shape) throw new Error(`no such shape: ${id}`);
    return shape;
  }
  container(id?: string): Group {
    if (id === undefined) return this.rootNode;
    if (!this.has(id)) throw new Error(`no such container: ${id}`);
    const shape = this.require(id);
    if (!(shape instanceof Group)) throw new Error(`not a container: ${id}`);
    return shape;
  }
  parent(shape: Shape): Group {
    const parent = [this.rootNode, ...this.all().filter(node => node instanceof Group)]
      .find(node => node.children.includes(shape));
    if (!parent) throw new Error(`no parent for shape: ${shape.id}`);
    return parent;
  }
  parentLabel(shape: Shape): string { const p = this.parent(shape); return p === this.rootNode ? 'svg' : p.label; }
  add(shape: Shape, parentId?: string): void {
    const candidates = [shape];
    const collect = (node: Shape): void => { for (const child of node.children) { candidates.push(child); collect(child); } };
    collect(shape);
    const ids = new Set(this.all().map(node => node.id));
    for (const node of candidates) {
      if (ids.has(node.id)) throw new Error(`id already exists: ${node.id}`);
      ids.add(node.id);
    }
    this.container(parentId).insert(shape);
  }
  delete(id: string): void { const shape = this.require(id); this.parent(shape).remove(shape); }
  group(id: string, ids: string[]): void {
    if (this.has(id)) throw new Error(`id already exists: ${id}`);
    if (new Set(ids).size !== ids.length) throw new Error('duplicate group member');
    const requested = ids.map(member => this.require(member));
    for (const candidate of requested) {
      const descendants = (node: Shape): boolean => node.children.some(child => requested.includes(child) || descendants(child));
      if (descendants(candidate)) throw new Error(`cannot group a container into its own descendant: ${candidate.id}`);
    }
    // Preserve document traversal order, even when CLI arguments are reversed.
    const ordered = this.all().filter(shape => requested.includes(shape));
    const group = new Group(id);
    for (const shape of ordered) { this.parent(shape).remove(shape); group.insert(shape); }
    this.rootNode.insert(group);
  }
  ungroup(id: string): void {
    const group = this.container(id);
    const parent = this.parent(group);
    if (parent === this.rootNode) throw new Error(`cannot ungroup top-level container: ${id}`);
    const position = parent.children.indexOf(group);
    const children = [...group.children];
    parent.remove(group);
    children.forEach((child, offset) => { group.remove(child); parent.insert(child, position + offset); });
  }
  addto(gid: string, id: string): void {
    const target = this.container(gid);
    const shape = this.require(id);
    const includes = (node: Shape): boolean => node === target || node.children.some(includes);
    if (includes(shape)) throw new Error(`cannot move a container into its own descendant: ${id}`);
    this.parent(shape).remove(shape); target.insert(shape);
  }
  reorder(id: string, front: boolean): void {
    const shape = this.require(id); const parent = this.parent(shape);
    parent.remove(shape); parent.insert(shape, front ? parent.children.length : 0);
  }
  clone(): SvgDocument {
    const copy = new SvgDocument(this.width, this.height); copy.rootNode = this.rootNode.clone(); return copy;
  }
}
