const fs = require('node:fs');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');
const assert = require('node:assert/strict');

class BaselineCheck {
  static run() {
    const root = path.resolve(__dirname, '..');
    const ref = '1fe4a0cb36c84caf1f135ebe534739c98d5d2db6';
    const git = args => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
    assert.equal(git(['rev-parse', 'final']), ref, 'The final tag must not move');
    const record = process.argv.includes('--record');
    const transcript = path.join(root, 'doc/transcript');
    const temporary = fs.mkdtempSync(path.join(root, '.svg-editor-test-baseline-'));
    const compiler = path.join(root, 'node_modules/typescript/bin/tsc');
    try {
      const baseline = path.join(temporary, 'final');
      fs.mkdirSync(baseline);
      const files = git(['ls-tree', '-r', '--name-only', ref, '--', 'src', 'tsconfig.json', 'package.json']).split('\n');
      for (const file of files) {
        const target = path.join(baseline, file);
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, execFileSync('git', ['show', `${ref}:${file}`], { cwd: root }));
      }
      execFileSync(process.execPath, [compiler, '-p', baseline], { cwd: root, stdio: 'pipe' });
      execFileSync(process.execPath, [compiler, '-p', root], { cwd: root, stdio: 'pipe' });
      for (const name of ['cli-1', 'cli-1a']) {
        const input = fs.readFileSync(path.join(transcript, `${name}.txt`));
        const expectedFile = path.join(transcript, `${name}.expected.txt`);
        const results = [];
        for (const [label, entry] of [['final', path.join(baseline, 'dist/src/main.js')], ['current', path.join(root, 'dist/src/main.js')]]) {
          const cwd = path.join(temporary, `${name}-${label}`);
          fs.mkdirSync(cwd);
          fs.copyFileSync(path.join(transcript, 'fixtures/other.svg'), path.join(cwd, 'other.svg'));
          const result = spawnSync(process.execPath, [entry], { cwd, input, maxBuffer: 4 * 1024 * 1024 });
          if (result.error) throw result.error;
          assert.equal(result.status, 0, result.stderr?.toString());
          assert.equal(result.stderr.length, 0, result.stderr.toString());
          results.push({ stdout: result.stdout, cwd });
        }
        if (record) fs.writeFileSync(expectedFile, results[0].stdout);
        assert.deepEqual(results[0].stdout, fs.readFileSync(expectedFile), `${name}: frozen expected output differs from final`);
        assert.deepEqual(results[1].stdout, results[0].stdout, `${name}: current output differs from final`);
        const artifacts = fs.readdirSync(results[0].cwd).filter(file => file.endsWith('.svg')).sort();
        for (const file of artifacts) {
          assert.deepEqual(fs.readFileSync(path.join(results[1].cwd, file)), fs.readFileSync(path.join(results[0].cwd, file)), `${name}: SVG differs: ${file}`);
        }
        console.log(`${name}: stdout and ${artifacts.length} SVG files match final byte for byte`);
      }
      console.log(`Baseline verified: final ${ref}. Box session is reserved for the later plugin step.`);
    } finally {
      // Only the directory created by mkdtemp above is removed.
      assert.equal(path.dirname(temporary), root);
      assert.ok(path.basename(temporary).startsWith('.svg-editor-test-baseline-'));
      fs.rmSync(temporary, { recursive: true, force: true });
    }
  }
}

BaselineCheck.run();
