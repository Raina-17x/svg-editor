# 第 6 步：box 复合图形插件

对应 Phase 2 第 3、4 节，以及 Phase 1 第 4.4、6.1 B 节。新增包位于 src/plugins/shape-box，名称 @svgframe/plugin-shape-box。它原子注册 box 提供者、box-attributes 属性处理器、box-type-label 标签，不依赖其他插件。

## 使用

```powershell
npm run cli -- --code
# 或：npm run cli -- --config plugins.config.json
```

两种方式均加载 stats、dir、box。不带参数仍只加载 Phase 1 内置能力；配置中禁用 box 项会同时取消它的三项注册。

```text
init
create box n1 120 100 160 60 "开始"
set n1 fill #f5a623
set n1 label "处理数据 v2"
undo
redo
tree n1
save example-box.svg
```

## 组成与行为

| 类 | 公开接口/职责 |
| --- | --- |
| Box | 公开 Group 的子类；模板不变量、深克隆、子部件保护及创建反馈 |
| BoxProvider | ShapeProvider，负责创建、序列化和完整读回 |
| BoxAttributeHandler | AttributeHandler，仅匹配 Box 的 fill/label；调用公开 setFill/setTitle |
| BoxTypeDecorator | TreeDecorator，仅为 Box 行追加 (box)，不维护 dirty 状态 |
| BoxPlugin | 通过 PluginContext 注册三个实例 |

模板直接包含 `<id>-rect` 与 `<id>-label`。矩形默认 fill=#4a90d9；文字位于 (x+20,y+35)，与要求示例一致。box 本身的 label 为 box#id，tree 基础标题为 g#id，再由标签插件追加 (box)。创建反馈、移动、属性反馈遵循官方 box 会话。move/scale 递归包含两个部件和额外嵌套节点；可以 in 普通分组或另一个 box，也能被 group 收编、整体删除和撤销。

fill 修改内部矩形，label 修改内部文本；处理器返回领域反馈与撤销反馈。每条 set 由框架工作副本事务提交为一个 undo 单元，redo 恢复快照。普通 rect 的 fill 仍走默认规则，label 仍未知，不扩张内核白名单。

## 不变量与 ADR 落实

- 派生 id 在整棵新增树上参与全局唯一检查；容器 id、矩形 id 或文字 id 任一冲突，整次创建失败，不留部分对象。
- 两个必要部件必须是直接孩子，id 精确匹配且类型分别为 Rect/Text；缺失、类型错误、重复均拒绝。额外孩子与嵌套 box 允许。
- 禁止直接 delete、addto 移走、group 收编必要部件；front/back 也会触发拆出保护。ungroup box 始终拒绝，包括根级 box。整体 delete/move/group 允许。失败的结构操作不损坏文档或历史。
- 序列化为 g + data-kind=box，保留外层样式和全部子节点顺序。读回采用实际子部件的位置、尺寸、文本、填充，不重新生成模板覆盖导入内容。
- 已安装插件时损坏的 box 拒绝整个 read，原文档、路径、历史不变。未装插件时降级普通 g；显式重复 id 始终由通用读入检查拒绝，不能降级绕过。
- clone 深复制全部孩子，保留 Box 类型、外层样式和嵌套类型，避免 Group 的默认空复制丢失子类型。
- 属性冲突仍按 ADR-001 拒绝多重命中；部分修改后抛错不默认回退。测试注入“先修改 fill 和标题再抛错”，验证文档与两条历史分支不变。

box 类型标签已在本包提供，便于完整复现版本 B；第 7 步仍须实现 modified-star 并验证二者独立并存。

## 验证与接入差异

`npm run test:box` 独立验证三类注册、模板、深克隆、几何操作、读回及处理器/标签，使用公开模型和测试替身，不激活其他插件。`box-integration.test.ts` 验证真实 CLI、单次撤销、嵌套、stats 协作、全局 id、保护、读回失败和事务回滚。

官方版本 B 的输入为 transcript/cli-1-box.txt，预期终端输出为 cli-1-box.expected.txt，保存 SVG 为 transcript/fixtures/flowchart-box.svg。完整会话在相同目录通过 --code 和 --config 两次执行，stdout 和 SVG 均逐字节一致且无 error。

旧 stats/dir 会话改为显式固定自己的两插件集合，避免未来新增图形帮助改变旧会话预期；原有预期文件未修改。默认无可选插件的 Phase 1 基线继续与 final 比较。

运行代码只新增 shape-box 包并修改一个顶层装配文件 CliStartup；配置另加 box 项。内核、加载器、基础设施和既有插件零差异。scripts/create-box-demo.cjs 使用临时 Git index 创建以第 5 步为共同父提交的两个演示分支：codex/box-code-demo 和 codex/box-config-demo。它不切换当前分支、不改普通暂存区、不创建或移动 tag；每棵演示树独立编译、运行测试并回放官方 box 会话后才创建对应提交。已有同名分支时拒绝覆盖。

生成的 doc/box-demo-evidence.json 记录父提交、两个提交、变更文件清单和验证结果。验收使用：

```powershell
git diff --name-status codex/box-code-demo^ codex/box-code-demo
git diff --name-status codex/box-config-demo^ codex/box-config-demo
```

代码演示只修改一个顶层装配文件；配置演示不修改既有运行源码。测试变更包括独立 box 单元测试、固定旧会话插件集合，以及用 .gitattributes 将历史 CRLF 预期输出规范为 LF（内容和运行逻辑不变），避免 Git 导出后字节比较失败。两分支需要随最终仓库推送，普通开发分支的完整 box 功能仍需保留过程提交。
