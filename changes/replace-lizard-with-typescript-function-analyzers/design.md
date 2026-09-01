# Design

本设计以当前 Product contract 为迁移边界：完整替换 Lizard backend，而不是只为 TypeScript/Rust 增加 fast path。实现按真实共同不变量复用基础设施，并让语言语义由 reader/family-local modules 拥有。

## Context

`functionMetrics` 当前位于 `src/package-checks/function-metrics/**`，通过 local `lizard/**` adapter 执行 Lizard 1.23、解析 CSV，再把 measurements 转换为 area-owned Records 和 final data。public constructor 的 `scanner.executable` 只服务于这条外部 command path。

旧 Change 建立后，aligned Decision 把语言 eligibility 扩展到 Lizard 1.23 官方 reader 范围；`target-files.ts` 当前注册 55 个 extensions，对应 27 readers。只移植 TypeScript/Rust 会让已支持语言静默失去 metrics，因此不是 private backend replacement。

[`defer-lizard-until-after-check-foundations.md`](../../docs/decisions/defer-lizard-until-after-check-foundations.md) 的 foundations 条件已经满足，但在没有直接交付、平台、可靠性、安全或许可证阻塞证据时仍要求后置。Plan 阶段固定可交接方案，不把规划本身解释为实施优先级或开始编码的授权。

## Goals / Non-Goals

**Goals**

- 移除 formal Product 和 installed package 的 Python/Lizard runtime dependency。
- 保持当前 27-reader/55-extension owner-level observable compatibility。
- 让每个 reader/family 的责任、parity、provenance、performance 与 failure evidence 可审计。
- 用一次 hard cut 删除 external backend、public executable policy 与 stale cache identity。

**Non-Goals**

- 不把 baseline 升级到 Lizard 1.24，不新增或收窄 supported languages、metrics、finding policy 或 public parser API。
- 不修改 SCC/fileMetrics，也不建立跨两项 Check 的 generic scanner/parser framework。
- 不保留 feature flag、dual backend、silent fallback 或只覆盖常见语言的 partial production path。
- 不仅凭 Plan stage 开始实现；Readiness 条件和明确实施授权仍是前置条件。

## Decisions

### Intended Change

1. **固定 1.23 oracle，而不是追随 latest。** 以 pinned Lizard `1.23.0` source revision、当前 registry 与当前 owner outputs 建立 compatibility ledger。Lizard 1.24 upgrade 具有独立语义风险，不与 backend rewrite 合并。
2. **完整兼容面是 hard-cut 前提。** 每个 reader 都必须有明确 owner 与 differential evidence，每个 extension 都必须证明 selection 和 reader mapping。不能用高流行度语言覆盖率代替当前 Product contract。
3. **只共享消费者共同依赖的不变量。** approved exact-path read、normalized candidate/result、canonical ordering、signal/cancellation、validation/error mapping 和 backend version 可共享；tokenization、function boundary、NLOC、CCN、parameter/name/range semantics 留在 reader/family-local modules。语料证明稳定家族后才抽取 family engine，不预设 generic plugin interface。
4. **兼容 observable behavior，不复制 private CSV shape。** Oracle 固定 function identity/range、NLOC、CCN、parameters 及 Check-level Records/order/final data/failures；Lizard CSV bytes、Python class structure 与 parser internals 不升级为 Product contract。
5. **Provenance gate 先于 derived code。** ledger 同时记录 source revision、适用 file-level license/header、使用方式与 notice 责任。未解决顶层 MIT 与核心文件 Apache-2.0 header 的适用路径前，不写 translated/derived implementation；可接受替代是有独立设计证据的 behavior-based implementation，否则停止并上报。
6. **保持 callback 与 resource boundary。** Analyzer 在普通 Check callback 内只读取已批准的 exact paths，定期检查 signal，并使用现有 Record reporter/final result seam；不恢复 feature-local scheduler/TaskPlan，也不重新扫描 project root。
7. **一次切换全部外部责任。** Parity、failure、performance、provenance 和 package evidence通过后，同时切换 measurement/cache backend identity，删除 Lizard probe/process/parser/CSV、Python tool bindings、dependency prerequisite、production fallback 及 `scanner.executable` public policy。
8. **Decision 与 owner 在实施中同步闭合。** hard cut 时审阅并维护 Lizard adapter protocol、supported languages、pinned tools 与 dependency owner 相关 Decisions；调查报告只作为形成时依据，不替代这些当前 owner。

### Resulting Impacts

- Analyzer 内部可以有多个 reader/family modules，但没有可由 consumer 选择的 backend、parser 或 language plugin surface。
- `measurement-model` 的 Lizard source identity和 cache implementation version需要迁移；旧 serialized/cache data 必须 fail closed 或失效。
- public `scanner.executable` 删除会影响显式配置 consumers，必须与类型、runtime validation、文档示例和 installed acceptance 同时发布。
- Repository dogfood 和 Gate 需要在不依赖 `mise` 中 Lizard 可用性的环境证明 package behavior，且保留 SCC 的独立外部依赖边界。

## Risks / Trade-offs

- 27-reader parity 的实现与维护成本可能远高于选中源码行数所暗示的规模；完全兼容要求会延长交付，但避免静默能力回退。
- Upstream 活跃修复将转化为 Product-owned 跟踪和回归责任；固定 1.23 降低本 Change 变量，但不会消除后续升级成本。
- behavior-based implementation 与 direct translation 的工程速度、可验证性和 provenance 风险不同；在审计完成前保持 gate 会牺牲进度确定性。
- 删除 public executable knob 简化最终 contract，但需要明确 migration；若保留该 knob 则会产生没有消费者的虚假配置。
- 全部 hard cut 减少长期双路径复杂度，但要求 corpus、performance、package 和 absence evidence 在切换前一次闭合。

## Open Questions

- file-level license/provenance 审计最终允许 direct translation、只允许 behavior-based implementation，还是要求停止本 Change？
- 真实 consumer 安装失败率、process latency/memory/cold-start 与 package budget 是否足以支持实施优先级？
- 27 readers 经 corpus 证明后形成哪些稳定 family boundaries；哪些 reader 必须保持完全独立？

这些问题不改变 planned outcome，但在进入相应 implementation task 前必须形成可审计答案。若答案否定成本收益或 provenance 路径，应重新审阅或停止 Change，而不是降低 parity。

## Resume Conditions

1. 用户明确授权开始实现；同时已确认该工作相对当前产品目标的优先级，或出现现有后置 Decision 列明的直接交付、平台、可靠性、安全或许可证证据。
2. 当前 public options、Records/final data、55-extension registry 和相关 Decisions 已重新核对，没有新的语义漂移。
3. Oracle/reader responsibility、license/provenance 与安装/performance baseline 可以作为同一 Change 的受审 evidence 提交。
