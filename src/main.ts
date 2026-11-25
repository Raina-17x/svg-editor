import { DefaultHost } from './host/DefaultHost.js';
import { Repl } from './cli/Repl.js';

new Repl(new DefaultHost().cli).start();
