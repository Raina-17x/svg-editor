import { Value } from '../domain/Value.js';
export class Args {
  static count(args: readonly unknown[], min: number, max = min): void {
    if (args.length < min || args.length > max) throw new Error("invalid arguments; type 'help' for syntax");
  }
  static numbers(args: string[]): number[] { return args.map(value => Value.number(value)); }
}
