import { SvgDocument } from '../domain/SvgDocument.js';
import { DocumentStore } from './DocumentStore.js';
import { EditCommand } from './EditCommand.js';
import { HistoryEntry } from './HistoryEntry.js';

export class EditorSession {
  private current?: SvgDocument;
  private path?: string;
  private undoStack: HistoryEntry[] = [];
  private redoStack: HistoryEntry[] = [];
  private ioBarrier = true;
  constructor(private readonly store: DocumentStore) {}
  get document(): SvgDocument {
    if (!this.current) throw new Error("no document. use 'init' or 'read' first");
    return this.current;
  }
  private barrier(): void { this.undoStack = []; this.redoStack = []; this.ioBarrier = true; }
  init(width: number, height: number): string[] {
    const document = new SvgDocument(width, height);
    this.current = document; this.path = undefined; this.barrier();
    return [`canvas ${width}x${height} created`];
  }
  read(path: string): string[] {
    const result = this.store.read(path);
    this.current = result.document; this.path = path; this.barrier();
    return [...result.warnings, `read ${path} (${this.document.all().length} elements)`];
  }
  save(path?: string): string[] {
    const document = this.document;
    const target = path ?? this.path;
    if (!target) throw new Error('no file path. use save <file.svg>');
    this.store.write(target, document);
    this.path = target; this.barrier();
    return [`saved to ${target} (${document.all().length} elements)`];
  }
  canvas(width?: number, height?: number): string[] {
    const document = this.document;
    if (width !== undefined && height !== undefined) { document.resize(width, height); this.barrier(); }
    return [`canvas ${document.width}x${document.height}`];
  }
  edit(command: EditCommand): string[] {
    const before = this.document;
    const working = before.clone();
    // Commit only after the complete operation succeeds; errors preserve both stacks.
    const result = command.apply(working);
    this.undoStack.push(new HistoryEntry(command, before.clone(), working.clone(), result));
    this.current = working; this.redoStack = []; this.ioBarrier = false;
    return [result];
  }
  undo(): string[] {
    this.document;
    if (this.ioBarrier) throw new Error('undo not allowed after io command');
    const entry = this.undoStack.at(-1);
    if (!entry) throw new Error('nothing to undo');
    this.current = entry.undo(); this.undoStack.pop(); this.redoStack.push(entry);
    return [entry.undoMessage];
  }
  redo(): string[] {
    this.document;
    if (this.ioBarrier) throw new Error('undo not allowed after io command');
    const entry = this.redoStack.at(-1);
    if (!entry) throw new Error('nothing to redo');
    this.current = entry.redo(); this.redoStack.pop(); this.undoStack.push(entry);
    return [entry.redoMessage];
  }
}
