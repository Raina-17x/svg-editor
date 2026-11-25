import { Plugin, PluginContext } from '../../application/extensions/index.js';
import { DirCommand } from './DirCommand.js';

export class DirPlugin implements Plugin {
  activate(context: PluginContext): void { context.registerCommand(new DirCommand()); }
}

export default new DirPlugin();
