const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { execFileSync, spawnSync } = require('node:child_process');

/** Create sibling proof commits without changing the current branch or index. */
class BoxDemo {
  static run() {
    const root = path.resolve(__dirname, '..');
    const git = (args, env) => execFileSync('git', args, { cwd: root, env: env ?? process.env, encoding: 'utf8' }).trim();
    const base = git(['rev-parse', 'HEAD']);
    const goldenFiles = git(['ls-tree', '-r', '--name-only', base, '--', 'doc/transcript']).split('\n').filter(file =>
      file.endsWith('.expected.txt') || (file.startsWith('doc/transcript/fixtures/') && file.endsWith('.svg')));
    const refs = ['refs/heads/codex/box-code-demo', 'refs/heads/codex/box-config-demo'];
    for (const ref of refs) {
      const result = spawnSync('git', ['show-ref', '--verify', '--quiet', ref], { cwd: root });
      assert.equal(result.status, 1, `Ref already exists or cannot inspect: ${ref}`);
    }
    const temporary = fs.mkdtempSync(path.join(root, '.svg-editor-test-box-demo-'));
    const evidence = { base, currentBranch: git(['branch', '--show-current']), demos: [] };
    try {
      for (const [index, mode] of ['code', 'config'].entries()) {
        const env = { ...process.env, GIT_INDEX_FILE: path.join(temporary, `index-${mode}`) };
        git(['read-tree', base], env);
        const assembly = mode === 'code' ? 'src/host/CliStartup.ts' : 'plugins.config.json';
        git(['add', '--', 'src/plugins/shape-box', assembly, 'test/box.test.ts', 'test/command-plugins.test.ts'], env);
        // Earlier commits stored CRLF goldens; normalize test data, not behavior.
        git(['add', '--', '.gitattributes'], env);
        git(['add', '--renormalize', '--', ...goldenFiles], env);
        const tree = git(['write-tree'], env);
        const files = git(['diff', '--name-only', base, tree]).split('\n');
        assert.ok(files.some(file => file.startsWith('src/plugins/shape-box/')));
        assert.ok(files.includes(assembly));
        for (const file of files) assert.ok(file.startsWith('src/plugins/shape-box/') ||
          [assembly, 'test/box.test.ts', 'test/command-plugins.test.ts', '.gitattributes', ...goldenFiles].includes(file), `Unexpected proof change: ${file}`);
        const checkout = path.join(temporary, mode); fs.mkdirSync(checkout);
        const archive = execFileSync('git', ['archive', '--format=tar', tree], { cwd: root, maxBuffer: 32 * 1024 * 1024 });
        execFileSync(process.platform === 'win32' ? 'tar.exe' : 'tar', ['-xf', '-', '-C', checkout], { input: archive });
        const execute = args => execFileSync(process.execPath, args, { cwd: checkout, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
        execute([path.join(root, 'node_modules/typescript/bin/tsc'), '-p', checkout]);
        execute(['scripts/copy-plugin-manifests.cjs']);
        const tests = fs.readdirSync(path.join(checkout, 'dist/test')).filter(file => file.endsWith('.test.js')).map(file => `dist/test/${file}`);
        const testOutput = execute(['--test', ...tests]);
        const architecture = execute(['scripts/check-architecture.cjs']).trim();
        const session = fs.readFileSync(path.join(root, 'doc/transcript/cli-1-box.txt'));
        const args = ['dist/src/main.js', ...(mode === 'code' ? ['--code'] : ['--config', 'plugins.config.json'])];
        const run = spawnSync(process.execPath, args, { cwd: checkout, input: session });
        assert.equal(run.status, 0, run.stderr.toString());
        assert.deepEqual(run.stdout, fs.readFileSync(path.join(root, 'doc/transcript/cli-1-box.expected.txt')));
        assert.deepEqual(fs.readFileSync(path.join(checkout, 'flowchart-box.svg')), fs.readFileSync(path.join(root, 'doc/transcript/fixtures/flowchart-box.svg')));
        const commit = git(['commit-tree', tree, '-p', base, '-m', `feat: demonstrate box ${mode} assembly without kernel changes`], env);
        git(['update-ref', refs[index], commit, '0000000000000000000000000000000000000000']);
        evidence.demos.push({ mode, ref: refs[index], commit, files, architecture,
          testSummary: testOutput.split(/\r?\n/).filter(line => /tests |pass |fail /.test(line)), officialBoxSession: 'stdout and SVG match frozen expected bytes' });
      }
      fs.writeFileSync(path.join(root, 'doc/box-demo-evidence.json'), JSON.stringify(evidence, null, 2) + '\n');
      console.log(JSON.stringify(evidence, null, 2));
    } finally {
      assert.equal(path.dirname(temporary), root);
      assert.ok(path.basename(temporary).startsWith('.svg-editor-test-box-demo-'));
      fs.rmSync(temporary, { recursive: true, force: true });
    }
  }
}

BoxDemo.run();
