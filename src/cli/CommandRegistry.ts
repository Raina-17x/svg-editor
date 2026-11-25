import { Command, CommandArgument, CommandContext } from '../application/extensions/Command.js';

export class CommandRegistry {
  constructor(private readonly commands: () => readonly Command[]) {}
  execute(tokens: readonly CommandArgument[], context: CommandContext): string[] {
    const name = tokens[0].value;
    const command = this.commands().find(item => item.name === name);
    if (!command) throw new Error(`unknown command: ${name}`);
    const output = command.execute(tokens.slice(1).map(token => ({ value: token.value, isQuoted: token.isQuoted })), context);
    if (!Array.isArray(output) || output.some(line => typeof line !== 'string')) throw new Error(`invalid command result: ${name}`);
    return [...output];
  }
  help(shapeHelp: readonly string[]): string[] {
    const lines = this.commands().flatMap(command => [...command.help]);
    return [...lines, ...shapeHelp.filter(line => !lines.includes(line))];
  }
}
