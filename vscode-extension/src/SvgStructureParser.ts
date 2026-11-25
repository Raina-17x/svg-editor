import { SaxesParser } from 'saxes';

export interface SvgElementNode {
  tag: string;
  id?: string;
  startOffset: number;
  endOffset: number;
  nameStartOffset: number;
  nameEndOffset: number;
  children: SvgElementNode[];
}

/** XML structure only: no CLI shape whitelist or document mutation. */
export class SvgStructureParser {
  parse(source: string): SvgElementNode[] {
    const parser = new SaxesParser({ xmlns: true, position: true });
    const roots: SvgElementNode[] = [];
    const stack: SvgElementNode[] = [];
    let startOffset = 0;

    parser.on('error', error => { throw error; });
    // Never resolve external resources or custom DTD entities for an outline.
    parser.on('doctype', () => { throw new Error('DTD is not supported'); });
    parser.on('opentagstart', () => {
      // Before attributes are read, the last '<' is this opening tag.
      // Searching also handles a CRLF delimiter, which consumes two code units.
      // saxes positions are UTF-16 string offsets, like TextDocument.positionAt.
      startOffset = source.lastIndexOf('<', parser.position - 1);
    });
    parser.on('opentag', tag => {
      if (!stack.length && (tag.local !== 'svg' ||
          (tag.uri !== '' && tag.uri !== 'http://www.w3.org/2000/svg'))) {
        throw new Error('Expected an SVG root');
      }
      const node: SvgElementNode = {
        tag: tag.name,
        id: tag.attributes.id?.value,
        startOffset,
        endOffset: parser.position,
        nameStartOffset: startOffset + 1,
        nameEndOffset: startOffset + 1 + tag.name.length,
        children: []
      };
      const parent = stack.at(-1);
      (parent ? parent.children : roots).push(node);
      stack.push(node);
    });
    parser.on('closetag', () => {
      const node = stack.pop();
      if (!node) throw new Error('Unexpected closing tag');
      node.endOffset = parser.position;
    });
    parser.write(source).close();
    if (roots.length !== 1 || stack.length) throw new Error('Incomplete SVG');
    return roots;
  }
}
