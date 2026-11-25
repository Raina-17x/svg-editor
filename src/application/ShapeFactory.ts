import { Shape } from '../domain/Shape.js';
import { SvgDocument } from '../domain/SvgDocument.js';
import { ShapeProvider, ShapeReadInput, ShapeWriteOutput } from './extensions/ShapeProvider.js';
import { ShapeAccess } from './extensions/ShapeAccess.js';

export class ShapeFactory implements ShapeAccess {
  constructor(private readonly providers: () => readonly ShapeProvider[]) {}
  create(type: string, id: string, args: readonly string[]): Shape {
    const provider = this.providers().find(item => item.name === type);
    if (!provider) throw new Error(`unknown shape type: ${type} (is the plugin loaded?)`);
    return this.checked(provider.create(id, args), id);
  }
  fromSvg(input: ShapeReadInput): Shape {
    const candidates = this.providers().filter(item => item.svgTag === input.tag);
    const provider = candidates.find(item => item.dataKind !== undefined && item.dataKind === input.attributes['data-kind'])
      ?? candidates.find(item => item.dataKind === undefined);
    if (!provider) throw new Error(`unknown shape type: ${input.tag} (is the plugin loaded?)`);
    return this.checked(provider.read(input), input.id);
  }
  toSvg(shape: Shape): ShapeWriteOutput {
    const providers = this.providers().filter(item => item.supports(shape.clone()));
    if (providers.length !== 1) throw new Error(`shape provider conflict: ${shape.id} (${providers.length} matches)`);
    const output = providers[0].write(shape.clone());
    const xmlName = /^[A-Za-z_][A-Za-z0-9_.:-]*$/;
    if (!output || typeof output.tag !== 'string' || !xmlName.test(output.tag) ||
        !output.attributes || typeof output.attributes !== 'object' || Array.isArray(output.attributes) ||
        Object.entries(output.attributes).some(([key, value]) => !xmlName.test(key) || typeof value !== 'string') ||
        (output.attributes.id !== undefined && output.attributes.id !== shape.id) ||
        !Array.isArray(output.children) || output.children.some(child => !(child instanceof Shape)) ||
        (output.content !== undefined && (typeof output.content !== 'string' || output.children.length > 0))) {
      throw new Error(`invalid shape serialization: ${shape.id}`);
    }
    return output;
  }
  help(): string[] { return this.providers().map(provider => provider.help); }
  private checked(shape: Shape, id: string): Shape {
    if (!(shape instanceof Shape) || shape.id !== id) throw new Error(`invalid shape provider result: ${id}`);
    const document = new SvgDocument(); document.add(shape); document.validate();
    return shape;
  }
}
