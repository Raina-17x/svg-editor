import { ExecutableCommand as Command } from '../../../application/extensions/index.js';
import { SessionApi } from '../../../application/extensions/index.js';
import { Args } from '../../../application/extensions/index.js';
export class ShowCommand extends Command {
  constructor(private readonly args: string[]) { super(); Args.count(args, 1); }
  execute(session: SessionApi): string[] {
    const document = session.document;
    const shape = document.require(this.args[0]);
    const result = [`${shape.label} parent=${document.parentLabel(shape)}`];
    for (const [key, value] of shape.attributes) result.push(`  ${key}=${value}`);
    if (shape.content !== undefined) result.push(`  text=${JSON.stringify(shape.content)}`);
    return result;
  }
}
