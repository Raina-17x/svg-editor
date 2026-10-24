import { createInterface } from 'node:readline';
import { CommandProcessor } from './CommandProcessor.js';
export class Repl {
  constructor(private readonly processor: CommandProcessor) {}
  start(): void {
    const interactive = Boolean(process.stdin.isTTY);
    const input = createInterface({ input: process.stdin, output: process.stdout, terminal: interactive, crlfDelay: Infinity });
    console.log("svg-editor 0.1 — type 'help' for commands");
    input.setPrompt('svg> ');
    if (interactive) input.prompt();
    input.on('line', line => {
      for (const output of this.processor.run(line)) console.log(output);
      if (interactive) input.prompt();
    });
  }
}
