import { AttributeHandler, AttributeResult, EditContext } from '../../application/extensions/index.js';
import { Shape } from '../../domain/Shape.js';
import { Box } from './Box.js';

export class BoxAttributeHandler implements AttributeHandler {
  readonly name = 'box-attributes';
  handles(shape: Shape, attribute: string): boolean { return shape instanceof Box && (attribute === 'fill' || attribute === 'label'); }
  apply(context: EditContext, id: string, attribute: string, value: string): AttributeResult {
    const box = context.require(id);
    if (!(box instanceof Box)) throw new Error(`not a box: ${id}`);
    if (attribute === 'fill') {
      const previous = box.fill;
      box.setFill(value);
      return { message: `${box.label} fill propagated to ${id}-rect`, undoMessage: `${box.label} fill restored: ${previous ?? '(unset)'}` };
    }
    if (attribute === 'label') {
      const previous = box.title;
      box.setTitle(value);
      return { message: `${box.label} label updated: ${JSON.stringify(value)}`, undoMessage: `${box.label} label restored: ${JSON.stringify(previous)}` };
    }
    throw new Error(`unknown attribute: ${attribute}`);
  }
}
