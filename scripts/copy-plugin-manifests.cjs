const fs = require('node:fs');
const path = require('node:path');

class PluginManifestCopy {
  static run(directory = path.resolve('src/plugins')) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) this.run(file);
      else if (entry.name === 'package.json') {
        const target = path.resolve('dist', path.relative(process.cwd(), file));
        fs.mkdirSync(path.dirname(target), { recursive: true }); fs.copyFileSync(file, target);
      }
    }
  }
}

PluginManifestCopy.run();
