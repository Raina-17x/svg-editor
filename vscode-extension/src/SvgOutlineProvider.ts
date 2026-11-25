import * as vscode from 'vscode';
import { SvgElementNode, SvgStructureParser } from './SvgStructureParser';

export class SvgOutlineProvider implements vscode.DocumentSymbolProvider {
  constructor(private readonly parser = new SvgStructureParser()) {}

  provideDocumentSymbols(
    document: vscode.TextDocument,
    token: vscode.CancellationToken
  ): vscode.DocumentSymbol[] {
    if (token.isCancellationRequested) return [];
    try {
      // Read the current buffer on every request, including unsaved edits.
      return this.parser.parse(document.getText()).map(node => this.toSymbol(document, node));
    } catch {
      // Incomplete XML is normal while typing; a later request can recover.
      return [];
    }
  }

  private toSymbol(document: vscode.TextDocument, node: SvgElementNode): vscode.DocumentSymbol {
    const symbol = new vscode.DocumentSymbol(
      node.id ? `${node.tag}#${node.id}` : node.tag,
      '',
      vscode.SymbolKind.Object,
      new vscode.Range(document.positionAt(node.startOffset), document.positionAt(node.endOffset)),
      new vscode.Range(document.positionAt(node.nameStartOffset), document.positionAt(node.nameEndOffset))
    );
    symbol.children = node.children.map(child => this.toSymbol(document, child));
    return symbol;
  }
}
