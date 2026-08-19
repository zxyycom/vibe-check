# Design

本设计以“逐条分类 → 局部重构优先 → 必要时精确接受 → 独立复核”的顺序清理当前质量债务。

## Context

恢复 `function-metrics` 后，当前 quality artifact 有 33 条未接受记录：11 条 `file-code-lines`、11 条 `function-code-lines`、8 条 `function-cyclomatic-complexity` 和 3 条 `function-parameter-count`。`duplicate-detection` 已通过。稳定规则由 Coding Style、Configuration、Quality Metrics、Scanner dependencies 和 Testing owners 共同约束；quality 的默认阈值本身不是本 Change 的问题。

用户明确要求：只有真正的误报才可单独豁免。现有 Project Definition 支持声明式 `DecisionPolicy` acceptance，但它只能解释冻结的现有 Record，不能改变 Check 运行或把失败事实伪装成通过。

## Goals / Non-Goals

目标：让每项告警有可审计结论，以改善真实的模块/函数边界、复杂度和测试结构；保留等价行为与完整测试证据；将任何例外缩到一条 Record 的稳定语义选择器。

非目标：追求机械地把任意函数切成只转发参数的 helper；修改全局 scanner 阈值、warning policy、scan scope 或记录类型；用一项泛化 acceptance 覆盖多条记录；借本次重构引入新的架构层或外部依赖。

## Decisions

### Decision 1: 以告警类别和代码职责分配互斥工作区

定义/Run 工作区负责 `src/product/definition/**` 与 `src/product/run/**` 的当前告警；quality-core 工作区负责 `src/product/quality-core/check-record/**`、`output/**` 和 `scan-command/**`；输入/调度工作区负责 `src/product/quality-core/input/**` 与 `src/product/task-scheduler/**`。每个工作区的实施代理只写入自身源码、相邻测试和必须的同主题 Case；Change artifacts、质量 policy 和跨工作区集成由主代理拥有。

### Decision 2: 先以行为边界重构，再判断误报

每项发现先审阅其 owner、调用点、相邻测试及可观察不变量。函数按独立的验证、转换、执行或输出责任拆分；超长测试文件按可独立证明的 Case 或复用 setup/helper 拆分，但不为行数机械创造抽象。只在重构会损害清晰度、契约或独立证明，且该 Record 的度量可说明其为误报时，才提出 acceptance。

### Decision 3: 单项接受必须精确、可解释且由主代理集中写入

若有误报，主代理在 repository Project Definition 中使用已有 `DecisionPolicy` 写入一个唯一 acceptance ID、单一 `(checkId, recordTypeId)` selector、稳定 path/metric 等谓词和非空理由。不得使用全局 level、整个 check、目录前缀或多个无关记录的匹配；每项接受先由另一工作区代理或主代理复核其真实性。若没有可证明的误报，不添加 policy。

### Decision 4: 测试与语义 Case 跟随行为而非文件布局

测试节点/正文变化时，实施者必须使用 test-evidence-review 流程：修改前后执行完整 closure，复核既有 Case 的 Owner 与 Proves，并只在真实证明目的改变时更新 Case。移动 helper 或拆分测试不自动制造新 Case。

### Decision 5: 最终 standards review 以明确规则 owner 为准

文档复审以 AI 从实际 owner 文本恢复信息的能力为准：Configuration 完整拥有 default Check option 值，Scanner dependencies 只解释 private adapter 如何消费已验证的值。代码复审以 Coding Style 为规范；相邻代码只用于恢复局部接口和集成上下文，不能证明新增模块、helper、类型或错误处理可以偏离规则。任何修订保持 Product 契约不变；测试正文修订须保留 Case 身份并重新闭合 test-evidence。

## Risks / Trade-offs

- **过度拆分。** 以实际职责和可观察不变量而非单一行数为拆分依据；主代理审查 diff。
- **并行写入冲突。** 工作区互斥，代理不改 Change、policy 或其他工作区文件；整合后才运行全量质量扫描。
- **误用 acceptance。** 所有 acceptance 由主代理串行添加，并以精确 predicates 和报告证据复核；没有误报则没有 acceptance。
- **测试证据漂移。** 每个变更测试的工作区在完成前运行 target tests 和全树 test-evidence；主代理再次运行集成验证。
- **文档重复或机械拆分。** 以唯一 owner、完整字段关系和真实职责为审计标准；不把为了降低度量而新增的笼统 support 模块或单行转发作为完成。

## Open Questions

无。三个工作区均提供了局部重构和目标行为证据；最终 dogfood 产生零 records，因此没有 acceptance、阈值或 scope 配置需要新增。

## Implementation Observations

Definition/Run、quality-core、输入/task-scheduler 三个互斥工作区分别完成职责拆分。最终 quality artifact 的三个 Check 均为 `completed/passed`，`records.ndjson` 为空，Project Definition 保持 policy disabled。该结果说明本 Change 未把任何实际问题移入 acceptance，而不是仅改变报告归类。

Standards review 将 concrete default scanner option 值收敛到 Configuration，Scanner dependencies 保留其 private adapter consumption contract，并同步 Architecture 的路由。源码复审以 Coding Style 为唯一规范：将笼统的 `policy-evaluator-support` 改为按职责命名的 `policy-evaluator-predicates`，移除 task-engine 测试中只转发的 helper，并为 Run 中的 prepared project 显式使用领域类型；未发现需要以临近旧代码为由保留的偏离项。
