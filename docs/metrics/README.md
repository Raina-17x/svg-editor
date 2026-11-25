# CLI 重构指标（脚本生成）

比较：final (1fe4a0cb36c84caf1f135ebe534739c98d5d2db6) → WORKTREE (b3efbfa035f52186be43539bd794783a4ae3372b)。
当前是框架阶段的工作树快照，并非最终 p2 指标；源文件哈希见 report.json。

运行 `npm run metrics` 更新工作树快照；最终运行 `npm run metrics -- --from final --to p2` 比较两个历史标签。

只统计 src 下运行时 TypeScript；vscode-extension/src 单独列出。测试、脚本、依赖和构建产物排除。
kernel 包含领域、应用、CLI 和基础设施；composition 是 main 与 host；plugins 是 src/plugins。Phase 1 的旧 application/commands 按当时目录归入 kernel。

行数为物理行（含空行和注释）。复杂度为每个有函数体的函数/方法/访问器的 1，加 if、循环、catch、非 default case、三元和 &&/||/??；嵌套函数独立计算，不重复计数。不计可选链和默认参数。这是本项目固定的 AST 统计口径，不等同于所有工具的实现。逐函数明细见 report.json。

| 分类 | 基线文件 | 当前文件 | 基线行数 | 当前行数 | 行数增量 | 复杂度增量 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| kernel | 41 | 40 | 842 | 1022 | 180 | 48 |
| composition | 1 | 6 | 11 | 230 | 219 | 114 |
| plugins | 0 | 25 | 0 | 342 | 342 | 137 |
| vscode | 0 | 4 | 0 | 152 | 152 | 35 |

## 文件清单与职责

