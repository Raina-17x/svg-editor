import { TreeDecorator, TreeLine, SessionChange } from '../../application/extensions/index.js';
import { Shape } from '../../domain/Shape.js';
import { SvgDocument } from '../../domain/SvgDocument.js';

/** Content comparison against the last successful init/read/save, per instance. */
export class ModifiedStarDecorator implements TreeDecorator {
  readonly name = 'modified-star';
  private savedNodes = new Map<string, string>();
  private savedRoot?: string;

  onChange(change: SessionChange): void {
    if (change.reason !== 'init' && change.reason !== 'read' && change.reason !== 'save') return;
    const nodes = new Map<string, string>();
    for (const shape of change.document.all()) nodes.set(shape.id, JSON.stringify(this.nodeContent(shape)));
    this.savedNodes = nodes;
    this.savedRoot = this.rootContent(change.document);
  }

  decorate(line: TreeLine): string {
    // Activation is required before init/read; don't invent a save point on render.
    if (this.savedRoot === undefined) return '';
    const matches = line.shape
      ? this.savedNodes.get(line.shape.id) === JSON.stringify(this.nodeContent(line.shape))
      : this.savedRoot === this.rootContent(line.document);
    return matches ? '' : '*';
  }

  private nodeContent(shape: Shape): unknown[] {
    const attributes = [...shape.attributes].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0);
    return [shape.id, shape.type, shape.isContainer, attributes, shape.content ?? null,
      shape.children.map(child => this.nodeContent(child))];
  }

  private rootContent(document: SvgDocument): string {
    return JSON.stringify([document.width, document.height, document.children.map(child => this.nodeContent(child))]);
  }
}
