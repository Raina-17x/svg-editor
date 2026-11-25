# Phase 1 兼容性基线

固定基线：`final` → `1fe4a0cb36c84caf1f135ebe534739c98d5d2db6`。不移动 tag。

| 文件 | 来源与用途 |
| --- | --- |
| `cli-1.txt` | `phase_cli_1.md` §6，仅提取 `svg>` 后的命令 |
| `cli-1a.txt` | §6.1 版本 A，手工组合流程图 |
| `cli-core.txt` | 第 3 步补充的兼容性会话，覆盖 help/show、六种图形、错误与结构编辑；不是官方示例 |
| `cli-commands.txt` | 第 5 步新增 stats/dir 会话，command-plugins.test.ts 验证代码/配置装配与固定预期，不交给 final 执行 |
| `cli-1-box.txt` | §6.1 版本 B，第 6 步由 box-integration.test.ts 验证；不交给不支持 box 的 final 执行 |
| `cli-1-box.expected.txt` / `fixtures/flowchart-box.svg` | 正式 box 会话的 stdout 和保存 SVG，独立保存并用于双装配比较 |
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

默认无参数入口只装内置能力，基线脚本继续比较该入口与 final。根配置现已启用 stats/dir，--code 也启用同一集合。新增命令会话由 command-plugins.test.ts 验证，目录固定、日志在内存、输出 SVG 位于列举目录之外；预期输出和输入/输出 SVG 分开保存。box 的成功预期不能用不支持 box 的 final 生成。
