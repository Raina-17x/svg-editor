import { Shape } from '../../domain/Shape.js';
import { SvgDocument } from '../../domain/SvgDocument.js';

export interface SessionChange {
  readonly reason: 'init' | 'read' | 'save' | 'resize' | 'edit' | 'undo' | 'redo';
  readonly document: SvgDocument;
}

export interface TreeLine {
  /** Undefined means the SVG root, which can also receive labels. */
  readonly shape?: Shape;
  readonly document: SvgDocument;
}

export interface TreeDecorator {
  readonly name: string;
  /** Called only after success, on detached data; state lives in this instance. */
  onChange(change: SessionChange): void;
  /** Return a suffix without surrounding whitespace; empty string means no label. */
  decorate(line: TreeLine): string;
}
