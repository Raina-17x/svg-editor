import { DefaultHost } from './DefaultHost.js';
import { PluginConfigLoader } from './PluginConfigLoader.js';
import { Repl } from '../cli/Repl.js';

export class CliStartup {
  async start(args: readonly string[]): Promise<void> {
    const host = new DefaultHost();
    const diagnostics = [...host.startupErrors];
    if (args.length) {
      if (args.length !== 2 || args[0] !== '--config') diagnostics.push('error: invalid plugin config');
      else diagnostics.push(...await new PluginConfigLoader(host.installer).load(args[1]));
    }
    diagnostics.forEach(line => console.log(line));
    new Repl(host.cli).start();
  }
}
