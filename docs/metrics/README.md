# CLI 重构指标（脚本生成）

比较：final (1fe4a0cb36c84caf1f135ebe534739c98d5d2db6) → p2。
两个版本的源文件均从 Git 历史读取。
当前版本源码校验值（SHA-256）：cbbf360d559c5d9d26b04c3d758e1a62c668082140dfa2903f695b3ccfe59044。
校验值根据统计范围内的文件路径和文件内容生成。仅更新文档和报告时，源码校验值保持相同。report.json 同时保存各文件的校验值和逐函数统计。

运行 `npm run metrics`，比较 final 与工作目录中的当前代码。运行 `npm run metrics -- --from final --to p2`，比较 final 和 p2 两个标签对应的代码。

正式打标签前，先提交源码，再运行 `npm run metrics -- --from final --to HEAD --label p2` 准备 p2 报告。将报告提交后创建 p2 标签。最后运行 `npm run metrics -- --from final --to p2` 核对，生成结果应与已提交报告完全一致。

CLI 的统计范围是 src 下的 TypeScript 源码。VSCode 扩展的源码位于 vscode-extension/src，单独统计。
表中的 kernel 表示内核，包括图形数据、文档操作、命令处理和文件读写。composition 表示装配处，包括 main 和 host，负责启动和加载插件。plugins 表示 src/plugins 下的插件。vscode 表示 VSCode 扩展。Phase 1 的命令位于 application/commands，按该版本的目录归入内核。

行数按源文件的实际行数统计，包含空行和注释。增量等于当前值减去基线值。

复杂度用于观察代码中判断和循环的数量。脚本分析 TypeScript 语法结构，每个有函数体的函数、方法或属性访问器从 1 开始计数。每遇到一个 if、循环、catch、case 分支、三元表达式，或 &&、||、?? 运算符，就增加 1。default 分支、可选链和默认参数增加 0。函数内部定义的函数单独计算。文件复杂度是各函数复杂度的总和。逐函数结果保存在 report.json。

| 分类 | 基线文件 | 当前文件 | 基线行数 | 当前行数 | 行数增量 | 复杂度增量 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| kernel | 41 | 40 | 842 | 1022 | 180 | 48 |
| composition | 1 | 6 | 11 | 235 | 224 | 114 |
| plugins | 0 | 32 | 0 | 506 | 506 | 205 |
| vscode | 0 | 4 | 0 | 152 | 152 | 35 |

## 文件清单与职责

