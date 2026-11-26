# 交付验收检查表

在仓库根目录运行 `npm run acceptance`，可以重新执行全部自动检查。运行日志和结果摘要保存在 `doc/validation`。

下表列出每项要求对应的代码、测试和验证材料。README 的章节均指本目录下的 [项目文档](README.md)。

| 验收内容 | 检查方法与材料 |
| --- | --- |
| 在同一个仓库中持续开发 | 远程仓库为 Raina-17x/svg-editor。Git 历史保留了从 final 开始的各阶段提交，以及两条 box 演示分支 |
| p2 标签 | 按当前安排，在最终检查完成并确认版本后创建 |
| CLI 与 VSCode 源码 | CLI 源码在 src，扩展源码在 vscode-extension/src。两个工程分别提供构建配置和依赖锁文件 |
| 四个扩展点 | README 第 3 节列出接口、调用位置、实现类和禁用后的行为。test/extensions.test.ts 检查框架接入，各插件另有独立测试 |
| 模块依赖方向与新增插件的改动范围 | validation/architecture.log 记录依赖检查。validation/history.json 记录 Git 差异检查，先确认目录存在，再排除新增插件目录，检查内核和原有插件的差异是否为空 |
| stats 和 dir 命令 | test/stats.test.ts、test/dir.test.ts 单独测试各插件。test/command-plugins.test.ts 检查命令启用、禁用及 help 内容随插件变化的结果 |
| dir 的目录接口与适配器 | README 第 5 节说明目录接口和适配器的分工。test/dir.test.ts、test/command-plugins.test.ts 使用模拟目录和真实目录，检查排序、读取失败和撤销历史 |
| box 图形 | test/box.test.ts、test/box-integration.test.ts 检查创建、属性修改、撤销重做、内部结构，以及禁用插件后按普通分组读入的结果。官方 box 会话的输入和预期结果在 transcript 目录 |
| 树形标签 | test/modified-star.test.ts、test/tree-labels.test.ts 检查 (box) 与星号同时显示、标签各自保存状态，以及修改子节点后祖先也显示星号的行为。transcript 中的 cli-labels 会话检查完整命令流程 |
| 插件加载与失败处理 | test/loader.test.ts 检查两种装配使用的加载流程，包括四条加载失败路径、重复注册、失败后撤销本次注册、依赖错误分类和配置格式错误 |
| 两种方式接入 box 的 Git 证据 | codex/box-code-demo 展示代码装配，codex/box-config-demo 展示配置装配。box-demo-evidence.json 和 validation/history.json 记录检查结果 |
| 两种装配的输出一致 | validation/assembly 保存 cli-1、cli-1a、cli-1-box、cli-commands、cli-labels 五组会话的输出和比较结果。每组使用相同的四个插件、运行目录和初始文件。日志保存在被检查目录之外 |
| 保持 Phase 1 功能 | validation/phase1-baseline.log 记录与 final 的比较结果。检查时禁用可选插件，逐字节比较命令输出和保存的 SVG 文件 |
| VSCode 文件标记、大纲和异常输入 | images/phase2 中的四张截图展示文件标记、大纲定位、编辑后更新及不完整 SVG 的处理结果。validation/extension-tests.log 保存文件标记和大纲的自动测试结果 |
| VSCode 设计模式与代码复用 | README 第 7 节说明 VSCode 与扩展各自负责什么、注册后怎样被调用，以及各模块可以怎样复用 |
| 架构图、设计决策与 AI 协作记录 | README 第 2、6、9 节分别提供重构前后架构图、四项设计决策，以及使用 AI 时的检查和修正记录 |
| 自动生成的代码指标 | docs/metrics 保存文件清单、职责、行数和复杂度。scripts/generate-metrics.cjs 从 Git 历史生成统计。先用 HEAD 准备标为 p2 的报告，提交报告并创建标签后，再从 p2 生成并核对结果。用源码校验值确认前后统计的文件内容一致 |
