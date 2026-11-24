import * as vscode from 'vscode';

export class SvgDecorationProvider
implements vscode.FileDecorationProvider, vscode.Disposable {
  private readonly changes = new vscode.EventEmitter<vscode.Uri>();
  readonly onDidChangeFileDecorations = this.changes.event;

  async provideFileDecoration(
    uri: vscode.Uri,
    token: vscode.CancellationToken
  ): Promise<vscode.FileDecoration | undefined> {
    if (!uri.path.toLowerCase().endsWith('.svg') || token.isCancellationRequested) {
      return undefined;
    }

    try {
      const stat = await vscode.workspace.fs.stat(uri);
      if (token.isCancellationRequested || (stat.type & vscode.FileType.File) === 0) {
        return undefined;
      }

      const decoration = new vscode.FileDecoration('[]', 'SVG file');
      decoration.propagate = false;
      return decoration;
    } catch {
      // A removed or inaccessible file must not break the Explorer.
      return undefined;
    }
  }

  refresh(uri: vscode.Uri): void {
    if (uri.path.toLowerCase().endsWith('.svg')) this.changes.fire(uri);
  }

  dispose(): void {
    this.changes.dispose();
  }
}
