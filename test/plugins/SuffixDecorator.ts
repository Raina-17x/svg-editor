import { TreeDecorator, SessionChange, TreeLine } from '../../src/application/extensions/index.js';

export class SuffixDecorator implements TreeDecorator {
  private readonly events: string[] = [];
  constructor(readonly name: string, private readonly suffix: string, private readonly fail = false) {}
  get reasons(): readonly string[] { return [...this.events]; }
  onChange(change: SessionChange): void {
    this.events.push(change.reason);
    // Mutating the supplied snapshot must not leak into the session or peers.
    change.document.resize(1, 1);
  }
  decorate(line: TreeLine): string {
    if (this.fail) throw new Error('injected label failure');
    return line.document.width === 1 ? 'leaked snapshot' : this.suffix;
  }
}
