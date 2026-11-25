export interface DirectoryEntry {
  readonly name: string;
  readonly kind: 'directory' | 'file' | 'other';
}

/** Adapter target interface. No node:fs or process dependency in command logic. */
export interface DirectoryAccess {
  readonly cwd: string;
  list(path: string): readonly DirectoryEntry[];
}
