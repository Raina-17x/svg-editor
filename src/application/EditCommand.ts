import { SvgDocument } from '../domain/SvgDocument.js';
import { Command } from './Command.js';
import { EditorSession } from './EditorSession.js';
export abstract class EditCommand extends Command {
  execute(session: EditorSession): string[] { return session.edit(this); }
  abstract apply(document: SvgDocument): string;
  abstract undoMessage(before: SvgDocument, after: SvgDocument): string;
}
