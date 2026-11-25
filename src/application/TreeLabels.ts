import { SvgDocument } from '../domain/SvgDocument.js';
import { TreeDecorator, SessionChange } from './extensions/TreeDecorator.js';

export class TreeLabels {
  private readonly disabled = new Set<TreeDecorator>();
  private messages: string[] = [];
  constructor(private readonly decorators: () => readonly TreeDecorator[]) {}
  notify(reason: SessionChange['reason'], document: SvgDocument): void {
    for (const decorator of this.decorators()) this.guard(decorator, () => decorator.onChange({ reason, document: document.clone() }));
  }
  suffix(document: SvgDocument, id?: string): string {
    const labels: string[] = [];
    for (const decorator of this.decorators()) this.guard(decorator, () => {
      const snapshot = document.clone();
      const label = decorator.decorate({ document: snapshot, shape: id === undefined ? undefined : snapshot.require(id) });
      if (typeof label !== 'string' || /[\r\n]/.test(label)) throw new Error('invalid tree label');
      if (label.trim()) labels.push(label.trim());
    });
    return labels.map(label => ` ${label}`).join('');
  }
  diagnostics(): string[] { const result = this.messages; this.messages = []; return result; }
  private guard(decorator: TreeDecorator, action: () => void): void {
    if (this.disabled.has(decorator)) return;
    try { action(); } catch (error) {
      this.disabled.add(decorator);
      this.messages.push(`error: tree decorator failed: ${decorator.name} (${String(error instanceof Error ? error.message : error).replace(/[\r\n]/g, ' ')})`);
    }
  }
}
