import { Plugin, PluginContext } from '../../application/extensions/index.js';
import { StatsCommand } from './StatsCommand.js';

export class StatsPlugin implements Plugin {
  activate(context: PluginContext): void { context.registerCommand(new StatsCommand()); }
}

export default new StatsPlugin();
