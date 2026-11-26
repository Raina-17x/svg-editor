const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const ts = require('typescript');

class MetricsReport {
  static git(args) {
    return execFileSync('git', args, { cwd: this.root, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }).trim();
  }
  static readRevision(ref) {
    let files;
    if (ref === 'WORKTREE') {
      files = [...new Set([...this.git(['ls-files']).split('\n'), ...this.git(['ls-files', '--others', '--exclude-standard']).split('\n')])];
    } else files = this.git(['ls-tree', '-r', '--name-only', ref]).split('\n');
    const rows = [];
    for (const file of files.sort()) {
      if (!/^(src\/|vscode-extension\/src\/).*\.ts$/.test(file)) continue;
      if (ref === 'WORKTREE' && !fs.existsSync(path.join(this.root, file))) continue;
      const text = ref === 'WORKTREE' ? fs.readFileSync(path.join(this.root, file), 'utf8')
        : execFileSync('git', ['show', `${ref}:${file}`], { cwd: this.root, encoding: 'utf8' });
      const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
      const functions = [];
      const isFunction = node => (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node) || ts.isConstructorDeclaration(node) ||
        ts.isGetAccessorDeclaration(node) || ts.isSetAccessorDeclaration(node) || ts.isArrowFunction(node) || ts.isFunctionExpression(node)) && node.body;
      const collect = node => {
        if (isFunction(node)) {
          let complexity = 1;
          const count = child => {
            if (isFunction(child)) return;
            if (ts.isIfStatement(child) || ts.isForStatement(child) || ts.isForOfStatement(child) || ts.isForInStatement(child) ||
                ts.isWhileStatement(child) || ts.isDoStatement(child) || ts.isCatchClause(child) || ts.isCaseClause(child) ||
                ts.isConditionalExpression(child)) complexity++;
            if (ts.isBinaryExpression(child) && [ts.SyntaxKind.AmpersandAmpersandToken, ts.SyntaxKind.BarBarToken, ts.SyntaxKind.QuestionQuestionToken].includes(child.operatorToken.kind)) complexity++;
            ts.forEachChild(child, count);
          };
          count(node.body);
          functions.push({ name: node.name?.getText(source) ?? (ts.isConstructorDeclaration(node) ? 'constructor' : '<anonymous>'),
            line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1, complexity });
        }
        ts.forEachChild(node, collect);
      };
      collect(source);
      const category = file.startsWith('vscode-extension/') ? 'vscode'
        : file.startsWith('src/plugins/') ? 'plugins'
        : file.startsWith('src/host/') || file === 'src/main.ts' ? 'composition' : 'kernel';
      const role = file.includes('/extensions/') ? '插件使用的公开接口'
        : file.startsWith('src/domain/') ? '保存图形数据并检查图形结构'
        : file.startsWith('src/application/commands/') ? 'Phase 1 内置命令（历史内核）'
        : file.startsWith('src/plugins/') ? `插件 ${file.split('/')[2]}：${path.basename(file, '.ts')}`
        : file.startsWith('src/host/') || file === 'src/main.ts' ? '启动程序、选择插件并连接各部分'
        : file.startsWith('src/cli/') ? '读取输入并调用对应命令'
        : file.startsWith('src/infrastructure/') ? '读写文件、读取目录或转换 SVG'
        : file.startsWith('vscode-extension/') ? 'VSCode 扩展（单独统计）' : '管理文档操作并调用插件';
      rows.push({ file, role, category, lines: text ? text.split(/\r?\n/).length - (text.endsWith('\n') ? 1 : 0) : 0,
        nonblankLines: text.split(/\r?\n/).filter(line => line.trim()).length,
        complexity: functions.reduce((sum, item) => sum + item.complexity, 0), functions,
        sha256: crypto.createHash('sha256').update(text.replace(/\r\n/g, '\n')).digest('hex') });
    }
    return rows;
  }
  static totals(rows) {
    return Object.fromEntries(['kernel', 'composition', 'plugins', 'vscode'].map(category => {
      const group = rows.filter(row => row.category === category);
      return [category, { files: group.length, lines: group.reduce((sum, row) => sum + row.lines, 0),
        complexity: group.reduce((sum, row) => sum + row.complexity, 0) }];
    }));
  }
  static run() {
    this.root = path.resolve(__dirname, '..');
    const args = process.argv.slice(2);
    const option = (name, fallback) => args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
    const from = option('--from', 'final'); const to = option('--to', 'WORKTREE');
    const label = option('--label', to);
    if (!from || !to || !label) throw new Error('Usage: --from <git-ref> --to <git-ref|WORKTREE> [--label <release-name>]');
    if (to === 'WORKTREE' && label !== to) throw new Error('--label requires a Git revision in --to');
    const before = this.readRevision(from); const after = this.readRevision(to);
    const beforeTotals = this.totals(before); const afterTotals = this.totals(after);
    const delta = Object.fromEntries(Object.keys(beforeTotals).map(category => [category, {
      files: afterTotals[category].files - beforeTotals[category].files,
      lines: afterTotals[category].lines - beforeTotals[category].lines,
      complexity: afterTotals[category].complexity - beforeTotals[category].complexity
    }]));
    const report = {
      from: { ref: from, commit: this.git(['rev-parse', from]) },
      to: { ref: label, sourceSha256: crypto.createHash('sha256')
        .update(JSON.stringify(after.map(row => [row.file, row.sha256]))).digest('hex'), dirtySnapshot: to === 'WORKTREE' },
      method: 'Physical lines; function complexity = 1 + if/loops/catch/nondefault-case/ternary/&&/||/??; nested functions measured independently. No optional-chain or default-parameter increments. CLI runtime TypeScript only; VSCode separate; tests, scripts, dependencies and build output excluded.',
      beforeTotals, afterTotals, delta, before, after
    };
    const directory = path.join(this.root, 'docs/metrics'); fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(path.join(directory, 'report.json'), JSON.stringify(report, null, 2) + '\n');
    const headings = '| 分类 | 基线文件 | 当前文件 | 基线行数 | 当前行数 | 行数增量 | 复杂度增量 |\n| --- | ---: | ---: | ---: | ---: | ---: | ---: |';
    const totals = Object.keys(delta).map(key => `| ${key} | ${beforeTotals[key].files} | ${afterTotals[key].files} | ${beforeTotals[key].lines} | ${afterTotals[key].lines} | ${delta[key].lines} | ${delta[key].complexity} |`);
    const inventory = after.map(row => `| ${row.file} | ${row.role} | ${row.category} | ${row.lines} | ${row.complexity} |`);
    fs.writeFileSync(path.join(directory, 'README.md'), [
      '# CLI 重构指标（脚本生成）', '', `比较：${from} (${report.from.commit}) → ${label}。`,
      to === 'WORKTREE' ? '当前版本读取工作目录中的源文件。' : '两个版本的源文件均从 Git 历史读取。',
      `当前版本源码校验值（SHA-256）：${report.to.sourceSha256}。`,
      '校验值根据统计范围内的文件路径和文件内容生成。仅更新文档和报告时，源码校验值保持相同。report.json 同时保存各文件的校验值和逐函数统计。', '',
      '运行 `npm run metrics`，比较 final 与工作目录中的当前代码。运行 `npm run metrics -- --from final --to p2`，比较 final 和 p2 两个标签对应的代码。', '',
      '正式打标签前，先提交源码，再运行 `npm run metrics -- --from final --to HEAD --label p2` 准备 p2 报告。将报告提交后创建 p2 标签。最后运行 `npm run metrics -- --from final --to p2` 核对，生成结果应与已提交报告完全一致。', '',
      'CLI 的统计范围是 src 下的 TypeScript 源码。VSCode 扩展的源码位于 vscode-extension/src，单独统计。',
      '表中的 kernel 表示内核，包括图形数据、文档操作、命令处理和文件读写。composition 表示装配处，包括 main 和 host，负责启动和加载插件。plugins 表示 src/plugins 下的插件。vscode 表示 VSCode 扩展。Phase 1 的命令位于 application/commands，按该版本的目录归入内核。', '',
      '行数按源文件的实际行数统计，包含空行和注释。增量等于当前值减去基线值。', '',
      '复杂度用于观察代码中判断和循环的数量。脚本分析 TypeScript 语法结构，每个有函数体的函数、方法或属性访问器从 1 开始计数。每遇到一个 if、循环、catch、case 分支、三元表达式，或 &&、||、?? 运算符，就增加 1。default 分支、可选链和默认参数增加 0。函数内部定义的函数单独计算。文件复杂度是各函数复杂度的总和。逐函数结果保存在 report.json。', '',
      headings, ...totals, '', '## 文件清单与职责', '', '| 文件 | 职责 | 分类 | 行数 | 复杂度 |', '| --- | --- | --- | ---: | ---: |', ...inventory, ''
    ].join('\n'));
    console.log(`Generated docs/metrics: ${before.length} → ${after.length} runtime files (VSCode separate).`);
  }
}

MetricsReport.run();
