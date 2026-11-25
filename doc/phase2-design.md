# CLI 插件式重构：基线与契约

## 当前状态

第 1 步已完成：核对完整 `phase_cli_1.md`、`phase_cli_2.md` 和 final；建立 §6、§6.1 A 的固定回归输出，预留 §6.1 B 输入。命令见 [基线说明](transcript/README.md)。

第 2 步交付的是可编译的公开接口和以下设计决策。接口位于 `src/application/extensions/`，统一类型导出为 `index.ts`。目前尚未被运行中的 CLI 调用：原 `CommandRegistry`、`ShapeFactory`、`EditorSession`、`SetCommand` 和 `TreeCommand` 保持原逻辑。不得把下表当作已经满足 Phase 2 的最终扩展点清单；接入后须补上实际文件/函数、插件实现和测试证据。

## 扩展点与调用计划

| 接口文件 | 职责 | 后续调用位置 | 缺省行为 | 契约违约处理计划 |
| --- | --- | --- | --- | --- |
| `ShapeProvider.ts` | 创建、读回、序列化一种图形 | `ShapeFactory.create/fromSvg`、`SvgCodec.encode/decode` | 默认装配注册六种既有图形；没有 box 时带标记的 g 降级为普通 g | 未注册类型沿用 Phase 1 错误；返回错误 id、无效子树或不支持的对象，整次创建/读入失败 |
| `Command.ts` | 提供命令名、帮助、参数校验与执行 | `CommandRegistry.parse` / 命令执行适配器、`HelpCommand.execute` | 默认装配保留全部 Phase 1 命令；可选命令未装入时 unknown command | 参数校验由命令负责，异常由宿主转为 error；声明只读的命令不能拿到活文档 |
| `AttributeHandler.ts` | 定义特定图形属性的领域行为 | `SetCommand.apply` 内的属性分派服务 | 无匹配时调用原 `Shape.set`，白名单不扩大 | 多重命中报 attribute handler conflict；执行抛错丢弃工作副本，不回退 |
| `TreeDecorator.ts` | 每行追加标签，接收成功操作事件 | `TreeCommand.execute` / 通用树渲染器、会话提交后的通知 | 无标签时原字符串逐字节不变 | 标签失败打印独立 error 并禁用该实例；不回滚已成功编辑、不污染其他标签 |

扩展点均由类或类实例实现；接口本身不依赖插件实现。当前 Phase 1 `application/Command.ts` 是依赖 `EditorSession` 的旧执行基类，新 `extensions/Command.ts` 是插件公开接口。第 3 步由适配层衔接旧命令，插件只依赖公开接口，不导入旧命令基类或具体会话。

`SessionApi` 是公开门面，`snapshot()` 返回深克隆，未初始化时为 undefined，stats 通过门面报告原有 no document 错误。插件编辑必须调用 `edit(EditOperation)`；只读操作不调用它。内置命令逐步迁移时保持 init/read/save/resize 的原有撤销屏障及反馈文本。dir 仅使用 `DirectoryAccess`，不要求文档存在。

## ADR-001：属性处理与事务

选择拒绝多个匹配，不引入优先级或隐式组合。处理器 `handles` 接收隔离的目标探测克隆，只判断类型和属性，不持有引用、不修改状态；多个处理器分别使用不同探测克隆。注册顺序不影响选择结果。

一次 set 流程：定位目标 → 收集所有命中 → 0 个使用原白名单 / 1 个 apply / 多个报错。apply 通过 `EditContext.require()` 与图形公开方法修改工作文档；box 处理器可用自身公开类检查类型并调用 `setFill/setLabel` 等方法，不访问私有字段。

宿主必须先完整建立 before 和 working 深快照，在 working 上执行，再验证所有图形不变量、全局 id 和 after 克隆；确认反馈也能生成后，才一次性提交 current、undo entry、redo 清空与事件。任何一步失败，原 current、保存路径、dirty 基准、undo/redo 栈与 ioBarrier 都保持不变。处理器失败不尝试默认 set；handles 抛错同样终止。处理器返回成功反馈及撤销反馈，redo 重用成功反馈；历史只恢复快照，不重新执行处理器。

