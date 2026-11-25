# 第 7 步：modified-star 与 box 类型标签

对应 phase_cli_2.md 第 5 节。新增包 src/plugins/tree-star（@svgframe/plugin-tree-star），仅注册名为 modified-star 的 TreeDecorator 实例。原 shape-box 包的 BoxTypeDecorator 继续提供 (box)，两个插件互不导入、互不访问彼此的状态。

## 运行与观察

```powershell
npm run cli -- --code
# 或 npm run cli -- --config plugins.config.json
```

完整装配顺序为 stats、dir、box、tree-star，所以同一行标签顺序为 `(box) *`。配置调整插件顺序后可以得到 `* (box)`，框架按注册顺序拼接；两种顺序均有测试。

```text
init
create g flow
create box n 120 100 160 60 "开始" in flow
tree
save labels.svg
tree
set n label "处理数据"
tree
undo
tree
redo
tree
```

保存后的再次修改会显示：

```text
svg (800x600) *
└── g#flow *
    └── g#n (box) *
        ├── rect#n-rect x=120 y=100 w=160 h=60 fill=#4a90d9
        └── text#n-label (140,135) "处理数据" *
```

undo 回到保存点后星号消失，(box) 保留；redo 后星号重新出现。新建 box 时，两个新部件和所有祖先都加星。init 刚建立的空画布不加星。

## ADR-003 的具体选择

1. **内容比较，而非是否执行过编辑命令。** 成功 init 建立空文档基准；成功 read/save 重置基准。普通编辑、undo/redo 和 resize 不重置。因此同值 set 不出现星号；undo 到保存点也消星。失败的编辑/read/save 不改变基准。保存后的 undo 屏障仍遵守 Phase 1，必须再次成功编辑后才能撤销该编辑。
2. **向祖先传播。** 比较节点自己的 id、type、容器属性、文本和有序子树。子孙变化使祖先和根加星；未改变的兄弟保持无星。删除节点不再显示该行，但其原祖先会加星。移动归属、重排改变父级结构；节点本身内容不变时不额外标星。画布尺寸改变只直接使 SVG 根加星。
3. **顺序由装配决定。** 两个标签按注册顺序拼接，各标签前一个空格，彼此不认识。禁用 tree-star 不影响 (box)，禁用所有标签时原 tree 字节不变。

属性按名称排序后比较，忽略属性插入顺序；几何值、属性是否存在、文本、节点类型和孩子顺序仍影响结果。这里比较模型内容，不比较最终树标签、浏览器外观或 SVG 文件排版。Box 的 type=box 自然参与比较，不需要导入其实现。

## 状态封装与框架边界

ModifiedStarDecorator 的 savedNodes/savedRoot 都是实例私有字段，保存规范化内容签名，不保存会随文档变化的引用；没有模块级集合。每次 activate 创建独立实例，多宿主不会共享基准。onChange 只在 init/read/save 成功时替换基准；decorate 根据当前快照返回空字符串或星号，不修改文档。

注册必须早于 init/read，本阶段不支持热加载；收到首个基准事件前 decorate 返回空标签，避免擅自把某次渲染当保存点。框架已有的事件、快照和后缀调用点无需改动。

本步只新增 tree-star 插件并修改顶层装配与配置，未修改内核、TreeRenderer、TreeLabels、加载器或任何既有插件。旧 box 会话测试固定原来的三插件集合，原预期输出保留；新完整标签会话单独保存，避免用改写旧预期掩盖回归。两条已有 box 演示分支和 tag 均未改变。

## 测试与证据

```powershell
npm run test:star
npm run check
npm run check:baseline
```

modified-star.test.ts 独立验证注册、实例隔离、编辑→保存→再编辑→undo 保存点→redo、read/init 重置、祖先传播、删除、重排、画布尺寸、同值编辑及属性顺序。tree-labels.test.ts 验证 box 并存与两种顺序、保存仅去星、失败读写和编辑不改基准，以及完整 CLI 双装配。

会话输入为 transcript/cli-labels.txt，预期 stdout 为 cli-labels.expected.txt，保存 SVG 为 transcript/fixtures/labels.svg，分别存放。双装配运行之间移除第一次的保存文件，使相同工作目录中的初始文件一致；日志捕获在内存。比较完整 stdout 与 SVG 字节，并确认无 error。

无可选插件的基础会话仍由 check:baseline 与固定 final 比较。当前指标更新为工作树阶段快照；第 8 步仍须完成整体交付与最终 p2 指标。
