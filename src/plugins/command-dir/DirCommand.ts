import { Command, CommandArgument, CommandContext, Args, DirectoryEntry } from '../../application/extensions/index.js';

export class DirCommand implements Command {
  readonly name = 'dir';
  readonly help = ['dir — list the process working directory'];
  execute(args: readonly CommandArgument[], context: CommandContext): readonly string[] {
    Args.count(args, 0);
    const path = context.directory.cwd;
    let entries: readonly DirectoryEntry[];
    try { entries = context.directory.list(path); }
    catch { return [`error: cannot read directory: ${path}`]; }
    const rank = { directory: 0, file: 1, other: 2 };
    const markers = { directory: '[DIR]', file: '[FILE]', other: '[OTHER]' };
    const sorted = entries.filter(entry => entry.name !== '.' && entry.name !== '..').sort((a, b) =>
      rank[a.kind] - rank[b.kind] || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
    return sorted.length ? sorted.map(entry => `${markers[entry.kind]}  ${entry.name}`) : ['(empty directory)'];
  }
}
