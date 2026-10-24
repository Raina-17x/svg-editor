import { EditorSession } from '../application/EditorSession.js';
import { CommandRegistry } from './CommandRegistry.js';
import { Tokenizer } from './Tokenizer.js';
export class CommandProcessor {
  constructor(private readonly session: EditorSession, private readonly registry: CommandRegistry, private readonly tokenizer = new Tokenizer()) {}
  run(line: string): string[] {
    try {
      const tokens = this.tokenizer.tokenize(line);
      return tokens.length ? this.registry.parse(tokens).execute(this.session) : [];
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return [`error: ${message.replace(/[\r\n]+/g, ' ')}`];
    }
  }
}
