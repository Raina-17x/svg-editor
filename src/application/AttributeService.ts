import { AttributeHandler, AttributeResult } from './extensions/AttributeHandler.js';
import { EditContext } from './extensions/SessionApi.js';

export class AttributeService {
  constructor(private readonly handlers: () => readonly AttributeHandler[]) {}
  apply(context: EditContext, id: string, attribute: string, value: string): AttributeResult {
    const shape = context.require(id);
    const handlers = this.handlers().filter(handler => handler.handles(shape.clone(), attribute));
    if (handlers.length > 1) throw new Error(`attribute handler conflict: ${id}/${attribute}`);
    if (handlers.length) {
      const result = handlers[0].apply(context, id, attribute, value);
      if (!result || typeof result.message !== 'string' || typeof result.undoMessage !== 'string') throw new Error('invalid attribute handler result');
      return result;
    }
    const previous = attribute === 'text' ? shape.content : shape.get(attribute);
    const undoMessage = previous === undefined ? `${shape.label} updated: ${attribute} removed`
      : `${shape.label} updated: ${attribute}=${JSON.stringify(previous)}`;
    shape.set(attribute, value);
    return { message: `${shape.label} updated: ${attribute}=${JSON.stringify(value)}`, undoMessage };
  }
}
