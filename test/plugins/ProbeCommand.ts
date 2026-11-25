import { Command, CommandArgument, CommandContext } from '../../src/application/extensions/index.js';

export class ProbeCommand implements Command {
  readonly name = 'probe';
  readonly help = ['probe <value>'];
  execute(args: readonly CommandArgument[], context: CommandContext): readonly string[] {
    context.session.snapshot()?.resize(1, 1);
    return args.map(arg => `${arg.value}:${arg.isQuoted}`);
  }
}
