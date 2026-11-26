const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const crypto = require('node:crypto');

class AssemblyVerification {
  static run() {
    const root = path.resolve(__dirname, '..');
    const evidence = path.join(root, 'doc/validation/assembly'); fs.mkdirSync(evidence, { recursive: true });
    const temporary = fs.mkdtempSync(path.join(root, '.svg-editor-test-assembly-'));
    const results = [];
    try {
      for (const name of ['cli-1', 'cli-1a', 'cli-1-box', 'cli-commands', 'cli-labels']) {
        const base = path.join(temporary, name); const work = path.join(base, 'work'); fs.mkdirSync(work, { recursive: true });
        const write = (file, text) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, text); };
        if (name === 'cli-1') fs.copyFileSync(path.join(root, 'doc/transcript/fixtures/other.svg'), path.join(work, 'other.svg'));
        if (name === 'cli-commands') {
          write(path.join(work, 'docs/inside.txt'), 'nested'); write(path.join(work, 'plugins/inside.txt'), 'nested');
          write(path.join(work, '.hidden'), 'hidden'); write(path.join(work, 'demo.svg'), '<svg/>'); write(path.join(work, 'package.json'), '{}');
          fs.copyFileSync(path.join(root, 'doc/transcript/fixtures/commands-input.svg'), path.join(base, 'input.svg'));
        }
        const outputs = { 'cli-1': ['demo.svg'], 'cli-1a': ['flowchart.svg'], 'cli-1-box': ['flowchart-box.svg'],
          'cli-commands': ['../output.svg'], 'cli-labels': ['labels.svg'] }[name];
        const input = fs.readFileSync(path.join(root, 'doc/transcript', name + '.txt'));
        assert.ok(!input.toString().split(/\r?\n/).some(line => line.startsWith('svg>')));
        const initial = this.snapshot(base);
        const run = args => {
          const result = spawnSync(process.execPath, [path.join(root, 'dist/src/main.js'), ...args], { cwd: work, input, maxBuffer: 8 * 1024 * 1024 });
          if (result.error) throw result.error;
          assert.equal(result.status, 0, result.stderr.toString()); assert.equal(result.stderr.length, 0);
          return { stdout: result.stdout, files: outputs.map(file => fs.readFileSync(path.resolve(work, file))) };
        };
        const code = run(['--code']);
        for (const file of outputs) {
          const absolute = path.resolve(work, file); assert.ok(absolute.startsWith(base + path.sep)); fs.unlinkSync(absolute);
        }
        assert.deepEqual(this.snapshot(base), initial, `${name}: initial files must be identical between runs`);
        const configured = run(['--config', path.join(root, 'plugins.config.json')]);
        assert.deepEqual(code, configured, `${name}: full-plugin assembly mismatch`);
        fs.writeFileSync(path.join(evidence, name + '.code.txt'), code.stdout);
        fs.writeFileSync(path.join(evidence, name + '.config.txt'), configured.stdout);
        outputs.forEach((file, index) => fs.writeFileSync(path.join(evidence, name + '.' + path.basename(file)), code.files[index]));
        results.push({ session: name, plugins: ['command-stats', 'command-dir', 'shape-box', 'tree-star'], options: {},
          identicalCwd: true, restoredInitialFiles: true, stdoutBytes: code.stdout.length,
          stdoutSha256: crypto.createHash('sha256').update(code.stdout).digest('hex'), svgFiles: outputs, result: 'PASS' });
        console.log(`${name}: full code/config stdout and SVG match; same cwd and restored initial files`);
      }
      fs.writeFileSync(path.join(evidence, 'report.json'), JSON.stringify(results, null, 2) + '\n');
    } finally {
      assert.equal(path.dirname(temporary), root); assert.ok(path.basename(temporary).startsWith('.svg-editor-test-assembly-'));
      fs.rmSync(temporary, { recursive: true, force: true });
    }
  }
  static snapshot(directory) {
    const result = [];
    const walk = current => {
      for (const entry of fs.readdirSync(current, { withFileTypes: true }).sort((a, b) => a.name < b.name ? -1 : 1)) {
        const file = path.join(current, entry.name); const relative = path.relative(directory, file);
        result.push([relative, entry.isDirectory() ? '<directory>' : fs.readFileSync(file).toString('base64')]);
        if (entry.isDirectory()) walk(file);
      }
    };
    walk(directory); return result;
  }
}

AssemblyVerification.run();
