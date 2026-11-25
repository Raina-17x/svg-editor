import { Command, CommandArgument, CommandContext, Args } from '../../application/extensions/index.js';

export class StatsCommand implements Command {
  readonly name = 'stats';
  readonly help = ['stats — count leaves by type and containers'];
  execute(args: readonly CommandArgument[], context: CommandContext): readonly string[] {
    Args.count(args, 0);
    const document = context.session.snapshot();
    if (!document) throw new Error("no document. use 'init' or 'read' first");
    const counts = new Map<string, number>();
    let total = 0; let containers = 0;
    const pending = [...document.children].reverse();
    while (pending.length) {
      const shape = pending.pop()!;
      if (shape.isContainer) containers++;
      else { counts.set(shape.type, (counts.get(shape.type) ?? 0) + 1); total++; }
      pending.push(...[...shape.children].reverse());
    }
    const details = [...counts].map(([type, count]) => `${type}: ${count}`).join('  ');
    return [`${details ? details + '  ' : ''}(total ${total}, containers ${containers})`];
  }
}
