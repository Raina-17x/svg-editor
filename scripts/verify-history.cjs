const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');

class HistoryVerification {
  static run() {
    const root = path.resolve(__dirname, '..');
    const git = args => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
    const protectedPaths = ['src/application', 'src/domain', 'src/cli', 'src/infrastructure', 'src/plugins'];
    const results = [];
    for (const [ref, plugin, allowed] of [
      ['codex/box-code-demo', 'src/plugins/shape-box', 'src/host/CliStartup.ts'],
      ['codex/box-config-demo', 'src/plugins/shape-box', 'plugins.config.json'],
      ['734a50e', 'src/plugins/command-', 'src/host/CliStartup.ts'],
      ['ebcdf7d', 'src/plugins/tree-star', 'src/host/CliStartup.ts']
    ]) {
      const commit = git(['rev-parse', ref]); const parent = git(['rev-parse', ref + '~1']);
      for (const item of protectedPaths) {
        assert.ok(git(['ls-tree', '-r', '--name-only', commit, '--', item]), `Missing protected path: ${item}`);
      }
      const excluded = plugin.endsWith('-') ? ['src/plugins/command-dir', 'src/plugins/command-stats'] : [plugin];
      excluded.forEach(item => assert.ok(git(['ls-tree', '-r', '--name-only', commit, '--', item]), `Missing new plugin: ${item}`));
      const diff = git(['diff', parent, commit, '--', ...protectedPaths, ...excluded.map(item => `:(exclude)${item}`)]);
      assert.equal(diff, '', `${ref}: kernel/old plugins changed`);
      const files = git(['diff', '--name-status', parent, commit]);
      const changedRuntime = git(['diff', '--name-only', parent, commit, '--', 'src']).split('\n').filter(Boolean);
      for (const item of changedRuntime) assert.ok(excluded.some(prefix => item.startsWith(prefix + '/')) || item === allowed, `${ref}: unexpected runtime change ${item}`);
      results.push({ ref, commit, parent, excluded, verifiedExistingPaths: protectedPaths, protectedDiff: 'empty', changedFiles: files.split('\n'), result: 'PASS' });
      console.log(`${ref}: protected paths exist; kernel and old-plugin diff is empty`);
    }
    const loaders = ['src/host/PluginConfigLoader.ts', 'src/host/PluginInstaller.ts', 'src/host/RegistrationTransaction.ts'];
    const loaderReview = loaders.map(file => {
      const source = fs.readFileSync(path.join(root, file), 'utf8');
      assert.ok(!/from\s+['"][^'"]*plugins\//.test(source), `${file}: concrete plugin import`);
      return { file, matches: source.split(/\r?\n/).map((line, i) => ({ line: i + 1, text: line })).filter(item => /import|require|switch/.test(item.text)) };
    });
    const directory = path.join(root, 'doc/validation'); fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(path.join(directory, 'history.json'), JSON.stringify({ results, loaderReview,
      review: 'Manual review: generic module resolution, manifest inspection and error branches only; concrete imports are in CliStartup composition root, not loader files. Search supports rather than replaces this review.' }, null, 2) + '\n');
  }
}

HistoryVerification.run();