插件不能执行额外文件写入、保留工作对象或篡改自身外部状态来参与事务；这里保证的是文档与历史的原子性，不是任意 JavaScript 副作用回滚。`activate` 仅注册，不能修改文档。相关失败注入及多部件一次 undo 测试将在运行接入时补齐。

## ADR-002：图形创建、克隆和 SVG 读回

`ShapeProvider.name` 是 create 类型名；`svgTag + dataKind` 是读回选择键。读到标记时先找精确标记提供者，没有则查该 tag 的无标记提供者；这是通用规则，不枚举 box 名称。相同选择键不能由不同提供者争用，加载校验应拒绝当前插件。序列化用 supports 在探测克隆上选择唯一提供者；0 个或多个均报告错误。无标记 g 提供者不得将 box 类误判为自身支持类型。

读入先解析完整 XML 和检查所有显式 id，再按后序把完整 children 交给 provider.read；只在整个文档完成验证后替换会话。未知 data-kind 的 g 降级为普通分组，仍保留子图形。已装 box 插件但必要子部件缺失或类型错误时，选择拒绝整个 read；重复 id 始终拒绝，不用降级掩盖。

box 派生 id 为 `<id>-rect`、`<id>-label`。创建时一次检查整棵新增子树与现有 id，不能逐个提交。默认填充 `#4a90d9`，标签位置按 §4.4 示例的 `(x+20,y+35)`，不引入额外文本居中属性。box 的内部必要部件禁止直接 delete、addto 移走、group 收编或 ungroup 拆散；删除/移动整个 box 允许，继续嵌套允许。第 3 步须先为容器提供通用结构保护钩子，之后 box 通过覆写钩子表达规则，不能在内核增加 box 分支。

每个插件 Shape 的 clone 必须深克隆且保留运行时子类型、语义、不变量和子节点顺序；不能把 box 克隆为普通 Group，也不能重复生成模板子部件。ShapeProvider.read 接收已有 children，不能重新模板化覆盖导入坐标。创建、解析、快照恢复后均保持不变量。现有 Group.clone/container 对 Group 的依赖须在第 3 步审查和泛化，不能留到 box 接入提交再改。

## ADR-003：dirty、事件与树标签

选择“当前内容与上次成功保存/读入的内容比较”。init 以新建空画布为初始基准；初始无星，新建图形立即有星。保存成功和读取成功重置基准；失败不重置。undo 回到保存点星消失，redo 后重新出现。保存后的撤销屏障仍遵守 Phase 1。

modified-star 实例私有字段保存基准签名，不用模块级集合。按节点自己的属性、文本和有序子树比较，因此后代变化会传播到祖先及 SVG 根；删除节点也会使仍存在的祖先变脏。画布尺寸变化使根变脏。type/语义标记参与比较，标签显示不参与比较。

成功 init/read/save/resize/edit/undo/redo 后，宿主按注册顺序将各自独立的深克隆事件交给标签；失败操作无事件。每行 likewise 提供隔离快照，标签不能影响当前文档或其他标签。标签必须在文档初始化前装配。若未来支持热加载，需增加初始化快照协议，本阶段不支持热加载。

标签按插件加载顺序、插件内部注册顺序拼接；每个非空标签前增加一个空格。没有标签绝不加尾空格。box-type-label 和 modified-star 互不导入、互不访问状态。标签异常隔离并禁用故障实例，向宿主报告错误；编辑的成功结果和历史保持已提交状态。

## ADR-004：共同注册路径、清单校验与回滚

