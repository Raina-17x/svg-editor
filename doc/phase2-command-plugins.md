# 第 5 步：stats 与 dir 命令插件

对应 phase_cli_2.md 第 2 节，并验证第 6 节的双装配机制。两个插件分别有独立目录和 package.json/contributes，不依赖内置命令表，也不互相导入。

## 运行

在仓库根目录执行，任选一种：

```powershell
# 代码装配：由 CliStartup 显式选择两个插件
npm run cli -- --code

# 配置装配：根据根目录 plugins.config.json 加载两个插件
npm run cli -- --config plugins.config.json
```

不带参数的 `npm run cli` 仍只启用 Phase 1 能力，供兼容性基线使用；此时 stats/dir 不在 help 中，执行时为 unknown command。--code 与 --config 是互斥启动方式，两者都通过 PluginInstaller.install。

配置中的 module 指向编译后插件包，npm run cli 会先构建并复制各包清单。设置某项 `enabled:false` 即可单独禁用它，或者删除该项；代码装配则在 CliStartup 组合根中单独选择 install 调用。

```text
svg> dir
[DIR]  docs
[DIR]  plugins
[FILE]  demo.svg
[FILE]  package.json
svg> init
canvas 800x600 created
svg> create rect r 1 2 3 4
rect#r created
svg> stats
rect: 1  (total 1, containers 0)
```

目录输出取决于启动进程的实际工作目录，上面仅示例。两个命令都不接受参数；多余参数按原 Args 规则报 invalid arguments。

## 插件与调用

| 包目录 | 入口与类 | 清单注册 |
| --- | --- | --- |
| src/plugins/command-stats | StatsPlugin.ts 默认导出 StatsPlugin 实例；StatsCommand.ts 实现 Command | @svgframe/plugin-command-stats，commands:[stats] |
| src/plugins/command-dir | DirPlugin.ts 默认导出 DirPlugin 实例；DirCommand.ts 实现 Command | @svgframe/plugin-command-dir，commands:[dir] |

StatsCommand 从公开 session.snapshot 取得脱离会话的文档，按当前子节点顺序深度优先遍历。使用 Map 保留叶子类型首次出现顺序，isContainer 为 true 的对象只计 containers；根 SVG 不计。它不枚举 g/box 名称，未来 box 能自然计入容器，其内部叶子仍统计。当前用测试复合 Panel 验证这条规则，正式 box 留待第 6 步。

DirCommand 仅使用 DirectoryAccess，不读取 session；没有 init/read 也能执行。目录先、文件后，其他项最后，各组采用 UTF-16 字符串升序比较，不依赖本机 locale。保留隐藏项，过滤 . 与 ..，不递归，不修改输入数组。标记后恰好两个空格。空目录输出 `(empty directory)`；list 失败输出 `error: cannot read directory: <path>`，CLI 可继续执行。

符号链接和其他特殊项统一用 `[OTHER]`，放在普通文件之后按名称排序。Node readdir 的 Dirent 判别不跟随符号链接目标。

## 适配器模式与状态保护

| 模式角色 | 实现 | 职责 |
| --- | --- | --- |
| Client | DirCommand | 按领域规则排列条目、生成输出和处理读取失败 |
| Target | application/extensions/DirectoryAccess | 提供 cwd 与 list(path)，隔离文件系统细节 |
| Adapter | infrastructure/NodeDirectoryAdapter | 用 Node API 实现 Target |
| Adaptee | node:fs.readdirSync / Dirent、process.cwd | 实际读取进程当前目录及文件类型 |

该接口和真实适配器在第 3 步已提供，本步接入 dir 没有修改它们。代码/配置装配使用同一个 DirCommand 类，均从同一 CommandContext 获得目录接口；测试可直接替换 Target，无需真实文件系统。

两个命令都不调用 edit/init/read/save 等写操作，不触发撤销屏障，也不发送会话修改事件，因此不影响当前或未来标签维护的 dirty 状态。read/save 不改变 cwd；失败 dir 不清空 redo。

## 验证

```powershell
npm run test:stats
npm run test:dir
npm run check
npm run check:baseline
```

stats.test.ts 和 dir.test.ts 可各自运行，使用公开模型与最小测试上下文，不依赖内置插件或彼此的插件。覆盖注册、统计顺序、普通和复合容器、空文档、无文档、参数；目录替身的混合项、隐藏项、特殊项、空目录、失败与稳定排序，以及真实临时目录的组合运行。

command-plugins.test.ts 验证四种独立启停组合与动态 help；成功/失败 dir 及 stats 不改变 SVG、保存路径、cwd、修改事件、undo/redo 和 IO 屏障；通过真实 CLI 进程比较 --code / --config 的完整 stdout 和保存 SVG。

新增会话位于 doc/transcript/cli-commands.txt，预期 stdout 单独保存为 cli-commands.expected.txt，输入/输出 SVG 位于 transcript/fixtures/commands-input.svg 和 commands-output.svg。测试建立固定 work 目录，输出 SVG 写在 work 外，日志仅捕获到内存，避免 dir 列表受到输出文件影响。先后两次运行均检查 work 内容未变化。

本步正式运行代码只新增两个插件包，并修改一个顶层装配文件 CliStartup；另修改配置、测试脚本、文档和自动指标。未修改内核、加载器、目录适配器和既有 builtin 插件。可用 `git diff --name-status` 审查本步差异；普通 commit 尚需保留，未创建或移动任何 tag。代码装配与配置装配的独立接入提交证据仍须按后续收尾要求整理，不以测试替代 Git 判据。
