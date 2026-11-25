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
  snapshot(): SvgDocument | undefined;
  edit(operation: EditOperation): readonly string[];
  init(width: number, height: number): readonly string[];
  read(path: string): readonly string[];
  save(path?: string): readonly string[];
  canvas(width?: number, height?: number): readonly string[];
  undo(): readonly string[];
  redo(): readonly string[];
}