| 文件 | 职责 | 分类 | 行数 | 复杂度 |
| --- | --- | --- | ---: | ---: |
| src/application/Args.ts | 应用事务与扩展调度 | kernel | 7 | 5 |
| src/application/AttributeService.ts | 应用事务与扩展调度 | kernel | 21 | 10 |
| src/application/Command.ts | 应用事务与扩展调度 | kernel | 4 | 0 |
| src/application/DocumentStore.ts | 应用事务与扩展调度 | kernel | 5 | 0 |
| src/application/DuplicateRegistrationError.ts | 应用事务与扩展调度 | kernel | 3 | 1 |
| src/application/EditCommand.ts | 应用事务与扩展调度 | kernel | 13 | 3 |
| src/application/EditorSession.ts | 应用事务与扩展调度 | kernel | 101 | 30 |
| src/application/ExtensionRegistry.ts | 应用事务与扩展调度 | kernel | 58 | 29 |
| src/application/HistoryEntry.ts | 应用事务与扩展调度 | kernel | 7 | 3 |
| src/application/SessionFacade.ts | 应用事务与扩展调度 | kernel | 22 | 13 |
| src/application/ShapeFactory.ts | 应用事务与扩展调度 | kernel | 41 | 36 |
| src/application/TreeLabels.ts | 应用事务与扩展调度 | kernel | 29 | 17 |
| src/application/TreeRenderer.ts | 应用事务与扩展调度 | kernel | 24 | 7 |
| src/application/extensions/AttributeHandler.ts | 公开扩展契约 | kernel | 16 | 0 |
| src/application/extensions/Command.ts | 公开扩展契约 | kernel | 22 | 0 |
| src/application/extensions/DirectoryAccess.ts | 公开扩展契约 | kernel | 10 | 0 |
| src/application/extensions/Plugin.ts | 公开扩展契约 | kernel | 16 | 0 |
| src/application/extensions/PluginContext.ts | 公开扩展契约 | kernel | 12 | 0 |
| src/application/extensions/SessionApi.ts | 公开扩展契约 | kernel | 28 | 0 |
| src/application/extensions/ShapeAccess.ts | 公开扩展契约 | kernel | 4 | 0 |
| src/application/extensions/ShapeProvider.ts | 公开扩展契约 | kernel | 29 | 0 |
| src/application/extensions/TreeDecorator.ts | 公开扩展契约 | kernel | 21 | 0 |
| src/application/extensions/index.ts | 公开扩展契约 | kernel | 12 | 0 |
| src/cli/CommandProcessor.ts | 输入解析与命令分派 | kernel | 24 | 6 |
| src/cli/CommandRegistry.ts | 输入解析与命令分派 | kernel | 17 | 11 |
| src/cli/Repl.ts | 输入解析与命令分派 | kernel | 16 | 6 |
| src/cli/Token.ts | 输入解析与命令分派 | kernel | 5 | 3 |
| src/cli/Tokenizer.ts | 输入解析与命令分派 | kernel | 19 | 13 |
| src/domain/Circle.ts | 公开领域模型与不变量 | kernel | 7 | 4 |
| src/domain/Ellipse.ts | 公开领域模型与不变量 | kernel | 7 | 4 |
| src/domain/Group.ts | 公开领域模型与不变量 | kernel | 30 | 23 |
| src/domain/Line.ts | 公开领域模型与不变量 | kernel | 7 | 4 |
| src/domain/Rect.ts | 公开领域模型与不变量 | kernel | 9 | 4 |
| src/domain/Shape.ts | 公开领域模型与不变量 | kernel | 73 | 42 |
| src/domain/SvgDocument.ts | 公开领域模型与不变量 | kernel | 122 | 67 |
| src/domain/Text.ts | 公开领域模型与不变量 | kernel | 14 | 7 |
| src/domain/Value.ts | 公开领域模型与不变量 | kernel | 32 | 21 |
| src/host/CliStartup.ts | 宿主对象装配 | composition | 22 | 7 |
| src/host/DefaultHost.ts | 宿主对象装配 | composition | 31 | 7 |
| src/host/PluginConfigLoader.ts | 宿主对象装配 | composition | 81 | 47 |
| src/host/PluginInstaller.ts | 宿主对象装配 | composition | 58 | 35 |
| src/host/RegistrationTransaction.ts | 宿主对象装配 | composition | 33 | 17 |
| src/infrastructure/FileDocumentStore.ts | IO 适配与 SVG 编解码 | kernel | 23 | 6 |
| src/infrastructure/NodeDirectoryAdapter.ts | IO 适配与 SVG 编解码 | kernel | 11 | 5 |
| src/infrastructure/SvgCodec.ts | IO 适配与 SVG 编解码 | kernel | 101 | 54 |
| src/main.ts | 宿主对象装配 | composition | 5 | 1 |
| src/plugins/builtin/BuiltinCommand.ts | 注册式内置能力实现 | plugins | 9 | 2 |
| src/plugins/builtin/BuiltinPlugin.ts | 注册式内置能力实现 | plugins | 78 | 38 |
| src/plugins/builtin/BuiltinShapeProvider.ts | 注册式内置能力实现 | plugins | 37 | 23 |
| src/plugins/builtin/commands/AddToCommand.ts | 注册式内置能力实现 | plugins | 11 | 3 |
| src/plugins/builtin/commands/CanvasCommand.ts | 注册式内置能力实现 | plugins | 7 | 4 |
| src/plugins/builtin/commands/CreateCommand.ts | 注册式内置能力实现 | plugins | 15 | 5 |
| src/plugins/builtin/commands/DeleteCommand.ts | 注册式内置能力实现 | plugins | 11 | 3 |
| src/plugins/builtin/commands/GroupCommand.ts | 注册式内置能力实现 | plugins | 8 | 3 |
| src/plugins/builtin/commands/HelpCommand.ts | 注册式内置能力实现 | plugins | 5 | 2 |
| src/plugins/builtin/commands/InitCommand.ts | 注册式内置能力实现 | plugins | 7 | 4 |
| src/plugins/builtin/commands/MoveCommand.ts | 注册式内置能力实现 | plugins | 19 | 5 |
| src/plugins/builtin/commands/OrderCommand.ts | 注册式内置能力实现 | plugins | 8 | 4 |
| src/plugins/builtin/commands/ReadCommand.ts | 注册式内置能力实现 | plugins | 7 | 2 |
| src/plugins/builtin/commands/RedoCommand.ts | 注册式内置能力实现 | plugins | 7 | 2 |
| src/plugins/builtin/commands/SaveCommand.ts | 注册式内置能力实现 | plugins | 7 | 2 |
| src/plugins/builtin/commands/ScaleCommand.ts | 注册式内置能力实现 | plugins | 8 | 3 |
| src/plugins/builtin/commands/SetCommand.ts | 注册式内置能力实现 | plugins | 5 | 2 |
| src/plugins/builtin/commands/ShowCommand.ts | 注册式内置能力实现 | plugins | 14 | 4 |
| src/plugins/builtin/commands/TreeCommand.ts | 注册式内置能力实现 | plugins | 5 | 2 |
| src/plugins/builtin/commands/UndoCommand.ts | 注册式内置能力实现 | plugins | 7 | 2 |
| src/plugins/builtin/commands/UngroupCommand.ts | 注册式内置能力实现 | plugins | 11 | 3 |
| src/plugins/command-dir/DirCommand.ts | 注册式内置能力实现 | plugins | 18 | 10 |
| src/plugins/command-dir/DirPlugin.ts | 注册式内置能力实现 | plugins | 8 | 1 |
| src/plugins/command-stats/StatsCommand.ts | 注册式内置能力实现 | plugins | 22 | 7 |
| src/plugins/command-stats/StatsPlugin.ts | 注册式内置能力实现 | plugins | 8 | 1 |
| vscode-extension/src/SvgDecorationProvider.ts | VSCode 扩展（单独统计） | vscode | 38 | 9 |
| vscode-extension/src/SvgOutlineProvider.ts | VSCode 扩展（单独统计） | vscode | 32 | 8 |
| vscode-extension/src/SvgStructureParser.ts | VSCode 扩展（单独统计） | vscode | 57 | 14 |
| vscode-extension/src/extension.ts | VSCode 扩展（单独统计） | vscode | 25 | 4 |
