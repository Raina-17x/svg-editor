import { SvgDocument } from '../domain/SvgDocument.js';
import { Shape } from '../domain/Shape.js';
import { TreeLabels } from './TreeLabels.js';

export class TreeRenderer {
  constructor(private readonly labels: TreeLabels) {}
  render(document: SvgDocument, id?: string): string[] {
    const lines: string[] = [];
    const visit = (nodes: readonly Shape[], prefix: string): void => {
      nodes.forEach((node, index) => {
        const last = index === nodes.length - 1;
        lines.push(`${prefix}${last ? '└── ' : '├── '}${node.summary()}${this.labels.suffix(document, node.id)}`);
        visit(node.children, `${prefix}${last ? '    ' : '│   '}`);
      });
    };
    if (id !== undefined) {
      const root = document.require(id);
      lines.push(root.summary() + this.labels.suffix(document, id)); visit(root.children, '');
    } else {
      lines.push(`svg (${document.width}x${document.height})${this.labels.suffix(document)}`); visit(document.children, '');
    }
    return lines;
  }
}
