import { Plugin, PluginContext } from '../../application/extensions/index.js';
import { BoxProvider } from './BoxProvider.js';
import { BoxAttributeHandler } from './BoxAttributeHandler.js';
import { BoxTypeDecorator } from './BoxTypeDecorator.js';

export class BoxPlugin implements Plugin {
  activate(context: PluginContext): void {
    context.registerShape(new BoxProvider());
    context.registerAttribute(new BoxAttributeHandler());
    context.registerDecorator(new BoxTypeDecorator());
  }
}

export default new BoxPlugin();
