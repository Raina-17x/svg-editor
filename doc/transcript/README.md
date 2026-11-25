# Phase 1 兼容性基线

固定基线：`final` → `1fe4a0cb36c84caf1f135ebe534739c98d5d2db6`。不移动 tag。

| 文件 | 来源与用途 |
| --- | --- |
| `cli-1.txt` | `phase_cli_1.md` §6，仅提取 `svg>` 后的命令 |
| `cli-1a.txt` | §6.1 版本 A，手工组合流程图 |
| `cli-core.txt` | 第 3 步补充的兼容性会话，覆盖 help/show、六种图形、错误与结构编辑；不是官方示例 |
| `cli-1-box.txt` | §6.1 版本 B，待 box 插件接入后运行，不纳入 Phase 1 成功基线 |
| `fixtures/other.svg` | §6 的外部 SVG，含缺失 id 元素 |
| `*.expected.txt` | 从固定 final 源码实际执行得到的原始 stdout，含启动横幅，不含交互提示符 |

运行 `npm run check:baseline`：

1. 检查 final 仍指向固定提交。
2. 用 Git 只读导出 final 的源码和构建配置到仓库下新建的临时目录，不切换分支、不改工作树和 tag。
3. 分别编译 final 与当前版本，复用当前已安装的 TypeScript 和依赖；这检查的是源码行为兼容性，不是独立重装历史依赖的环境复现。
4. 在互相隔离的工作目录中提供相同输入和 `other.svg`，执行三个会话。
5. 比较 final 与冻结预期输出、当前与 final 的 stdout 字节，并比较保存的 SVG 字节。进程失败或 stderr 非空也失败。
6. 清理本脚本创建的临时目录。日志写入终端，不写进会话工作目录。

`node scripts/check-baseline.cjs --record` 仅在首次建立基线时使用，从固定 final 生成预期输出；重构期间不要通过重录掩盖失败。示例文档树中的排版空格不替代 final 的真实输出。

第 3 步只为新增 cli-core 会话补录固定 final 的预期；两个官方会话的预期内容没有改变。`.gitattributes` 强制预期输出使用 LF，避免 Windows Git 自动换行转换破坏字节比较。

第 3 步已接入注册式默认装配，入口只装内置能力，没有新增可选插件和树标签。脚本继续比较该入口与 final。尚无配置装配和插件启停参数；后续另加双装配及 stats/dir 会话。box 的成功预期不能用不支持 box 的 final 生成。
