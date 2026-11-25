import { SvgDocument } from '../domain/SvgDocument.js';
import { Command } from './Command.js';
import { SessionApi } from './extensions/SessionApi.js';
export abstract class EditCommand extends Command {
  execute(session: SessionApi): readonly string[] {
    return session.edit({
      apply: context => this.apply(context.document),
      undoMessage: (before, after) => this.undoMessage(before, after)
    });
  }
  abstract apply(document: SvgDocument): string;
  abstract undoMessage(before: SvgDocument, after: SvgDocument): string;
}
