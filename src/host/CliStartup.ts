import { DefaultHost } from './DefaultHost.js';
import { PluginConfigLoader } from './PluginConfigLoader.js';
import { Repl } from '../cli/Repl.js';
import stats from '../plugins/command-stats/StatsPlugin.js';
import statsManifest from '../plugins/command-stats/package.json';
import dir from '../plugins/command-dir/DirPlugin.js';
import dirManifest from '../plugins/command-dir/package.json';
import box from '../plugins/shape-box/BoxPlugin.js';
import boxManifest from '../plugins/shape-box/package.json';
import star from '../plugins/tree-star/TreeStarPlugin.js';
import starManifest from '../plugins/tree-star/package.json';

export class CliStartup {
  async start(args: readonly string[]): Promise<void> {
    const host = new DefaultHost();
    const diagnostics = [...host.startupErrors];
    if (args.length) {
      if (args.length === 1 && args[0] === '--code') {
        diagnostics.push(...host.installer.install(statsManifest, stats), ...host.installer.install(dirManifest, dir),
          ...host.installer.install(boxManifest, box), ...host.installer.install(starManifest, star));
      } else if (args.length !== 2 || args[0] !== '--config') diagnostics.push('error: invalid plugin config');
      else diagnostics.push(...await new PluginConfigLoader(host.installer).load(args[1]));
    }
    diagnostics.forEach(line => console.log(line));
    new Repl(host.cli).start();
  }
}
