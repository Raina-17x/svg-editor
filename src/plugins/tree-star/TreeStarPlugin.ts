import { Plugin, PluginContext } from '../../application/extensions/index.js';
import { ModifiedStarDecorator } from './ModifiedStarDecorator.js';

export class TreeStarPlugin implements Plugin {
  activate(context: PluginContext): void { context.registerDecorator(new ModifiedStarDecorator()); }
}

export default new TreeStarPlugin();
