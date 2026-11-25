import { SessionApi } from './extensions/SessionApi.js';
export abstract class Command {
  abstract execute(session: SessionApi): readonly string[];
}
