import { EditorSession } from '../application/EditorSession.js';
import { CommandRegistry } from './CommandRegistry.js';
import { Tokenizer } from './Tokenizer.js';
import { SessionFacade } from '../application/SessionFacade.js';
import { ShapeAccess } from '../application/extensions/ShapeAccess.js';
import { DirectoryAccess } from '../application/extensions/DirectoryAccess.js';
export class CommandProcessor {
  constructor(private readonly session: EditorSession, private readonly registry: CommandRegistry,
    private readonly shapes: ShapeAccess, private readonly directory: DirectoryAccess,
    private readonly shapeHelp: () => readonly string[], private readonly tokenizer = new Tokenizer()) {}
  run(line: string): string[] {
    try {
      const tokens = this.tokenizer.tokenize(line);
      const result = tokens.length ? this.registry.execute(tokens, {
        session: new SessionFacade(this.session), shapes: this.shapes, directory: this.directory,
        help: () => this.registry.help(this.shapeHelp())
      }) : [];
      return [...result, ...this.session.diagnostics()];
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return [`error: ${message.replace(/[\r\n]+/g, ' ')}`, ...this.session.diagnostics()];
    }
  }
}
