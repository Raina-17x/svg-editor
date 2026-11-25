import { Command, CommandArgument, CommandContext, ExecutableCommand } from '../../application/extensions/index.js';

export class BuiltinCommand implements Command {
  constructor(readonly name: string, readonly help: readonly string[],
    private readonly create: (args: readonly CommandArgument[], context: CommandContext) => ExecutableCommand) {}
  execute(args: readonly CommandArgument[], context: CommandContext): readonly string[] {
    return this.create(args, context).execute(context.session);
  }
}
