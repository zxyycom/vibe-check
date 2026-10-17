# Design

本设计固定引用图的身份、观察与执行契约；实施顺序和完成状态由 [Tasks](tasks.md) 承接。

## Context

- [公开指南](../../docs/checks/markdown-link-validation.md)拥有现有预算、计数及安全契约；
  [内部 owner](../../docs/development/markdown-link-resolution.md)实现逐引用授权、探测及成功标题事实复用。
- `options-resolution.ts` 的默认值为单文件 `1_048_576` bytes、`10_000` occurrences、`1_000` target reads。
  `final-data.ts` 已按安全整数及计数关系校验，没有固定的万级结果上限。
- [缓存 Decision](../../docs/decisions/warn-on-explicit-markdown-parse-cache-capacity.md)和
  [Gate cache Decision](../../docs/decisions/enable-gate-markdown-parse-cache.md)仍是当前有效判断；
  它们仍约束当前实现。任务 1.2 在修改产品前演进逐引用探测、canonical target memo 与预算方向，
  保留显式 parse-facts cache 的配置、内容身份、容量提醒与 best-effort publication 承诺。

## Goals / Non-Goals

### Goals

- 按节点取得事实、按边保留判断，降低重复引用放大的目标工作量。
- 完整验证所选文档，保持安全边界和可核对的结果，并提供协作取消与预算选择。

### Non-Goals

本 Change 限于 Markdown Link Check 与 Gate 配置。通用或持久图、跨 Check resolver、增量依赖系统，
以及共享文件收集和并发模型的调整均在范围外。

## Decisions

### Intended Change

#### 图与身份

采用单次 invocation 的有向多重引用图，允许循环与重复边。节点键由以 canonical project root 为解析基准的
归一化逻辑绝对路径及授权域组成；root-contained 与显式 root-external validate 分开，键只在 Check 内使用。
源文档与目标是可共存的角色，身份不依赖文件存在、`realpath` 或 inode。

| 数据 | 职责 |
| --- | --- |
| 节点表 | 保存身份、角色、源解析事实及授权后取得的目标观察。 |
| 边表 | 保存来源、引用身份与位置、目标描述和锚点，为逐引用判断提供依据。 |
| 节点需求 | 从边派生存在性、类型、标题或目录单 entry 检查，驱动事实获取。 |

每条边先独立分类目的地与授权策略。远程及 root-external ignore/report 分支直接形成边结果，不创建目标 I/O 需求。
不同逻辑路径的别名各自观察；本次不合并其文件系统状态。现有 parse-facts cache 仍可按授权读取后的精确字节身份复用解析事实。

#### 分阶段执行与观察

1. 按既有 source 顺序读取、解析全部所选 Markdown，登记边并累计 occurrence；正文与 AST 随处理释放。
2. 从全部边聚合需求，按首次引用顺序处理目标节点；仅对符合类型与选项的需求读取正文、标题或目录 entry。
3. 按源文档、occurrence 顺序逐边判断，保留重复无效引用的独立 Finding。
4. 完整成功并完成末次取消检查后，按既有边界发布普通链接 Records 与 final data。

同一节点的所需事实成功取得后固定，缺失也作为完整观察复用；读取、解码或解析失败立即使 Check unavailable。
已加载源节点在同一授权域内提供其首次事实，无需为目标角色重新读取。纯目标节点只提供所需事实，
即使解析出链接也不扩展源集合。观察不是全文件系统原子快照，后续替换或创建由下次 invocation 发现。

阶段边界、每个源/目标节点完成后，以及每处理 256 条边时，通过私有 `setImmediate` Promise 交还事件循环；
让步前后检查取消。节点工作串行，普通 Finding 的完整发布区间不插入让步。
`await Promise.resolve()` 不替代实际事件循环让步；单次同步 Markdown 解析仍受单文件字节边界而非抢占式取消保护。

#### 预算与计数

| 字段 | authoring / resolved 契约 |
| --- | --- |
| `maxOccurrences`、`maxTargetReads` | `number \| false`；省略物化为原默认值，`false` 关闭，数字为正安全整数。 |
| `maxMarkdownBytes` | 保持原默认值、正整数规则及 `16_777_216` 最大值。 |

