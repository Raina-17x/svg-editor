import { CliStartup } from './host/CliStartup.js';

void new CliStartup().start(process.argv.slice(2)).catch(error => {
  console.error(error); process.exitCode = 1;
});
