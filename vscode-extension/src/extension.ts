import * as vscode from 'vscode';
import { SvgDecorationProvider } from './SvgDecorationProvider';

export function activate(context: vscode.ExtensionContext): void {
  const provider = new SvgDecorationProvider();
  context.subscriptions.push(
    provider,
    vscode.window.registerFileDecorationProvider(provider)
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
