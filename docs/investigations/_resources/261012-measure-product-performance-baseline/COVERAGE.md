# 产品域性能覆盖

本页说明[性能主报告](../../measure-product-performance-baseline.md)各数值覆盖的分支。
精确输入清单和样本通过 `combined-evidence.json` 定位，统计口径见 [METHODS.md](METHODS.md)。

**直接实测**指公开操作有样本；**间接覆盖**指阶段在完整 Run 内执行但未隔离；**沿用**保留前段证据的运行时与输入条件；
**仅源码／待测**表示该分支尚无操作计时。新测量均走源码 API；Node 24.18.0 为主，Bun 1.3.14 单列。

## 九项 Check

九项 Node 主基线均采用原 glob／领域配置、输出关闭、并发 1，首轮后取 3 次重复，全部 completed／passed。
主报告集中展示耗时，本表补充证据路由和分支边界。

| Check | 实际覆盖 | 解释条件 |
| --- | --- | --- |
| `duplicateDetection` | 自然输入、cache off；沿用 Bun cache 对照 | Gate 已启用 cache；多 location 形状见算法调查 |
| `fileMetrics` | SCC 4.0.0；1 finding、0 blocking | Node/Bun 同 options／manifest，scanner 内部阶段未隔离 |
| `functionMetrics` | 正常仓库语料；沿用 Bun Layer C／未闭合输入专题 | Node 病理输入待测 |
| `jsonValidation` | 289 valid JSON，含调查资源 | 单文件显式 8 MiB，区别于默认 1 MiB |
| `jsonSchemaValidation` | 5 schemas、4 valid bindings；offline | HTTPS／远端引用待测 |
| `maintenanceReminders` | 30 clear entries，3 个实际 first-parent bases | 距 HEAD 10／20／30 commits；changedLines 为 19002／368377／461097 |
| `markdownLinkValidation` | Node 323 文件，cache off；沿用 Bun cache 对照 | 前段 Bun 为 322 文件，语料不同；Node cache 待测 |
| `markdownLint` | Node 559 文件、8 rules、cache off；沿用 Bun cache 对照 | 前段 Bun 为 558 文件；Gate 已启用 cache，Node cache 待测 |
| `secretDetection` | 无秘密合成文本，0 secret／coverage gap | 秘密命中、大量 finding 与 gap 分支待测 |

显式路径四项是首轮加 2 次重复的诊断样本。Check／Definition 构造在窗口外；Run 内 validation、normalization、
prepare、Record／terminal settlement 间接覆盖。`parse*Data` helpers 和复杂错误语法没有独立计时。

## Core、输出与随包工具

除单列的 selection 和大图证据外，下表直接样本均有 Node/Bun 两组。

| 产品域 | 实测／间接覆盖 | 其余边界 |
| --- | --- | --- |
| Definition／Check | 九项完整 Run；10 prepared Checks | 声明构造未计时；inherit／完整 flag AST 变体仅源码 |
| Scheduling／settlement／aggregation | 10 Checks、P=4、1000 Records、10 messages；100 no-op Checks | 前者 completed/passed；内部阶段未拆分 |
| 大图 Scheduler | 沿用 Bun P=1、N≤2048；diagnostic N≤1024；高 P 的 N≤512 | Node 大图与真实 IO 任务待测 |
| Git／flags | HEAD~1；实际 not-applicable／flag-condition-not-matched、duration null、strict aggregate failed | 本样本没有执行 Check |
| Relations／typed handoff／取消 | relations／handoff 仅源码；沿用 Bun 病理输入 caller abort | 全面 Node 取消、丰富失败分支待测 |
| Machine publication | 1000 Records，machine-only／all，返回 succeeded | DTO／serialization／write 合并计时；临时产物未独立 schema audit |
| Diagnostics | 同负载，diagnostic-only／all，channels succeeded | 计量和日志成本未拆分 |
| Progress | plain stdout，Record／message preview 各 1，succeeded | TTY、formatter fault、长 preview 待测 |
| Project files | 603 source TS 直接 collect，Check 内 collection 间接覆盖 | no-follow／失效 FS 仅源码 |
| Selection 表示 | Node 单次 collection：24 glob／853 explicit patterns，同 853 路径 | 私有 Check 分批选择另有形状；等价性修正见方法 |
| File-region index | 5000 paths、16 pattern + 16 member regions；追加 100、查询 10000 次 | 无文件 IO，追加按契约全量重建 |
| Canonical／closed 数据 | 5000 rows / 552,781 B，text／normalize／closed array/record 组合 | 各 export 未隔离；deep alias／恶意 descriptor 待测 |
| Change-flag debug | 603 files、3 regions，格式化 143,561 B | 假想当前全集，区别于 Git delta |
| AdmissionGraph | 128-task chain，128 次 select／settle，settled 128 | resources／mutex／fanout 变体仅源码 |
| `cacheJsonByKey` | 约 552 KB，首次 miss、3 hits，compute 一次 | 并发 miss、损坏恢复、大目录待测 |
| Learned | 100 flat no-op Checks、P=4，正常 prepared；selection-proposed=100，terminal effects succeeded | 本地 history 重复；空初态未独立记录，fallback／大 history 待测 |
| Finding 工具 | 1000 findings、100 waivers、limit 10；100 waived、11 messages | 复杂 identity 待测 |
| `commandCheck` | Node eval：2 B stdout、exit 0、discard、5 秒 timeout，passed | 大输出、environment resolver、timeout fault 待测 |
| 常量／authoring helpers | defaults／excludes 间接使用 | `defineAdmissionPolicy`、flags DSL 等机械 helper 仅源码 |

## 环境与容量缺口

安装包／Gate、OS／进程冷启动、跨平台、真实消费者规模与预算、产品级 CPU/heap/GC 和稳定尾延迟均未形成基线。
当前证据适用于本机源码公开操作及明确负载。
