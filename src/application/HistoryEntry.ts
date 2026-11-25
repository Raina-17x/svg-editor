import { SvgDocument } from '../domain/SvgDocument.js';
export class HistoryEntry {
  constructor(private readonly before: SvgDocument, private readonly after: SvgDocument,
    readonly undoMessage: string, readonly redoMessage: string) {}
  undo(): SvgDocument { return this.before.clone(); }
  redo(): SvgDocument { return this.after.clone(); }
}
