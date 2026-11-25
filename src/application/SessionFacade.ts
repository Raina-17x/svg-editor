import { EditorSession } from './EditorSession.js';
import { SessionApi, EditOperation } from './extensions/SessionApi.js';
import { SvgDocument } from '../domain/SvgDocument.js';

export class SessionFacade implements SessionApi {
  constructor(private readonly session: EditorSession) {}
  get document(): SvgDocument {
    const document = this.snapshot();
    if (!document) throw new Error("no document. use 'init' or 'read' first");
    return document;
  }
  snapshot(): SvgDocument | undefined { return this.session.snapshot(); }
  edit(operation: EditOperation): string[] { return this.session.edit(operation); }
  init(width: number, height: number): string[] { return this.session.init(width, height); }
  read(path: string): string[] { return this.session.read(path); }
  save(path?: string): string[] { return this.session.save(path); }
  canvas(width?: number, height?: number): string[] { return this.session.canvas(width, height); }
  undo(): string[] { return this.session.undo(); }
  redo(): string[] { return this.session.redo(); }
  setAttribute(id: string, attribute: string, value: string): string[] { return this.session.setAttribute(id, attribute, value); }
  tree(id?: string): string[] { return this.session.tree(id); }
}
