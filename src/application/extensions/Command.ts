import { SessionApi } from './SessionApi.js';
import { DirectoryAccess } from './DirectoryAccess.js';
import { ShapeAccess } from './ShapeAccess.js';

export interface CommandArgument {
  readonly value: string;
  readonly isQuoted: boolean;
}

export interface CommandContext {
  readonly session: SessionApi;
  readonly directory: DirectoryAccess;
  readonly shapes: ShapeAccess;
  help(): readonly string[];
}

/** Public command extension contract, separate from the Phase 1 execution base. */
export interface Command {
  readonly name: string;
  readonly help: readonly string[];
  execute(args: readonly CommandArgument[], context: CommandContext): readonly string[];
}
