const fs = require('node:fs');
const path = require('node:path');
const { spawnSync, execFileSync } = require('node:child_process');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

class Acceptance {
  static run() {
    const root = path.resolve(__dirname, '..'); const directory = path.join(root, 'doc/validation'); fs.mkdirSync(directory, { recursive: true });
    const tasks = [
      ['cli-tests', ['node_modules/typescript/bin/tsc', '-p', '.']],
      ['manifest-copy', ['scripts/copy-plugin-manifests.cjs']],
      ['cli-unit-integration', () => ['--test', ...fs.readdirSync(path.join(root, 'dist/test')).filter(file => file.endsWith('.test.js')).map(file => 'dist/test/' + file)]],
      ['architecture', ['scripts/check-architecture.cjs']],
      ['phase1-baseline', ['scripts/check-baseline.cjs']],
      ['full-assembly', ['scripts/verify-assembly.cjs']],
      ['git-proof', ['scripts/verify-history.cjs']],
      ['extension-build', ['vscode-extension/node_modules/typescript/bin/tsc', '-p', 'vscode-extension']],
      ['extension-tests', ['--test', ...fs.readdirSync(path.join(root, 'vscode-extension/test')).filter(file => file.endsWith('.test.cjs')).map(file => 'vscode-extension/test/' + file)]]
    ];
    const results = [];
    for (const [name, args] of tasks) {
      const run = spawnSync(process.execPath, typeof args === 'function' ? args() : args, { cwd: root, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
      fs.writeFileSync(path.join(directory, name + '.log'), (run.stdout ?? '') + (run.stderr ?? ''));
      if (run.error) throw run.error;
      assert.equal(run.status, 0, `${name} failed; see doc/validation/${name}.log`);
      results.push({ name, result: 'PASS', log: name + '.log' }); console.log(`${name}: PASS`);
    }
    const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
    const tags = execFileSync('git', ['tag', '--list'], { cwd: root, encoding: 'utf8' }).trim().split('\n');
    const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], { cwd: root, encoding: 'utf8' }).split('\n');
    const sourceHashes = Object.fromEntries([...new Set(files)].sort().filter(file =>
      /^(src\/|test\/|scripts\/|vscode-extension\/(src|test)\/).*\.(ts|cjs|json)$/.test(file) ||
      ['package.json', 'package-lock.json', 'tsconfig.json', 'plugins.config.json', 'vscode-extension/package.json', 'vscode-extension/package-lock.json', 'vscode-extension/tsconfig.json'].includes(file)
    ).filter(file => fs.existsSync(path.join(root, file))).map(file => [file,
      crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n')).digest('hex')]));
    fs.writeFileSync(path.join(directory, 'acceptance.json'), JSON.stringify({ codeCommit: commit,
      validationContext: 'Executed against the working tree. Exact tested sources/configuration are bound by normalized-LF SHA256 below; codeCommit identifies the runtime source baseline, not a claim that every validation artifact was already committed.',
      sourceHashes, tags, tagCreatedByScript: false, results }, null, 2) + '\n');
  }
}

Acceptance.run();
