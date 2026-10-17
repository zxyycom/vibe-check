# Design

本 Draft 以 Check 内的轻量图式重构为核心，将节点事实与引用边分开，按边需求驱动目标事实获取和逐引用结算。

## Context

- [公开指南](../../docs/checks/markdown-link-validation.md)拥有 Product 默认预算、配置最大值和计数契约；
  `targetReadCount` 统计进入本地目标验证的引用次数，包括缓存命中。
- [Project Gate](../../docs/tooling/project-gate.md)显式配置有限目标预算，覆盖完整文档输入；超限结算 unavailable。
- [内部 owner](../../docs/development/markdown-link-resolution.md)已复用解析与成功目标标题事实，
  每次引用仍独立分类、授权并探测目标。
- [缓存 Decision](../../docs/decisions/warn-on-explicit-markdown-parse-cache-capacity.md)和
  [Gate cache Decision](../../docs/decisions/enable-gate-markdown-parse-cache.md)仍是当前有效判断；
  它们保留逐次目标授权、工作量限制与当前输入验证；调整这些方向前须完成相应决策审阅与演进。

## Goals / Non-Goals

### Goals

- 建立节点登记、引用边与派生需求计划，统一组织单次 invocation 的目标工作。
- 明确可复用事实与逐引用判断的边界，保持完整输入、安全授权、独立诊断和稳定结算。
- 配套调整总量预算，并以可复核证据验证重构的成本与规模收益。

### Non-Goals

本 Change 限于 Markdown Link Check 与 Gate 配置。通用或持久图、跨 Check resolver、增量依赖系统，
以及共享文件收集和并发模型的调整均在范围外。

## Decisions

### Intended Change

核心交付是 Check 内、单次 invocation 的轻量图模型：

| 数据 | 职责 |
| --- | --- |
| 节点表 | 登记源文档与直接目标的身份、角色、解析事实及已授权取得的观察状态。 |
| 边表 | 保存来源、引用身份与位置、目标描述和锚点，为逐引用判断提供依据。 |
| 节点需求 | 从引用边派生所需的存在性、类型、标题查询等工作，驱动授权后的事实获取。 |

逻辑顺序为：解析所选源文档并登记引用 → 派生节点需求 → 授权并取得所需事实 → 逐边判断与结算。
进入 Plan 前选择完整引用收集或按源惰性处理的执行时序；两者都按需求读取目标，正文与 parser AST 的驻留
仅服务当前处理。图模型是确定交付，事实复用范围与观察策略依据安全语义和测量选择。

配套支持显式关闭 `maxTargetReads`，并一并审视 `maxOccurrences` 的总量阻断。
预算选择应由调用方掌握；有限配置的最大值需要具体依据。进入 Plan 前固定默认值、关闭语法与 resolved options。
预算能力可以分步实施，整个 Change 的完成以图式重构及其验证为准。

### Resulting Impacts

- **公开契约：** 同步 options、constructor、resolved validation、公开类型与错误分支，审计 final-data parser
  的计数上界。`targetReadCount` 保持逐引用口径，machine DTO 保持现有语义。
- **安全与观察：** 保留单文件字节限制、取消能力、root-external 授权、symlink 保护与离线边界。
  目标仅提供直接验证事实，源文档集合保持原选择。复用不能在授权前合并 symlink 别名，
  缓存的路径包含性结果不得为新的 I/O 授权；需求升级涉及新读取时须重新处理授权与事实一致性。
- **诊断与结算：** 重复无效引用分别保留 Finding，按源文档及引用顺序发布；完整遍历成功后才发布普通链接
  Finding。取消、读取或解析失败仍按既有优先级结算 unavailable。每个候选观察策略须说明运行中变化的可见性。
- **验证与交接：** 随实施同步公开指南、内部 owner、Gate 配置与测试、Case 账本、示例及消费验收，遵循
  [测试策略](../../docs/testing/strategy.md)。覆盖超过当前 `10_000` 目标预算最大值、热点重复、独立附件、
  不同锚点、深路径、别名、运行中替换与需求升级；显式有限预算继续超限阻断。
- **性能证据：** 在当前实际文档集与固定合成输入上建立基线，分别测量缓存关闭、启用但为空及命中状态。
  记录运行时、字节量、引用数、独立目标数、I/O 操作量、耗时和内存；采样前确定采用门槛并协调负载，
  用于选择图模型的具体实现、验证重构收益与代价，并单独说明预算调整的影响。

## Risks / Trade-offs

- 关闭总量预算意味着调用方接受更大的 CPU、I/O、内存和诊断规模；单文件限制与取消能力不是整次运行的严格资源保证。
- 关系表增加内存与维护成本，独立附件的去重收益可能有限。首次观察复用还会牺牲同次检查内的后续变化可见性，
  且不构成原子的文件系统快照；逐次探测则保留相应 I/O 成本。

## Open Questions

1. 节点身份与角色如何定义，源文档事实和目标观察如何关联，别名何时允许共享事实？
2. 哪些事实允许复用？缺失、失败、需求升级及运行中替换如何处理？完整引用收集与惰性处理选择哪种时序？
3. 预算关闭语法、默认值、`maxOccurrences` 的处理，以及有限预算最大值与 final-data parser 上界如何确定？
4. 图式重构的操作量、耗时和资源验收门槛是什么，怎样覆盖热点重复与独立附件两类规模？
