import { readFileSync, writeFileSync, renameSync, rmSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { DocumentStore } from '../application/DocumentStore.js';
import { SvgDocument } from '../domain/SvgDocument.js';
import { SvgCodec } from './SvgCodec.js';
export class FileDocumentStore implements DocumentStore {
  constructor(private readonly codec: SvgCodec) {}
  read(path: string): { document: SvgDocument; warnings: string[] } {
    let xml: string;
    try { xml = readFileSync(path, 'utf8'); } catch { throw new Error(`cannot read file: ${path}`); }
    return this.codec.decode(xml);
  }
  write(path: string, document: SvgDocument): void {
    const xml = this.codec.encode(document);
    const temporary = `${path}.${randomUUID()}.tmp`;
    try { writeFileSync(temporary, xml, { encoding: 'utf8', flag: 'wx' }); renameSync(temporary, path); }
    catch { throw new Error(`cannot write file: ${path}`); }
    finally {
      // A cleanup failure must not replace the required file-error message.
      try { rmSync(temporary, { force: true }); } catch { /* Best effort if filesystem access was revoked. */ }
    }
  }
}
