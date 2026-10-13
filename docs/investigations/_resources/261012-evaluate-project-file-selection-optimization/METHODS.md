# 文件选择测量方法与资源阅读路径

本页说明 2026-10-12 的取证方法及后续代码整理，结论由[主报告](../../evaluate-project-file-selection-optimization.md)拥有。
资源中的 raw、源码快照和 patch 保存形成时事实；辅助脚本的审查后版本不是这些旧样本的生成身份。

## 先按复核问题选材料

| 要复核的内容 | 资源 |
| --- | --- |
| 最终同边界结果、采样和源码身份 | `phase-b-lazy-summary.json`、`phase-b-lazy-{node,bun}-frozen-fixture.json`、`final-filesystem-collection.ts` |
| 重复编译归因 | `node-instrumented-profile.json`、Phase A `summary.json` |
| 输入与 before | `manifest.json`、`fixture-provenance.json`、`before-source-provenance.json`、三个 `before-*.ts` |
| 超长 pattern 的错误上下文 | 四份 `long-literal-*-{unguarded,guarded}.json` |
| 采用过程 | `phase-b-summary.json`、`lazy-default-provenance.json`、`pre-lazy-filesystem-collection.ts` |
| 行为、Gate 及文档容量 | `behavioral-verification.json`、`delivery-verification.json` |
| 当时脚本与审查后脚本的区别 | `helper-source-history.json` 的完整源文本/hash，以及当前 helper 文件 |

## 环境、输入与计时层

基线 HEAD 为 `08c9166b85152168ca27d45452a4174afed50e57`，修改前 Product 等同 `5cb448b`。Linux x64；
`mise exec -- node` 为 24.18.0，`mise exec -- bun` 为 1.3.14。Bun 的 `process.versions.node` 是 compatibility 字段，
不表示以 Node 运行。

Phase A 在真实 workspace 上冻结 24 条 glob patterns 选出的 853 文件，以及产生同路径结果的 853 条显式 patterns。
Phase B 物化相同 path/bytes/SHA-256 的 853 个普通文件和必要目录，共 4,111,410 bytes；六个源码漂移条目从固定 HEAD 恢复。
物化集合没有 workspace 未选目录，故其绝对耗时与 Phase A 分开解释。

before 保存原 collection 三模块与 hash，受控可运行副本只调整内部 import；after 从生产 `src/index.ts` 进入。
最终计时包含构造 API options 与同步调用，collect 返回即停止，import、准备、完整 paths/frozen 断言、hash 和 logging 在外。
fixture 与 after 源码身份在窗口前后核对。样本串行，OS cache 未清理，首轮不叫 cold start。

## 阶段与方法纠正

1. **Phase A：** 单独 profile 定位 singleton 重复编译；native/literal 公开调用与临时候选各首轮一次、3 warm。
   第一次与无效 require-cache instrumentation 重叠的 baseline 被排除并重采；空计数不作证据。
   后续审查发现临时候选终点包含 `JSON.stringify` 路径断言、baseline 未包含，故这组 raw 不作精确同窗口收益。
2. **初次 Phase B：** 同 fixture、每侧首轮一次 + 3 warm、逐轮 AB/BA，返回即停止计时。
   Node glob 中位数 16.6→23.5 ms 的小样本不能确定一般回归；静态检查确认默认 20 matcher 无条件构造是可避免工作。
3. **最终惰性默认层：** 先在计时外运行 Node/Bun 三目标文件各 12/12，再逐轮 AB/BA。
   glob 每侧首轮一次 + 12 warm，explicit 每侧首轮一次 + 3 warm，每运行时 34 调用完整路径/hash/frozen 一致。
   中位数对偶数样本取中间两项平均；共享宿主/进程样本不是独立宿主重复。
4. **错误语义：** 超长 ASCII literal 在 lossy-entry 场景会改变 Error/cause 包装；加原 parser 长度资格后，两运行时各两场景同错误。
   这不是新公共限制。旧 unguarded raw 与修复后 raw 分开保留。

## 脚本身份与重跑准备

`helper-source-history.json` 保存八份审查前脚本完整 UTF-8 文本与 SHA-256，供恢复当时动作。
当前八个 helper 已按编码规范整理：显式 argv/JSON/unknown-error 边界、具名 IO 阶段和具体类型；`helper-inputs.ts` 只承接共同输入不变量。
计时块及生成候选的历史 replacement 字符串保持，原 raw、模块快照和 patch 未改，也未用审查后脚本重测性能。
输入拒绝校验与旧性能 A/B 是不同证据。

这些脚本依赖冻结输入、固定 runtime 和受控 tmp 布局，不是维护中的 benchmark CLI。重跑前须取得测量范围授权，
准备新的输出目录，将当前 helper 连同 `helper-inputs.ts` 放回受控布局，恢复源码/输入并逐项核对 hash；不要从资源目录直接运行或覆盖旧 raw。
历史 Phase A 名称映射为 `measure-public-api.ts`→`measure.ts`、`prepare-experiment-copies.ts`→`prepare-copies.ts`、
`measure-experiment-copy.ts`→`copy-measure.ts`、`differential-probe.ts`→`equivalence.ts`。
最终窗口当时命令为：

```text
mise exec -- node tmp/optimization-20261012/file-selection/measure-lazy-default.ts
mise exec -- bun tmp/optimization-20261012/file-selection/measure-lazy-default.ts
```

复制测试曾被 Bun 发现机制误纳入注册。其后完整快照隔离至本 owner 的 `node_modules/literal`，
物化 fixture 位于 `node_modules/frozen-fixture`，内容/模式/身份核对后重跑 Test Evidence 通过；历史路径不冒称现行位置。
这些短期工作物仍在原任务 tmp 内用于复核，正式资源只保留必要证据；后续清理需确认复核需要和精确授权。
