import { SvgDocument } from '../domain/SvgDocument.js';
import { DocumentStore } from './DocumentStore.js';
import { HistoryEntry } from './HistoryEntry.js';
import { EditOperation } from './extensions/SessionApi.js';
import { AttributeService } from './AttributeService.js';
import { TreeLabels } from './TreeLabels.js';
import { TreeRenderer } from './TreeRenderer.js';

export class EditorSession {
  private current?: SvgDocument;
  private path?: string;
  private undoStack: HistoryEntry[] = [];
  private redoStack: HistoryEntry[] = [];
  private ioBarrier = true;
  constructor(private readonly store: DocumentStore,
    private readonly attributes = new AttributeService(() => []),
    private readonly labels = new TreeLabels(() => [])) {}
  get document(): SvgDocument {
    if (!this.current) throw new Error("no document. use 'init' or 'read' first");
    return this.current;
  }
  snapshot(): SvgDocument | undefined { return this.current?.clone(); }
  diagnostics(): string[] { return this.labels.diagnostics(); }
  tree(id?: string): string[] { return new TreeRenderer(this.labels).render(this.document, id); }
  private barrier(): void { this.undoStack = []; this.redoStack = []; this.ioBarrier = true; }
  init(width: number, height: number): string[] {
    const document = new SvgDocument(width, height);
    this.current = document; this.path = undefined; this.barrier();
    this.labels.notify('init', document);
    return [`canvas ${width}x${height} created`];
  }
  read(path: string): string[] {
    const result = this.store.read(path);
    result.document.validate();
    const current = result.document.clone();
    this.current = current; this.path = path; this.barrier();
    this.labels.notify('read', current);
    return [...result.warnings, `read ${path} (${current.all().length} elements)`];
  }
  save(path?: string): string[] {
    const document = this.document;
    const target = path ?? this.path;
    if (!target) throw new Error('no file path. use save <file.svg>');
    document.validate();
    this.store.write(target, document.clone());
    this.path = target; this.barrier(); this.labels.notify('save', document);
    return [`saved to ${target} (${document.all().length} elements)`];
  }
  canvas(width?: number, height?: number): string[] {
    let document = this.document;
    if (width !== undefined && height !== undefined) {
      document = document.clone(); document.resize(width, height); document.validate();
      this.current = document; this.barrier(); this.labels.notify('resize', document);
    }
    return [`canvas ${document.width}x${document.height}`];
  }
  edit(operation: EditOperation): string[] {
    const before = this.document.clone();
    const working = before.clone();
    const result = operation.apply({ document: working, require: id => working.require(id) });
    if (typeof result !== 'string') throw new Error('invalid edit result');
    working.validate();
    const after = working.clone();
    const undoMessage = operation.undoMessage(before.clone(), after.clone());
    if (typeof undoMessage !== 'string') throw new Error('invalid undo feedback');
    const current = after.clone();
    // All plugin callbacks, validation and clones succeed before changing state.
    const entry = new HistoryEntry(before, after, undoMessage, result);
    this.current = current; this.undoStack.push(entry); this.redoStack = []; this.ioBarrier = false;
    this.labels.notify('edit', current);
    return [result];
  }
  setAttribute(id: string, attribute: string, value: string): string[] {
    let undoMessage = '';
    return this.edit({
      apply: context => {
        const result = this.attributes.apply(context, id, attribute, value);
        undoMessage = result.undoMessage; return result.message;
      },
      undoMessage: () => undoMessage
    });
  }
  undo(): string[] {
    this.document;
    if (this.ioBarrier) throw new Error('undo not allowed after io command');
    const entry = this.undoStack.at(-1);
    if (!entry) throw new Error('nothing to undo');
    const current = entry.undo();
    this.current = current; this.undoStack.pop(); this.redoStack.push(entry); this.labels.notify('undo', current);
    return [entry.undoMessage];
  }
  redo(): string[] {
    this.document;
    if (this.ioBarrier) throw new Error('undo not allowed after io command');
    const entry = this.redoStack.at(-1);
    if (!entry) throw new Error('nothing to redo');
    const current = entry.redo();
    this.current = current; this.redoStack.pop(); this.undoStack.push(entry); this.labels.notify('redo', current);
    return [entry.redoMessage];
  }
}
