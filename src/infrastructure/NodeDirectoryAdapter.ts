import { readdirSync } from 'node:fs';
import { DirectoryAccess, DirectoryEntry } from '../application/extensions/DirectoryAccess.js';

export class NodeDirectoryAdapter implements DirectoryAccess {
  get cwd(): string { return process.cwd(); }
  list(path: string): DirectoryEntry[] {
    return readdirSync(path, { withFileTypes: true }).map(entry => ({
      name: entry.name, kind: entry.isDirectory() ? 'directory' : entry.isFile() ? 'file' : 'other'
    }));
  }
}
