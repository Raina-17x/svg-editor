import { EditorSession } from './EditorSession.js';
export abstract class Command {
  abstract execute(session: EditorSession): string[];
}
