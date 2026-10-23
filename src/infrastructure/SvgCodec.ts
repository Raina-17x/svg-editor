import { XMLParser, XMLValidator } from 'fast-xml-parser';
import { SvgDocument } from '../domain/SvgDocument.js';
import { Shape } from '../domain/Shape.js';
import { Group } from '../domain/Group.js';
import { Value } from '../domain/Value.js';
import { ShapeFactory } from '../application/ShapeFactory.js';

type XmlNode = { [key: string]: XmlNode[] | Record<string, string> | string };

export class SvgCodec {
  constructor(private readonly factory: ShapeFactory) {}
  private escape(value: string): string {
    Value.xmlText(value);
    return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&apos;')
      .replace(/\r/g, '&#13;').replace(/\n/g, '&#10;').replace(/\t/g, '&#9;');
  }
  encode(document: SvgDocument): string {
    const render = (shape: Shape, depth: number): string => {
      const indent = '  '.repeat(depth);
      const attrs = [['id', shape.id], ...shape.attributes].map(([key, value]) => `${key}="${this.escape(value)}"`).join(' ');
      if (shape.content !== undefined) return `${indent}<${shape.type} ${attrs}>${this.escape(shape.content)}</${shape.type}>`;
      if (!shape.children.length) return `${indent}<${shape.type} ${attrs}/>`;
      return `${indent}<${shape.type} ${attrs}>\n${shape.children.map(child => render(child, depth + 1)).join('\n')}\n${indent}</${shape.type}>`;
    };
    return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${document.width}" height="${document.height}" viewBox="0 0 ${document.width} ${document.height}">\n${document.children.map(shape => render(shape, 1)).join('\n')}\n</svg>\n`;
  }
  decode(xml: string): { document: SvgDocument; warnings: string[] } {
    if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error('invalid SVG: DTD and entities are not supported');
    const validation = XMLValidator.validate(xml);
    if (validation !== true) throw new Error(`invalid SVG: ${validation.err.msg}`);
    const parser = new XMLParser({ preserveOrder: true, ignoreAttributes: false, attributeNamePrefix: '',
      parseTagValue: false, parseAttributeValue: false, trimValues: false, ignoreDeclaration: true, ignorePiTags: true });
    const parsed = parser.parse(xml) as XmlNode[];
    const elements = (nodes: XmlNode[]): XmlNode[] => nodes.filter(node => this.tag(node) !== undefined);
    const roots = elements(parsed);
    if (roots.length !== 1 || this.tag(roots[0]) !== 'svg') throw new Error('invalid SVG: expected one <svg> root');
    const root = roots[0];
    const attrs = this.attrs(root);
    if (attrs.xmlns && attrs.xmlns !== 'http://www.w3.org/2000/svg') throw new Error('invalid SVG namespace');
    for (const key of Object.keys(attrs)) {
      if (!['xmlns', 'width', 'height', 'viewBox', 'version', 'id'].includes(key)) throw new Error(`unsupported SVG root attribute: ${key}`);
    }
    const dimension = (value: string | undefined, fallback: number): number => value === undefined ? fallback : Value.number(value.replace(/px$/, ''));
    const viewBox = attrs.viewBox?.trim().split(/[\s,]+/).map(value => Value.number(value));
    const width = dimension(attrs.width, viewBox?.[2] ?? 800);
    const height = dimension(attrs.height, viewBox?.[3] ?? 600);
    if (viewBox && (viewBox.length !== 4 || viewBox[0] !== 0 || viewBox[1] !== 0 || viewBox[2] !== width || viewBox[3] !== height)) {
      throw new Error('unsupported viewBox: expected 0 0 width height');
    }
    const document = new SvgDocument(width, height);
    const children = root.svg as XmlNode[];
    const reserved = new Set<string>();
    if (attrs.id) reserved.add(attrs.id);
    const reserve = (nodes: XmlNode[]): void => {
      for (const node of elements(nodes)) {
        const tag = this.tag(node)!;
        const id = this.attrs(node).id;
        if (id !== undefined) {
          Value.id(id);
          if (reserved.has(id)) throw new Error(`id already exists: ${id}`);
          reserved.add(id);
        }
        reserve(node[tag] as XmlNode[]);
      }
    };
    reserve(children);
    const warnings: string[] = [];
    const counters = new Map<string, number>();
    const read = (nodes: XmlNode[], parent?: Group): void => {
      for (const node of nodes) {
        const tag = this.tag(node);
        if (!tag) {
          if (String(node['#text'] ?? '').trim()) throw new Error('invalid SVG: unexpected text outside text element');
          continue;
        }
        const attributes = this.attrs(node);
        let id = attributes.id;
        if (id === undefined) {
          let serial = counters.get(tag) ?? 0;
          do { serial++; id = `${tag}${serial}`; } while (reserved.has(id));
          counters.set(tag, serial); reserved.add(id);
          warnings.push(`warning: assigned id ${id} to unnamed <${tag}>`);
        }
        const childNodes = node[tag] as XmlNode[];
        const text = childNodes.map(child => String(child['#text'] ?? '')).join('');
        const shape = this.factory.fromSvg(tag, id, attributes, text);
        if (!shape.isContainer && elements(childNodes).length) throw new Error(`unsupported nested element inside ${tag}`);
        if (!shape.isContainer && shape.content === undefined && text.trim()) throw new Error(`invalid SVG: unexpected text inside ${tag}`);
        document.add(shape, parent?.id);
        if (shape instanceof Group) read(childNodes, shape);
      }
    };
    read(children);
    return { document, warnings };
  }
  private tag(node: XmlNode): string | undefined { return Object.keys(node).find(key => key !== ':@' && !key.startsWith('#') && !key.startsWith('?')); }
  private attrs(node: XmlNode): Record<string, string> { return (node[':@'] ?? {}) as Record<string, string>; }
}
