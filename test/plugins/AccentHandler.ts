import { AttributeHandler, AttributeResult, EditContext } from '../../src/application/extensions/index.js';
import { Shape } from '../../src/domain/Shape.js';
import { Panel } from './Panel.js';

export class AccentHandler implements AttributeHandler {
  constructor(readonly name = 'panel-accent') {}
  handles(shape: Shape, attribute: string): boolean { return shape instanceof Panel && attribute === 'accent'; }
  apply(context: EditContext, id: string, _attribute: string, value: string): AttributeResult {
    context.require(`${id}-rect`).set('fill', value);
    if (value === 'fail') throw new Error('injected attribute failure');
    context.require(`${id}-text`).set('text', value);
    return { message: 'accent applied', undoMessage: 'accent restored' };
  }
}
