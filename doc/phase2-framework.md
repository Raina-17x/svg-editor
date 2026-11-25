# 第 3 步：注册式 CLI 框架

## 范围与模块

`src/main.ts` 启动 DefaultHost 与 REPL。`src/host/DefaultHost.ts` 创建内核、存储和适配器，注册 `src/plugins/builtin/BuiltinPlugin.ts` 提供的六种图形与原有 19 个命令；没有可选命令或标签。`new DefaultHost(false)` 可构造不装任何插件的框架。

原命令类从 `src/application/commands/` 移到 `src/plugins/builtin/commands/`，原图形工厂中的构造、参数与读写规则移到 BuiltinShapeProvider 的六个注册实例。公开 Shape/Rect/Group 等模型保留在 domain；SvgDocument.group 用公开 Group 创建普通分组，不按类型名枚举插件。

NodeDirectoryAdapter 已接到命令上下文，但 dir 命令属于第 5 步。第 4 步现已完成配置加载、manifest 校验和注册回滚，默认内置插件也经过共同安装服务，详见 [插件加载说明](phase2-loading.md)。本篇其余内容记录第 3 步的框架设计。

## 实际扩展点清单

| 接口 | 内核调用文件与函数 | 实现 | 缺省行为 | 契约失败 |
| --- | --- | --- | --- | --- |
| ShapeProvider | application/ShapeFactory.create/fromSvg/toSvg；infrastructure/SvgCodec.encode/decode | plugins/builtin/BuiltinShapeProvider 六个实例；测试 PanelProvider | 默认六种图形；未知类型报错；未知 data-kind 的 g 降级普通分组 | 重复注册或读回选择键拒绝；错误 id/无效树报错；序列化字段无效报 invalid shape serialization；supports 不唯一报 shape provider conflict |
| Command | cli/CommandRegistry.execute/help | plugins/builtin/BuiltinCommand 装配各命令；测试 ProbeCommand | 未加载报 unknown command；默认 help 保持原输出 | 同名拒绝；参数由命令校验；非字符串数组反馈报 invalid command result |
| AttributeHandler | application/AttributeService.apply，经 SessionFacade.setAttribute → EditorSession.setAttribute/edit 调用 | 测试 AccentHandler；正式处理器后续实现 | 无命中走 Shape.set 原白名单 | 多重命中拒绝；探测或修改抛错、反馈无效，回滚工作文档与历史，不默认回退 |
| TreeDecorator | application/TreeLabels.notify/suffix，经 EditorSession 成功操作与 TreeRenderer.render 调用 | 测试 SuffixDecorator；正式标签后续实现 | 无标签时 tree 逐字节不变，无尾空格 | 回调异常或标签非字符串/含换行，禁用故障实例并输出 error，其他标签继续 |

`test/plugins/` 中的实现都是用于验证接口的类，不装入默认 CLI，也不冒充已经完成的正式可选插件包。正式 stats/dir、box、标签在后续步骤提供。

## 公开 API 与依赖

插件仅导入 `application/extensions/index.ts`、公开 domain 及本包文件。架构检查同时检查 import/re-export，禁止插件导入具体 EditorSession/ShapeFactory、宿主或其他插件；内核禁止导入 plugins/host。

为衔接原命令风格，公开接口增加了：SessionApi.document（深快照，未初始化仍报原错误）、setAttribute、tree；CommandContext.shapes（仅含 create 的 ShapeAccess）、help()；抽象 ExecutableCommand/EditCommand 与 Args 的公开导出。抽象命令现在依赖 SessionApi，不依赖 EditorSession。插件也可直接实现带 name/help/execute 的 Command。

BuiltinCommand 是两种命令风格的适配器。原 Token 通过显式读取 value/isQuoted 转为 CommandArgument，保留带引号的 in 与文本参数。动态帮助由已注册命令及图形语法生成；默认装配的组合帮助格式仍与 final 一致。

## 事务、快照与结构保护

EditorSession.edit 先克隆 before 与 working，在 working 上修改，执行文档验证、after 克隆、撤销反馈生成、最终提交克隆，全部成功才更新 current、undo/redo 和 ioBarrier，再通知标签。HistoryEntry 保存快照及已计算反馈，undo/redo 不重新执行插件。工作对象或反馈参数即使被插件持有，后续修改也不会影响 current/历史。

SvgDocument.validate 检查全局 id、共享/循环对象、叶子不能有孩子及每个 Shape.assertValid。clone 检查子类型、id、属性、文本、孩子顺序及对象分离。emptyCopy 丢失子类型会明确报错。

容器查询不再使用 instanceof Group，而使用 isContainer 与公开 insert/remove；测试 Panel 不继承 Group，仍能创建、嵌套、移动、读写和撤销。Shape 提供 assertCanDetach、assertCanUngroup、assertValid、creationSummary 通用钩子。SvgDocument 在 delete/group/addto/ungroup/reorder 拆出节点前调用保护钩子，供未来 box 保护部件和拒绝拆散；复合创建反馈也不需要内核按名称分支。

成功 init/read/save/resize/edit/undo/redo 后才通知标签。每个事件和行渲染回调分别得到独立快照，状态保存在实例中；故障标签被禁用并追加诊断，不回滚已成功编辑。标签应在 init/read 前装配，不支持热加载。

## 验证与指标

```powershell
npm run check
npm run check:baseline
npm run metrics
```

保留原 17 项测试的预期，只将 Fixture 改为默认宿主。新增五组测试（test/extensions.test.ts）：空内核与动态命令；非 Group 容器的子类型、读写降级、部件保护和 id 冲突；多部件属性撤销、冲突、部分失败保持历史；标签事件、顺序、快照及故障隔离；坏克隆、撤销反馈失败和保留工作引用。

三个会话与固定 final 比较 stdout 和 SVG 字节。其中 cli-core 是补充会话，包含 help/show、六种图形、错误和多种编辑操作。docs/metrics 首次产出 final → WORKTREE，按内核/装配/插件拆分，VSCode 单列；收尾时以 --to p2 重算历史报告，不能把本次快照当最终指标。

实际依赖图见 architecture-framework.puml；architecture-before.puml 为 Phase 1；architecture-planned.puml 仍是包含加载器的最终目标。

## 本轮检查与修正

首轮回归发现展开 Token 对象会丢失 getter 参数，已改显式读取并验证引号。撤销反馈前移至提交前生成，新增失败注入测试。会话门面及标签快照隔离也通过测试验证，避免只在文档中声明事务。
