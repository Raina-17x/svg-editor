const { test } = require('node:test');
const assert = require('node:assert/strict');
const { SvgStructureParser } = require('../dist/SvgStructureParser.js');

test('nested groups, unnamed leaves, arbitrary SVG elements and exact ranges', () => {
  const source = '<svg><g id="flow"><rect id="start"/><g><path d="M0 0"/><text>Hi</text></g></g></svg>';
  const [root] = new SvgStructureParser().parse(source);
  assert.equal(root.tag, 'svg');
  assert.equal(root.endOffset, source.length);
  const group = root.children[0];
  assert.equal(group.id, 'flow');
  assert.equal(group.children[0].id, 'start');
  assert.equal(group.children[1].children[1].id, undefined);
  assert.equal(group.children[1].children[0].tag, 'path');
  assert.equal(source.slice(group.children[0].startOffset, group.children[0].endOffset), '<rect id="start"/>');
  assert.equal(source.slice(group.nameStartOffset, group.nameEndOffset), 'g');
});

test('comments, CDATA, quoted delimiters, decoded ids, namespaces and UTF-16 offsets', () => {
  const source = '<?xml version="1.0"?>\r\n<svg xmlns="http://www.w3.org/2000/svg"><!-- <fake/> --><text>😀<![CDATA[<fake/>]]></text><g\r\n id="a &amp; b" data-note="a > b"><rect /></g></svg>';
  const [root] = new SvgStructureParser().parse(source);
  assert.equal(root.children.length, 2);
  const group = root.children[1];
  assert.equal(group.id, 'a & b');
  assert.equal(group.startOffset, source.indexOf('<g'));
  assert.equal(source.slice(group.startOffset, group.endOffset), '<g\r\n id="a &amp; b" data-note="a > b"><rect /></g>');
  assert.equal(root.children[0].children.length, 0);
  assert.equal(new SvgStructureParser().parse('<s:svg xmlns:s="http://www.w3.org/2000/svg"><s:g/></s:svg>')[0].tag, 's:svg');
});

test('incomplete and malformed XML is rejected without retaining state', () => {
  const parser = new SvgStructureParser();
  for (const source of ['', '<svg>', '<svg><g></svg>', '<svg><rect id="', '<svg/><svg/>', '<html/>', '<svg id="a" id="b"/>', '<svg>&unknown;</svg>', '<!DOCTYPE svg SYSTEM "external.dtd"><svg/>']) {
    assert.throws(() => parser.parse(source), undefined, source);
  }
  assert.equal(parser.parse('<svg/>')[0].tag, 'svg');
});

// A minimal VSCode API substitute exercises the adapter without an extension host.
const Module = require('node:module');
const originalLoad = Module._load;
class Range {
  constructor(start, end) { this.start = start; this.end = end; }
}
class DocumentSymbol {
  constructor(name, detail, kind, range, selectionRange) {
    Object.assign(this, { name, detail, kind, range, selectionRange, children: [] });
  }
}
let SvgOutlineProvider;
try {
  Module._load = function(name, ...args) {
    return name === 'vscode' ? { Range, DocumentSymbol, SymbolKind: { Object: 18 } } : originalLoad.call(this, name, ...args);
  };
  ({ SvgOutlineProvider } = require('../dist/SvgOutlineProvider.js'));
} finally {
  Module._load = originalLoad;
}

test('provider maps hierarchy and source locations, uses edited buffer, and recovers after incomplete XML', () => {
  let text = '<svg>\r\n  <g id="flow">\r\n    <rect id="start"/>\r\n    <text>😀</text>\r\n  </g>\r\n</svg>';
  const document = {
    getText: () => text,
    positionAt(offset) {
      const lines = text.slice(0, offset).split('\n');
      return { line: lines.length - 1, character: lines.at(-1).length };
    }
  };
  const provider = new SvgOutlineProvider();
  const token = { isCancellationRequested: false };
  let symbols = provider.provideDocumentSymbols(document, token);
  assert.equal(symbols[0].children[0].name, 'g#flow');
  const rect = symbols[0].children[0].children[0];
  assert.equal(rect.name, 'rect#start');
  assert.deepEqual(rect.range.start, { line: 2, character: 4 });
  assert.deepEqual(rect.range.end, { line: 2, character: 22 });
  assert.deepEqual(rect.selectionRange.start, { line: 2, character: 5 });
  assert.deepEqual(rect.selectionRange.end, { line: 2, character: 9 });
  assert.equal(symbols[0].children[0].children[1].name, 'text');
  text = text.replace('start', 'updated');
  symbols = provider.provideDocumentSymbols(document, token);
  assert.equal(symbols[0].children[0].children[0].name, 'rect#updated');
  text = '<svg><g>';
  assert.deepEqual(provider.provideDocumentSymbols(document, token), []);
  text = '<svg><circle/></svg>';
  assert.equal(provider.provideDocumentSymbols(document, token)[0].children[0].name, 'circle');
  assert.deepEqual(provider.provideDocumentSymbols(document, { isCancellationRequested: true }), []);
});
