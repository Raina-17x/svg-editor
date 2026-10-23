import { SvgDocument } from '../domain/SvgDocument.js';
import { EditCommand } from './EditCommand.js';
export class HistoryEntry {
  constructor(private readonly command: EditCommand, private readonly before: SvgDocument, private readonly after: SvgDocument, private readonly result: string) {}
  undo(): SvgDocument { return this.before.clone(); }
  redo(): SvgDocument { return this.after.clone(); }
  get undoMessage(): string { return this.command.undoMessage(this.before, this.after); }
  get redoMessage(): string { return this.result; }
}
