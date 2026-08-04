## Context

本 change 实施前，baseline plan 同时支持显式 revision、`--with-baseline` 自动选择和 `--skip-baseline`，而 core 的 auto-selection 依赖 invocation 当时的 Git history。显式 revision 直接写入 metrics，后续 Git 操作分别消费该字符串。函数 warning 则以 `file:name:startLine` 建立 baseline map，因此前置文本改动会把同一函数变成未匹配的新项。

本 change 需要同时修改 CLI planning、revision resolution、baseline metadata 和 warning matching；scanner `FunctionMetric` shape 仍由现有 owner 以及 active `port-lizard-function-metrics-to-typescript` change 维护。

## Goals / Non-Goals

**Goals:**

- 让一次 comparison 的 target 由调用者明确选择并固定为一个 commit。
- 让函数 delta 对纯行号漂移稳定，同时对重名和跨文件移动保持保守。
- 在昂贵 scan work 和 artifact publication 前拒绝无法执行的 comparison request。

**Non-Goals:**

- 不改变 scanner backend、`FunctionMetric` fields、warning machine schema、threshold 或 acceptance identity。
- 不推断 merge base、upstream、remote branch 或“最合理”的历史 commit。
- 不用 AST symbol、signature hash 或代码相似度追踪 rename/move。

## Decisions

### Decision 1: Baseline 是显式输入，不是仓库推断结果

删除 `--with-baseline` 及其 auto-detection path。省略 `--baseline` 时，quick/full 和 `all` gate 都使用 current snapshot；`changed` / `regressions` gate 在 parser/planning boundary 要求显式 baseline。保留 `--skip-baseline` 作为现有的显式 current-only 写法，但它不再是关闭自动推断所必需的选项。

备选方案是让 comparison gate 继续选择 previous-code commit，或默认选择 `origin/main` / merge base。前者已经证明无法表达分支目标，后者引入 remote/upstream 可用性与产品策略，因此均不采用。

### Decision 2: Revision 在 scan orchestration 边界解析一次

在 project root 归一化和 argument parsing 完成后、config selection、dependency resolution、scanner、cache 和 artifact directory creation 前，用 project root 的 Git repository 将显式 revision peel/verify 为 commit，并把 canonical full object ID 传给 core。无效 revision 转为 CLI usage error；core 的 `QualityScanOptions.baselineCommitSha` 因而只承载 canonical commit SHA 或 null，不接收 raw revision 或 skip boolean。

备选方案是在 baseline selection 或 materialization 时解析。那会在 artifacts 已创建后才失败，也会让 changed-input、metadata 和 materialization 有机会重复解析 mutable ref，因此不采用。

### Decision 3: Core 不再拥有 baseline selection policy

baseline configuration 只处理两种 normalized plan：canonical SHA 或 skipped。删除 previous/nearest-code selection 与相关 reason；显式 comparison 的 `selectionReason` 固定表达 caller-provided baseline。revision materialization、changed-file detection 和 cache 继续复用既有 core primitives。

备选方案是保留无法从 CLI 到达的 auto-selection helper。它会留下第二套长期行为并容易被 wrapper 重新启用，因此在引用清理后删除。

### Decision 4: 函数 identity 是同文件内唯一的稳定名称

current 与 baseline function metrics 分别按 normalized `file + exact name` 分组。`(anonymous)`、`unknown` 和空或全空白名称不建立 identity。对可识别名称，只有两侧组大小都为一时才建立 match；任一侧重名则该 identity 的所有 current candidates 都以 null baseline/delta 保持不可比较。baseline 没有同 identity 的唯一具名 current function 继续使用既有 baseline-zero new-function semantics。`startLine` / `endLine` 只服务排序和 current warning location；跨文件移动不猜测旧实体，按同文件新函数处理。

备选方案包括 exact-line 后 unique-name fallback、nearest-line matching、signature hash 和 AST symbol tracking。两级 fallback 仍把位置误当身份；启发式匹配会悄悄比较错误函数；更强 symbol identity 需要 scanner contract 变化并与 Lizard port 交叉，因此本 change 不采用。

### Decision 5: Wrapper 不拥有 baseline policy

`quality:full-check` 移除 `--with-baseline`，成为 full current snapshot。`quality:gate` 保持单向参数转发，调用者需要追加 `--baseline <revision>`；wrapper 不读取 branch、remote 或 CI event 来补全 revision。

备选方案是在 repository scripts 固定 `origin/main`。这会让本地、fork 和离线环境产生隐含且不同的前提，因此不采用。

### Decision 6: 先稳定 comparison，再捕获 Lizard port parity

本 change 不修改 scanner adapter 或 `FunctionMetric` shape，但会有意修改 warning comparison values 与 channel membership。因此应在 active `port-lizard-function-metrics-to-typescript` 的 warning/gate parity baseline 捕获前完成；若两项工作交错，port 必须以本 change 验证后的 warning contract 重建 parity evidence，而不是恢复行号 identity。

备选方案是让两个 change 各自固定旧/新 warning baseline 后再合并。那会制造必然冲突且无法说明哪份 evidence 是当前契约，因此不采用。

## Risks / Trade-offs

- [同文件重名函数不能获得 delta] → 明确保持 `not-comparable`；保留 current warning，但不产生猜测性的 delta 或 regression。
- [匿名函数名缺少稳定语义] → `(anonymous)`、`unknown` 和空名称不参与 baseline matching；warning 保持可见但没有 comparison delta。
- [移除 auto baseline 是 CLI breaking change] → help、owner docs、package scripts 和 acceptance tests 同步迁移；错误信息直接给出 `--baseline <revision>`。
- [mutable ref 在解析窗口移动] → invocation 开始只解析一次，此后只传递 canonical SHA。
- [active Lizard port 同时触及 function metrics] → 本 change 只修改 warning-side index/matching，不修改 adapter、field shape 或 output ordering。
- [Lizard port 过早捕获旧 warning baseline] → 先完成本 change；port 后续 parity 使用稳定后的 comparison 结果。

## Migration Plan

1. 先加入 parser/planning 与 function matching 的回归测试，使旧行为失败。
2. 实现 canonical revision resolution，删除 auto-selection path，并把 wrappers/docs 改为 explicit-only 语义。
3. 实现双侧唯一的 line-independent matcher，不改变 current warning location。
4. 运行目标测试、test-evidence、typecheck/lint、product suite、workspace required verification，并用显式 `origin/main` comparison 复核真实 regression channel。
5. 验证后把 `workflow-policy/require-explicit-quality-baselines` decision 标为 aligned。回滚时应整体回滚本 change；不得只恢复 wrapper auto baseline 而留下不一致契约。

## Open Questions

提案阶段没有未回答开放问题；实现前审计已完成。
