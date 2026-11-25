# 第 4 步：插件加载与装配

对应 phase_cli_2.md 第 6 节。代码装配和配置装配共用 PluginInstaller.install；默认内置能力也经过此服务校验，不再绕过安装事务。

## 使用方式

默认代码装配：

```powershell
npm run cli
```

配置装配（保留默认内置能力，再按数组顺序加载可选插件）：

```powershell
npm run cli -- --config plugins.config.json
```

根配置现启用 stats、dir、box，也可通过 `npm run cli -- --code` 用代码装配同一集合。无参数启动仍仅有 Phase 1 能力。没有自动发现或自动加载配置；只有传 --config 时读取。配置不存在或不合法时打印 invalid plugin config，并继续以默认内置能力启动。用法见 [命令插件](phase2-command-plugins.md) 和 [box 插件](phase2-box.md)。

配置项格式：

```json
{
  "plugins": [
    { "module": "./dist/src/plugins/example", "options": { "prefix": "demo:" } },
    { "module": "@svgframe/example", "enabled": false }
  ]
}
```

这里 example 是格式示例，尚未提供该正式插件。module 为非空字符串，enabled 缺省 true，options 缺省空对象且必须为对象。先验证整个配置，再开始加载，避免错误配置造成部分启用。enabled:false 完全跳过解析与执行。

相对模块路径以配置文件目录为基准，而非工作目录；包名使用该目录的 Node 模块解析规则。插件选项原样传入 activate，内核不解释其字段。支持 CommonJS 的显式 exports.default、TypeScript 编译后的默认导出实例，以及 ESM 默认导出（包括模块求值阶段的顶层 await）。activate 本身必须同步，异步激活拒绝并不提交注册。

## 插件包与代码装配

插件 package.json 提供 name、main 和 contributes，四个类别为 shapes/commands/decorators/attributes，未声明的类别视为空数组。例如：

```json
{
  "name": "@svgframe/example",
  "main": "index.js",
  "contributes": { "commands": ["echo"] }
}
```

入口默认导出带 activate 方法的实例；扩展点也由类实例实现。activate 只注册功能，不能修改文档或进行不可回滚的外部操作。名称必须稳定，清单同一类别不能有重复名称。模块入口所属最近一层 package.json 用作清单；不要在插件入口和包清单之间放无关 package.json。

在代码装配处，调用 `host.installer.install(manifest, pluginInstance, options)`。返回空数组表示成功，否则返回 error 诊断数组。DefaultHost 中内置插件展示了实际用法；新增插件只需在组合根加入导入和安装，不改内核或加载器。配置装配则只改配置与新增包文件。

`npm run build` 会在 TypeScript 编译后自动把 src/plugins 下各包 package.json 复制到 dist 的对应目录，让运行时能读取清单并解析 main。插件源码仍需编译为 JavaScript；加载器不负责执行 TypeScript。内置包也有自己的 manifest 和 main。复制脚本按目录遍历，不硬编码具体包名。

## 安装事务

1. PluginInstaller 校验 manifest 与默认实例。
2. RegistrationTransaction 从现有 ExtensionRegistry 创建候选注册表。
3. activate 经临时 PluginContext 注册四类扩展，检查名称、方法、重复与读回选择键。
4. activate 返回后关闭上下文；声明与实际注册按类别比较名称集合，诊断输出按固定类别及名称排序。
5. 全部通过才一次发布候选注册表。失败丢弃全部暂存项，保留之前成功插件并继续后续项。

即使插件自己 catch 了重复注册异常，该事务仍标记失败，不能偷偷提交之前的部分注册。持有旧 PluginContext 在激活结束后再调用 register 会报 context is closed。注册回滚针对注册表，不声称能回滚任意插件文件写入或其他外部副作用。

错误格式：

```text
error: plugin not found: <module>
error: plugin has no default export: <module>
error: plugin manifest mismatch: <name> (declared: …, registered: …)
error: plugin failed to activate: <name> (<reason>)
error: duplicate registration: <category>/<name>
error: invalid plugin config
```

只有顶层解析失败才报 not found；解析成功后的语法、模块求值、依赖缺失均报 failed to activate。清单格式错误、读回键冲突、默认导出结构错误也归入 failed to activate。诊断打印后启动 REPL，继续处理命令。

## 实现位置与验证

| 文件 | 职责 |
| --- | --- |
| src/host/PluginInstaller.ts | 两种装配共同的校验和提交入口 |
| src/host/RegistrationTransaction.ts | 暂存注册、失败标记、上下文有效期 |
| src/host/PluginConfigLoader.ts | 配置解析、动态模块解析和清单读取，不导入具体插件 |
| src/host/CliStartup.ts | 解析 --config、输出加载诊断、启动 REPL |
| src/application/ExtensionRegistry.ts | 候选注册表复制及无回调的批量提交 |
| scripts/copy-plugin-manifests.cjs | 编译后的通用包清单复制 |

执行 `npm run check` 和 `npm run check:baseline`。新增 test/loader.test.ts 共 11 组，覆盖四类同时提交/回滚、清单不符、激活抛错、重复、上下文失效、非法配置全量预检、disabled、options、相对路径、包名、依赖失败分类、ESM、实际编译后的 TypeScript 默认导出，以及真实 CLI 子进程继续启动。

A/B 一致性测试在相同工作目录、插件实现与 options 下比较完整 CLI stdout 字节（包含启动横幅），并比较直接执行会话结果。stats/dir 和官方 box 会话均已补充；box 两条独立接入演示提交见 [第 6 步说明](phase2-box.md) 与 box-demo-evidence.json。最终验收仍须汇总全部证据。

本轮实现没有移动 final 或创建 p2。加载器中的分支仅处理通用模块格式、配置和错误，不列举具体插件名字。当前指标更新为 final → WORKTREE 快照，最终仍需从 p2 重算。
