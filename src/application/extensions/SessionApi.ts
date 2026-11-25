import { Shape } from '../../domain/Shape.js';
import { SvgDocument } from '../../domain/SvgDocument.js';

/** Available only during an edit; never retain this object or its shapes. */
export interface EditContext {
  readonly document: SvgDocument;
  require(id: string): Shape;
}

export interface EditOperation {
  apply(context: EditContext): string;
  undoMessage(before: SvgDocument, after: SvgDocument): string;
}

/** Public facade; getters return detached snapshots, never the live document. */
export interface SessionApi {
  readonly document: SvgDocument;
  snapshot(): SvgDocument | undefined;
  edit(operation: EditOperation): readonly string[];
  init(width: number, height: number): string[];
  read(path: string): string[];
  save(path?: string): string[];
  canvas(width?: number, height?: number): string[];
  undo(): string[];
  redo(): string[];
  setAttribute(id: string, attribute: string, value: string): string[];
  tree(id?: string): string[];
}
