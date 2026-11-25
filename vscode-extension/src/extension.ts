import * as vscode from 'vscode';
import { SvgDecorationProvider } from './SvgDecorationProvider';
import { SvgOutlineProvider } from './SvgOutlineProvider';

export function activate(context: vscode.ExtensionContext): void {
  const provider = new SvgDecorationProvider();
  context.subscriptions.push(
    provider,
    vscode.window.registerFileDecorationProvider(provider),
    vscode.languages.registerDocumentSymbolProvider(
      { scheme: 'file', pattern: '**/*.[sS][vV][gG]' },
      new SvgOutlineProvider(),
      { label: 'SVG Phase 2 Outline' }
    )
  );

  // Refresh when a file is replaced, created, removed, or renamed externally.
  const watcher = vscode.workspace.createFileSystemWatcher('**/*');
  context.subscriptions.push(
    watcher,
    watcher.onDidCreate(uri => provider.refresh(uri)),
    watcher.onDidDelete(uri => provider.refresh(uri)),
    watcher.onDidChange(uri => provider.refresh(uri))
  );
}