代码装配传入 manifest、默认导出实例和 options；配置装配解析模块并读取其 package.json manifest，随后调用同一个安装服务。manifest.name 来自包名。默认导出需有 activate 方法；没有 default 与 default 结构不合法分别按 no default export 和 failed to activate 报错。仅支持同步 activate；返回 thenable 应视为失败，避免延迟注册逃逸事务。

安装服务创建激活期 PluginContext，只向本插件暂存四类注册，逐项校验对象方法和名称；检查同类别名称的全局/本地重复，抛 duplicate registration。activate 成功返回后，将 contributes（缺省空）与实际注册的四类名称集合比较；重复的声明项视为清单不合法，不能用集合去重掩盖。还须校验 shape 读回选择键唯一。所有检查通过才提交四张表；任何失败丢弃全部暂存注册，保留之前成功插件并继续。上下文激活结束即失效，后续 register 报错。

配置必须为对象，plugins 为数组；每项 module 为非空字符串、enabled 为可选 boolean、options 为可选普通对象。先验证整个配置结构，再开始加载，避免前几项已加载后才发现后面的结构错误；非法时打印 `error: invalid plugin config`，保留默认内置装配。enabled:false 完全跳过。相对路径相对配置文件目录，包名使用该目录的 Node 模块解析规则。options 原样传给 activate（缺省空对象），不由内核解释。

顶层模块解析失败才报告 not found；解析成功后求值失败、依赖缺失都报告 failed to activate，不可把嵌套 MODULE_NOT_FOUND 当作顶层模块找不到。

错误格式遵守 Phase 2 第 6 节：

```text
error: plugin not found: <module>
error: plugin has no default export: <module>
error: plugin manifest mismatch: <name> (declared: …, registered: …)
error: plugin failed to activate: <name> (<reason>)
error: duplicate registration: <category>/<name>
error: invalid plugin config
```

主程序继续；manifest mismatch 的两端按类别和名称稳定排序输出，便于测试。额外契约错误作为 failed to activate 的 reason 报告。两种方式加载顺序、options、初始 SVG、工作目录相同时 stdout 必须逐字节一致。

## 目录适配器设计

`DirectoryAccess` 是 Target，未来 NodeDirectoryAdapter 是 Adapter，Node fs 是 Adaptee，DirCommand 是 Client。cwd 由适配器提供进程当前目录，read/save 不改它；list 只返回直接项，目录/文件/其他三类，不替命令排序。DirCommand 排序采用 JS 字符串 `<`/`>` 的 UTF-16 次序，目录先、文件后，避免 locale 差异；点开头项保留。其他项（含不跟随目标的符号链接）单独放最后，用 `[OTHER]` 标记并排序，此为允许的特殊项显示约定。空目录和读取失败沿用题目固定格式。目录接口和命令逻辑由两种装配共用。

## 后续验证清单

- 第 3 步：框架调用四接口，内置实现注册，快照保留子类型，结构保护钩子，基线与现有测试不变，首次 metrics。
- 第 4 步：同一安装路径的失败四分支、重复与回滚、非法配置、依赖失败分类、disabled/options/相对路径测试。
- 第 5 步：独立 stats/dir 包；目录测试替身、真实固定临时目录、成功失败均不影响文档和历史。
- 第 6 步：box 冲突和完整性、部分属性修改失败回滚、单次 undo/redo；A/B 各自 Git 提交证据。
- 第 7 步：标签状态机、保存失败、祖先传播、undo 保存点、两个标签独立并存。
- 第 8 步：禁用可选插件的 final 对比；同插件集合与顺序的 A/B 基础、box、stats/dir 会话比较；生成指标与最终证据。

## AI 协作检查记录

本轮核对发现原始 Phase 1 要求起初缺失；补齐后从原文提取会话，而未用自拟会话冒充官方验收。又确认当前 CLI 与 final 源码无差异，使用固定历史提交实际运行生成基线，不手写预期输出。接口设计特别修正了直接把旧 Command/EditorSession 暴露给插件的方案，改为公开门面；这些是本轮检查事实，运行插件的验证尚未发生。
