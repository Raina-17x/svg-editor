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
      const role = file.includes('/extensions/') ? '公开扩展契约'
        : file.startsWith('src/domain/') ? '公开领域模型与不变量'
        : file.startsWith('src/application/commands/') ? 'Phase 1 内置命令（历史内核）'
        : file.startsWith('src/plugins/') ? '注册式内置能力实现'
        : file.startsWith('src/host/') || file === 'src/main.ts' ? '宿主对象装配'
        : file.startsWith('src/cli/') ? '输入解析与命令分派'
        : file.startsWith('src/infrastructure/') ? 'IO 适配与 SVG 编解码'
        : file.startsWith('vscode-extension/') ? 'VSCode 扩展（单独统计）' : '应用事务与扩展调度';
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
    if (!from || !to) throw new Error('Usage: --from <git-ref> --to <git-ref|WORKTREE>');
    const before = this.readRevision(from); const after = this.readRevision(to);
    const beforeTotals = this.totals(before); const afterTotals = this.totals(after);
    const delta = Object.fromEntries(Object.keys(beforeTotals).map(category => [category, {
      files: afterTotals[category].files - beforeTotals[category].files,
      lines: afterTotals[category].lines - beforeTotals[category].lines,
      complexity: afterTotals[category].complexity - beforeTotals[category].complexity
    }]));
    const report = {
      from: { ref: from, commit: this.git(['rev-parse', from]) },
      to: { ref: to, commit: this.git(['rev-parse', to === 'WORKTREE' ? 'HEAD' : to]), dirtySnapshot: to === 'WORKTREE' },
      method: 'Physical lines; function complexity = 1 + if/loops/catch/nondefault-case/ternary/&&/||/??; nested functions measured independently. No optional-chain or default-parameter increments. CLI runtime TypeScript only; VSCode separate; tests, scripts, dependencies and build output excluded.',
      beforeTotals, afterTotals, delta, before, after
    };
    const directory = path.join(this.root, 'docs/metrics'); fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(path.join(directory, 'report.json'), JSON.stringify(report, null, 2) + '\n');
    const headings = '| 分类 | 基线文件 | 当前文件 | 基线行数 | 当前行数 | 行数增量 | 复杂度增量 |\n| --- | ---: | ---: | ---: | ---: | ---: | ---: |';
    const totals = Object.keys(delta).map(key => `| ${key} | ${beforeTotals[key].files} | ${afterTotals[key].files} | ${beforeTotals[key].lines} | ${afterTotals[key].lines} | ${delta[key].lines} | ${delta[key].complexity} |`);
    const inventory = after.map(row => `| ${row.file} | ${row.role} | ${row.category} | ${row.lines} | ${row.complexity} |`);
    fs.writeFileSync(path.join(directory, 'README.md'), [
      '# CLI 重构指标（脚本生成）', '', `比较：${from} (${report.from.commit}) → ${to} (${report.to.commit})。`,
      to === 'WORKTREE' ? '当前是框架阶段的工作树快照，并非最终 p2 指标；源文件哈希见 report.json。' : '两端均从 Git 历史读取。', '',
      '运行 `npm run metrics` 更新工作树快照；最终运行 `npm run metrics -- --from final --to p2` 比较两个历史标签。', '',
      '只统计 src 下运行时 TypeScript；vscode-extension/src 单独列出。测试、脚本、依赖和构建产物排除。',
      'kernel 包含领域、应用、CLI 和基础设施；composition 是 main 与 host；plugins 是 src/plugins。Phase 1 的旧 application/commands 按当时目录归入 kernel。', '',
      '行数为物理行（含空行和注释）。复杂度为每个有函数体的函数/方法/访问器的 1，加 if、循环、catch、非 default case、三元和 &&/||/??；嵌套函数独立计算，不重复计数。不计可选链和默认参数。这是本项目固定的 AST 统计口径，不等同于所有工具的实现。逐函数明细见 report.json。', '',
      headings, ...totals, '', '## 文件清单与职责', '', '| 文件 | 职责 | 分类 | 行数 | 复杂度 |', '| --- | --- | --- | ---: | ---: |', ...inventory, ''
    ].join('\n'));
    console.log(`Generated docs/metrics: ${before.length} → ${after.length} runtime files (VSCode separate).`);
  }
}

MetricsReport.run();