| 文件 | 职责 | 分类 | 行数 | 复杂度 |
| --- | --- | --- | ---: | ---: |
| src/application/Args.ts | 管理文档操作并调用插件 | kernel | 7 | 5 |
| src/application/AttributeService.ts | 管理文档操作并调用插件 | kernel | 21 | 10 |
| src/application/Command.ts | 管理文档操作并调用插件 | kernel | 4 | 0 |
| src/application/DocumentStore.ts | 管理文档操作并调用插件 | kernel | 5 | 0 |
| src/application/DuplicateRegistrationError.ts | 管理文档操作并调用插件 | kernel | 3 | 1 |
| src/application/EditCommand.ts | 管理文档操作并调用插件 | kernel | 13 | 3 |
| src/application/EditorSession.ts | 管理文档操作并调用插件 | kernel | 101 | 30 |
| src/application/ExtensionRegistry.ts | 管理文档操作并调用插件 | kernel | 58 | 29 |
| src/application/HistoryEntry.ts | 管理文档操作并调用插件 | kernel | 7 | 3 |
| src/application/SessionFacade.ts | 管理文档操作并调用插件 | kernel | 22 | 13 |
| src/application/ShapeFactory.ts | 管理文档操作并调用插件 | kernel | 41 | 36 |
| src/application/TreeLabels.ts | 管理文档操作并调用插件 | kernel | 29 | 17 |
| src/application/TreeRenderer.ts | 管理文档操作并调用插件 | kernel | 24 | 7 |
| src/application/extensions/AttributeHandler.ts | 插件使用的公开接口 | kernel | 16 | 0 |
| src/application/extensions/Command.ts | 插件使用的公开接口 | kernel | 22 | 0 |
| src/application/extensions/DirectoryAccess.ts | 插件使用的公开接口 | kernel | 10 | 0 |
| src/application/extensions/Plugin.ts | 插件使用的公开接口 | kernel | 16 | 0 |
| src/application/extensions/PluginContext.ts | 插件使用的公开接口 | kernel | 12 | 0 |
| src/application/extensions/SessionApi.ts | 插件使用的公开接口 | kernel | 28 | 0 |
| src/application/extensions/ShapeAccess.ts | 插件使用的公开接口 | kernel | 4 | 0 |
| src/application/extensions/ShapeProvider.ts | 插件使用的公开接口 | kernel | 29 | 0 |
| src/application/extensions/TreeDecorator.ts | 插件使用的公开接口 | kernel | 21 | 0 |
| src/application/extensions/index.ts | 插件使用的公开接口 | kernel | 12 | 0 |
| src/cli/CommandProcessor.ts | 读取输入并调用对应命令 | kernel | 24 | 6 |
| src/cli/CommandRegistry.ts | 读取输入并调用对应命令 | kernel | 17 | 11 |
| src/cli/Repl.ts | 读取输入并调用对应命令 | kernel | 16 | 6 |
| src/cli/Token.ts | 读取输入并调用对应命令 | kernel | 5 | 3 |
| src/cli/Tokenizer.ts | 读取输入并调用对应命令 | kernel | 19 | 13 |
| src/domain/Circle.ts | 保存图形数据并检查图形结构 | kernel | 7 | 4 |
| src/domain/Ellipse.ts | 保存图形数据并检查图形结构 | kernel | 7 | 4 |
| src/domain/Group.ts | 保存图形数据并检查图形结构 | kernel | 30 | 23 |
| src/domain/Line.ts | 保存图形数据并检查图形结构 | kernel | 7 | 4 |
| src/domain/Rect.ts | 保存图形数据并检查图形结构 | kernel | 9 | 4 |
| src/domain/Shape.ts | 保存图形数据并检查图形结构 | kernel | 73 | 42 |
| src/domain/SvgDocument.ts | 保存图形数据并检查图形结构 | kernel | 122 | 67 |
| src/domain/Text.ts | 保存图形数据并检查图形结构 | kernel | 14 | 7 |
| src/domain/Value.ts | 保存图形数据并检查图形结构 | kernel | 32 | 21 |
| src/host/CliStartup.ts | 启动程序、选择插件并连接各部分 | composition | 27 | 7 |
| src/host/DefaultHost.ts | 启动程序、选择插件并连接各部分 | composition | 31 | 7 |
| src/host/PluginConfigLoader.ts | 启动程序、选择插件并连接各部分 | composition | 81 | 47 |
| src/host/PluginInstaller.ts | 启动程序、选择插件并连接各部分 | composition | 58 | 35 |
| src/host/RegistrationTransaction.ts | 启动程序、选择插件并连接各部分 | composition | 33 | 17 |
| src/infrastructure/FileDocumentStore.ts | 读写文件、读取目录或转换 SVG | kernel | 23 | 6 |
| src/infrastructure/NodeDirectoryAdapter.ts | 读写文件、读取目录或转换 SVG | kernel | 11 | 5 |
| src/infrastructure/SvgCodec.ts | 读写文件、读取目录或转换 SVG | kernel | 101 | 54 |
| src/main.ts | 启动程序、选择插件并连接各部分 | composition | 5 | 1 |
| src/plugins/builtin/BuiltinCommand.ts | 插件 builtin：BuiltinCommand | plugins | 9 | 2 |
| src/plugins/builtin/BuiltinPlugin.ts | 插件 builtin：BuiltinPlugin | plugins | 78 | 38 |
| src/plugins/builtin/BuiltinShapeProvider.ts | 插件 builtin：BuiltinShapeProvider | plugins | 37 | 23 |
| src/plugins/builtin/commands/AddToCommand.ts | 插件 builtin：AddToCommand | plugins | 11 | 3 |
| src/plugins/builtin/commands/CanvasCommand.ts | 插件 builtin：CanvasCommand | plugins | 7 | 4 |
| src/plugins/builtin/commands/CreateCommand.ts | 插件 builtin：CreateCommand | plugins | 15 | 5 |
| src/plugins/builtin/commands/DeleteCommand.ts | 插件 builtin：DeleteCommand | plugins | 11 | 3 |
| src/plugins/builtin/commands/GroupCommand.ts | 插件 builtin：GroupCommand | plugins | 8 | 3 |
| src/plugins/builtin/commands/HelpCommand.ts | 插件 builtin：HelpCommand | plugins | 5 | 2 |
| src/plugins/builtin/commands/InitCommand.ts | 插件 builtin：InitCommand | plugins | 7 | 4 |
| src/plugins/builtin/commands/MoveCommand.ts | 插件 builtin：MoveCommand | plugins | 19 | 5 |
| src/plugins/builtin/commands/OrderCommand.ts | 插件 builtin：OrderCommand | plugins | 8 | 4 |
| src/plugins/builtin/commands/ReadCommand.ts | 插件 builtin：ReadCommand | plugins | 7 | 2 |
| src/plugins/builtin/commands/RedoCommand.ts | 插件 builtin：RedoCommand | plugins | 7 | 2 |
| src/plugins/builtin/commands/SaveCommand.ts | 插件 builtin：SaveCommand | plugins | 7 | 2 |
| src/plugins/builtin/commands/ScaleCommand.ts | 插件 builtin：ScaleCommand | plugins | 8 | 3 |
| src/plugins/builtin/commands/SetCommand.ts | 插件 builtin：SetCommand | plugins | 5 | 2 |
| src/plugins/builtin/commands/ShowCommand.ts | 插件 builtin：ShowCommand | plugins | 14 | 4 |
| src/plugins/builtin/commands/TreeCommand.ts | 插件 builtin：TreeCommand | plugins | 5 | 2 |
| src/plugins/builtin/commands/UndoCommand.ts | 插件 builtin：UndoCommand | plugins | 7 | 2 |
| src/plugins/builtin/commands/UngroupCommand.ts | 插件 builtin：UngroupCommand | plugins | 11 | 3 |
| src/plugins/command-dir/DirCommand.ts | 插件 command-dir：DirCommand | plugins | 18 | 10 |
| src/plugins/command-dir/DirPlugin.ts | 插件 command-dir：DirPlugin | plugins | 8 | 1 |
| src/plugins/command-stats/StatsCommand.ts | 插件 command-stats：StatsCommand | plugins | 22 | 7 |
| src/plugins/command-stats/StatsPlugin.ts | 插件 command-stats：StatsPlugin | plugins | 8 | 1 |
| src/plugins/shape-box/Box.ts | 插件 shape-box：Box | plugins | 39 | 27 |
| src/plugins/shape-box/BoxAttributeHandler.ts | 插件 shape-box：BoxAttributeHandler | plugins | 23 | 8 |
| src/plugins/shape-box/BoxPlugin.ts | 插件 shape-box：BoxPlugin | plugins | 14 | 1 |
| src/plugins/shape-box/BoxProvider.ts | 插件 shape-box：BoxProvider | plugins | 35 | 11 |
| src/plugins/shape-box/BoxTypeDecorator.ts | 插件 shape-box：BoxTypeDecorator | plugins | 8 | 3 |
| src/plugins/tree-star/ModifiedStarDecorator.ts | 插件 tree-star：ModifiedStarDecorator | plugins | 37 | 17 |
| src/plugins/tree-star/TreeStarPlugin.ts | 插件 tree-star：TreeStarPlugin | plugins | 8 | 1 |
| vscode-extension/src/SvgDecorationProvider.ts | VSCode 扩展（单独统计） | vscode | 38 | 9 |
| vscode-extension/src/SvgOutlineProvider.ts | VSCode 扩展（单独统计） | vscode | 32 | 8 |
| vscode-extension/src/SvgStructureParser.ts | VSCode 扩展（单独统计） | vscode | 57 | 14 |
| vscode-extension/src/extension.ts | VSCode 扩展（单独统计） | vscode | 25 | 4 |
