# Design

仅在现有 owner 和已拥有的不可变输入生命周期内建立索引，用一套冻结基线完成本批验证。

## Context

实施基线为 `b3c8fecce5a2ff835948f76f9fd4fa5a8e2fe853`，建立计划前工作树干净。
测试账本基线为 704 个 Bun 实体、176 个语义 Case、15 个 Topic；完整闭合通过。
测量代理已在 `/tmp/vibe-low-risk-bench.OMhMtE/before` 保存只读源码副本、逐文件 SHA-256 与环境。
源码副本只供本批比较，不是另一工作区、当前规范或发布产物。

候选编号沿用[形成时调查](../../docs/investigations/audit-checks-core-algorithmic-complexity.md)，不将旧调查当作当前实现事实。
Run 的 graph validation、依赖读取和路径冻结由[Project Run](../../docs/development/project-run.md)及
[Scheduler](../../docs/development/scheduler.md)拥有；learned helper 仍通过[普通 prepared lifecycle](../../docs/development/package-tools.md#learned-critical-path-helper-owner)工作。

## Goals / Non-Goals

- 目标：局部 membership/lookup 与可等价的累计计算；一次集中交付，按 owner 保留可归因的 diff 和回退边界。
- 不做：R05 snapshot/context ownership 重构、跨阶段 graph 复用、调度队列/frontier/measurement 增量化、策略或评分调整、缓存一致性/容量政策、文件系统安全或递归预算改变。
- 不激活 `optimize-learned-admission-strategy` 或其它当前候选 Change；本批 T01/T02 只调整同一不可变输入的消费成本。
- 不引入依赖、全局缓存、跨 Run 状态、测试专用产品接口或新公开契约。

## Decisions

### Intended Change

| 切面 | 候选与局部调整 | 保持不变的边界 |
| --- | --- | --- |
| Core / Run | C01/C03 用 seen Set；R08 flags/direct relation/artifact lookup 使用相同调用生命周期索引；R04 按 scope 分组当前 prepare 的 tasks。 | C01 保留首次出现，C03 拒绝重复；get/list 的最新事实、直接授权及 provider identity；四次 prepare 和 validation/error 顺序。 |
| Checks | K04 path policy code-area membership；K07 滚动 argv 长度与可变当前 batch；K14 比较原始坐标，仅最终投影 range。 | 交集政策值和阈值、精确预算及 oversize 错误、路径/坐标/规则顺序及空值 fallback。 |
| Learned helper | T01/T02 在 prepared closure 内复用 graph、prediction、score、history 的不可变索引。 | 评分、tie、fallback、history schema、active state 和 invocation lifecycle；不得将跨 Run 状态交给 Product。 |
| 条件项（不采用） | C05 的 once-per-call Set 隔离候选未通过 2–5-key schema 保护性测量，正式源码保持原状。 | 不以大输入加速掩盖常见小输入成本；以后有实际消费者和预算再独立评估。 |

所有候选先取得真实入口和工作负载 baseline；没有足够收益证据或引入额外契约判断的项从本批剥离，而不扩大任务。
新代理数或指定模型容量不足时，保持指定模型和实施/独立审查分离，不静默改用其它模型。

### Resulting Impacts

1. 索引增加局部内存与准备成本；同时观察 small/scaled，并将准备和重复消费分开，不把局部比率冒称 Run 整体收益。
2. 私有接线可能变化，但 DTO、callback capability、schema、排序和错误优先序必须保持；相邻契约测试直接证明可观察行为。
3. 测试正文或节点改变时先核对 owner/Case，复用同一语义目的；共享 Case 与稳定 owner 文档由主线程协调串行写入。
4. 公开用法预期不变，因此不预设用户文档改动；独立 reviewer 从实际 diff 反查公开承诺、内部职责、JSDoc 和包边界，必要时补相应 owner。
5. before/after 脚本、原始结果及复现信息保存在当前 Change 的附加证据中；临时根待独立审查和归档完整性复核后精确清理，不新增无授权的独立调查报告。

## Risks / Trade-offs

- Set/Map 建立的固定成本可能使很小输入变慢；不承诺所有规模无回退，采用判断必须结合绝对成本与实际输入。
- first-match、duplicate-reject、排序稳定性和错误出现顺序不是可互换语义；实现及独立审查逐项核对。
- 正式计时不与 Gate、测试或其它测量并发；使用独立进程、warmup 和交错比较，保留失败及异常样本的原因。
- 实施代理曾两次遇到指定模型容量不足，第三次恢复后已进入实施；主线程新建下一实施代理、测量代理新建独立 reviewer 均受线程数限制，余下实施切面改为同一实施代理串行推进。没有独立审查结果前不能声称该项验收完成。

## Open Questions

- readiness 已确认各索引入口与生命周期；实际 diff 未引入 public contract、跨 Run 状态或错误重排，验证与取舍见[验收交接](acceptance.md)。
- 无产品验收开放问题。用户要求重试后成功新建指定模型独立 reviewer，审查无实质阻断；本轮未合入 main，也没有 Change 删除授权。

## Implementation Observations

- 2026-10-12：Core/Run readiness 确认 C01 first-occurrence 与 C03 duplicate-reject 必须分开；artifact lookup 采用 invocation-local Map closure 与冻结只读 façade，不暴露可变 Map。
- 原始 before 已取得 5 个独立进程、31 个 workload 的数据，全量序列化结果跨进程一致；脚本 strict TypeScript、完整 127-rule lint 和 format 通过。只证明局部 owner 成本，不是 Run 端到端收益。
- 首轮环境核对记录了 PATH 的 Bun 1.4.2 / Node 26.8.2，但随后发现它们不是项目固定版本；正式验收改用已安装的 `mise exec` Bun 1.3.14 / Node 24.18.0，before 与 C05 必须重采。首轮原始结果保留为环境差异记录，不作为最终采用或收益依据。
- R04 除 singleton-scope workload 外，追加无 scope 的 common-path 保护对照；分组前保留 root/membership 校验后在 scopes 为空时返回，不为默认路径增加一次 tasks 分组扫描。
- C05 隔离 probe 对 768 个字段/schema 组合验证等价；项目固定运行时下 5 对 AB/BA 的 2-key / 5-key 候选成本分别为 before 的 3.898 / 9.203 倍，512-key 为 0.302 倍。Set 构造计入每次调用，因常见小 schema 退化而不采用；没有修改正式 `closed-values.ts`。初始非固定版本的 3.547 / 4.954 / 0.279 比率只保留为探索记录。
- 临时测量根为 `/tmp/vibe-low-risk-bench.OMhMtE`；原始 before、C05 对照与预检失败修正记录均保留，待统一验收时归入当前 Change evidence。初始 before 将由最终同窗口的交错双侧测量补足，不拿延后 after 冒充交错实验。
- Core/Run 自测在项目固定 Bun 下为 108 pass / 0 fail；product typecheck、lint、format 和 Case 闭合通过。最初 PATH Bun 的 13 项失败原样记录，未以修改断言迁就运行时差异；完整 Gate 与独立审查仍待后续。
- Checks readiness 确认 K04 保留首个位置的政策数组与严格阈值，K07 保留 UTF-16 估计及超预算优先拒绝，K14 只消除比较阶段 range 投影，不改最终 Record 与排序。
- 项目固定运行时的 before 已重采完成：5 个独立进程、33 个 workload、每 workload 7 个计时批次，完整输出一致；before 的 722 个 src 文件 SHA-256 全部复核一致，重采没有覆盖初始原始材料。
- Checks 的 55 项目标测试通过，product typecheck/lint、format、Case 闭合与局部 diff 检查通过。SCC 边界证据包括 quote/backslash/astral、精确相邻预算、跨 batch 重置和首个 oversized 路径；Finding 证据包含相同排序键但不同结束位置的稳定 ordinal。
- Learned readiness 将 T01/T02 限定为五个现有模块：成功 prepared closure 的 graph/prediction/score 索引、单次 prediction 的 history 索引，以及单次 recording 的 immutable prediction 索引。历史合并的可变 Map 不缓存，现有 snapshot/getter shape 不改，原 find 的 first-match 语义显式保留。
- 三个实施切面均已完成并停止写入；Learned 29 项相关测试通过。未新增 activation-ID Set 或扩大策略范围。
- 首轮完整 Gate 42/43：唯一阻断为 strategy.ts 305 code lines 超过现有 300。删除单次使用的纯转发 comparator 后降至 298；没有修改限额/waiver。最终完整 Gate 43/43，candidate `0.0.0-local.aa7ca827d229`，保留 p95 Check duration advisory 告警。
- 最终 37 workload、5 对交错进程、2,590 批原始数据已取得，所有完整输出和顺序一致。before/after 源码、helper、配置和 binary 身份前后复核一致；主线程独立重算统计一致。详细结论与可复现材料见[验收交接](acceptance.md)和[测量证据](evidence/reading-guide.md)。
- 接受 C01/8 约 +1.26 µs、dependency 构造加 8 次读取约 +1.02 µs 的局部固定成本，以保留放大路径收益与简单实现；不声称所有输入无回退、不新增经验阈值。R04 的小规模与无 scope 对照方向不稳定，不计作已证明收益。
- 首次交接归档测量辅助物 6.5 MB，保留非固定 runtime 探索、失败 after、原始 lint 失败和重建摘要的区别。主线程另留两轮 Gate 日志及统计复算结果；当时独立审查因线程配额阻塞，没有结项或合入 main。
- 2026-10-12 重试成功：全新 GPT‑6.1‑sol 独立 reviewer 审查 b3c8fec → 7b1ca20f，实际执行 66 tests / 19 files、Case 闭合，复核 source/archive/全部测量统计，无产品实质阻断。任务 2.3 完成，未改产品源码。
- 独立审查 E1 澄清原始 public-prepare workload 实为 prepare（含 history read）+ 三次 decide，不能当 isolated prepare 或统一宣称 IO 不计时。新增[当前阅读说明](evidence/reading-guide.md)，保留原始 44 项测量交付及所有 SHA 不变，不重测。报告和命令另行归档。