两项总量预算取消固定配置最大值；拒绝 `true`、`null`、零、负数、非整数、非有限数及不安全整数。
Gate 在原 selection、blocking policy 和 cache 配置下显式关闭两项总量预算。
occurrence 预算在登记边时检查；target 预算仍按逻辑 occurrence 计费，包含缺失目标和节点事实复用。
同文档引用及不进入目标验证的远程、外部 ignore/report 分支不计 target reads。

节点完成必要的授权分类/containment probe 后，在读取额外正文或目录 entry 前，预检并记入其全部计费边；
已有源事实也消耗相同额度。超限立即 unavailable，不启动后续节点。此预算不等于 syscall 上限。
`targetReadCount` 与其余 final-data 字段保持原含义、形状和安全整数关系；不增加 machine DTO。

### Resulting Impacts

#### 兼容、安全与文档

保留现有选中文件分类、拒绝输入 Records、零输入/全拒绝结算、Finding policy 和安全投影。
新的首错顺序为：options/root/输入分类 → 源阶段（含 occurrence 预算）→ 目标阶段（含节点批次预算）→ 逐边结算。
目标阶段按首次引用排序，取消仍在各检查点优先。阶段化和节点批次预检可能改变多故障时首先报告的原因，
这是需要更新指南及测试的契约变化，不要求复现旧交错执行的首错。

保留 root-external 三态、逐段 symlink 授权、no-follow final-leaf、单文件读取与目录单 entry 边界。
缓存的授权不为新 I/O 放行；同文档锚点仍使用源事实。公开指南/JSDoc 说明预算、观察和首错，内部 owner
说明图与让步；同步 Gate、Case 及 external-consumer options 验收，既有 v4 schema 与 DTO 无需改形。

#### 证明与测量协议

硬门禁是功能、安全、计数和以下操作量关系：每个逻辑节点至多取得一次观察；已有源事实不新增目标正文读取；
目标正文、标题及目录 entry 只因实际需求取得。循环、重复边、缺失、别名、替换、多故障、预算和 timer/I/O
取消分别有可证伪测试，操作量插桩与正式计时分开。

任务 1.1 在运行时修改前创建 Markdown owner 内的专用 `measurement.test-support.ts`，从公共 `run/defineConfig`
测量。它属于产品测试支持，不建立从 `changes/**` 或普通 scripts 直接消费 Product runtime 的新入口。
冻结 before bundle、源码/lockfile identity、fixture manifest 与原始样本于本 Change 的 `evidence/`；after 使用相同协议。

- 输入：冻结实际所选文档及其直接目标的内容与路径结构；合成热点引用及独立附件两种形状，
  各为 1,000 和 8,000 条计费边，路径深度 3/32。fixture 由临时项目 helper 管理并 finally 清理，证据中不复制 Git 仓库。
- 配置：显式使用 before 支持的有限预算（target `10_000`、occurrence `100_000`），相同选项及输出关闭；
  关闭预算后超过旧上限的执行另作正确性验收，不与 before 的超限退出比较耗时。
- 状态与样本：缓存关闭、启用但为空、命中分别测量；每组先 warmup，再以独立进程交替运行 5 对 before/after。
  空缓存每个样本重新建立，命中样本先在计时外填充；不清 OS page cache。
  固定 Node/Bun 及依赖版本，记录 OS/CPU、输入字节与哈希、样本、median/MAD、I/O 计数和每进程峰值 RSS。
  Node 为正式计时宿主，Bun 用于构建与测试；实际运行命令与版本写入 evidence manifest。
- 判定：操作量是硬门禁，耗时与 RSS 是必须报告的取舍证据；不新增未经测量的毫秒、百分比或 MiB 硬阈值。
  按[规模收益取舍](../../docs/decisions/weigh-performance-costs-against-scaling-benefits.md)解释局部代价，
  既有 Gate 性能预算及其 warning policy 保持。任何加速结论必须有同输入、同配置的已完成执行支持。

基线采样由任务 1.1 承接。证据由 Change 管理，结项前交接必要长期结论。

## Risks / Trade-offs

- 全量关系与标题事实占用额外内存，独立附件的复用空间有限；空间随节点、边及标题量增长，原文与 AST 不全量保留。
- 逐节点观察牺牲后续文件变化的可见性；单次解析和完整发布仍有同步窗口，协作让步不提供抢占式实时保证。
- 总量预算关闭后，调用方承担更大的总体资源消耗；单文件边界与取消能力不是进程级资源隔离。

## Open Questions

无。公共契约与执行选择已固定；模块命名、私有 helper 拆分和测量器实现由实施任务在这些约束内完成。
