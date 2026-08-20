# Design

本 Design 把 candidate bootstrap、20-Check static Gate、profile/tag eligibility、process evidence 和 adapter exit closure 分到各自 owner，使实现者无需从 legacy verifier 猜测哪些行为需要继承。

## Context

### 已确认的上游事实

- [Package candidate Change](../establish-npm-package-candidate-and-quality-dogfood/) 已建立唯一 `preparePackageCandidate()` owner，并把 audited exact tarball 安装到 `scripts/quality/node_modules/vibe-check`。其 [candidate handoff](../establish-npm-package-candidate-and-quality-dogfood/candidate-handoff.md) 的 digest 形成于更早源码，只能作为证据格式和重新验证条件，不能作为本 Change 的 current identity。
- [Run controls Change](../add-project-run-invocation-controls/) 已落地 `RunControls.flags?: readonly string[]` 与 callback 侧 frozen `project.flags`；Product 只规范化和传递 token，不解释 profile/tag。
- [Lifecycle feedback Change](../add-project-run-lifecycle-feedback/) 已落地 Product-owned progress、Check duration summary 和 progress failure isolation。project callback 不能把详细 process output 穿插到 progress target。
- 当前 `scripts/quality/project-definition.ts` / `project-run.ts` 是 neutral quality dogfood consumer。它们从 installed package import public API，并不选择 blocking policy。新 Gate 使用同一个 physical private consumer，但拥有独立 Definition/Run，不改变 neutral quality 语义。
- 长期方向由 [完整 Gate 后再公开发布](../../../docs/decisions/complete-project-gate-before-public-package-release.md)、[project-owned Definition](../../../docs/decisions/use-user-owned-definition-for-observation-and-gates.md) 与 [唯一 programmatic Product entry](../../../docs/decisions/use-programmatic-api-as-product-entry.md) 承接；本 Plan 不重新决定这些方向。

### Legacy 输入与新 Gate 计数

当前 legacy tree 有 21 个 command leaves。`candidate-preparation` 必须在导入 installed package 前完成，因此它属于新 adapter bootstrap，而不是 Product Check。余下 20 个 command leaves 是新 static Gate catalog 的迁移输入：required 选择其中 14 个，full 选择 19 个；`quality-quick-check` 与 `quality-full-check` 互斥，所以 full 不是全部 20 个都执行。

| 类别 | 新 Gate Check IDs | required | full | 当前 command source |
| --- | --- | --- | --- | --- |
| Product static checks | `typecheck-product`, `lint-product` | 执行 | 执行 | `scripts/development/{typecheck,lint}.ts product` |
| Scripts static checks | `typecheck-scripts`, `lint-scripts` | 执行 | 执行 | `scripts/development/{typecheck,lint}.ts scripts` |
| Repository format | `format-check` | 执行 | 执行 | `scripts/development/format.ts check` |
| Repository quality | `quality-quick-check`, `quality-full-check` | quick 执行、full N/A | quick N/A、full 执行 | `scripts/quality/index.ts`，保留 `VIBE_CHECK_QUALITY_TIMINGS=1` |
| Docs validation | `docs-json-validator`, `docs-schema-validator`, `docs-example-validator`, `docs-links-validator` | 执行 | 执行 | `scripts/validate.ts docs <target>` |
| Repository catalogs | `decision-records`, `test-evidence`, `test-evidence-rule-tests` | 执行 | 执行 | 现有 decisions / test-evidence 严格入口 |
| Git whitespace | `git-diff-whitespace` | 执行 | 执行 | `git diff --check` |
| Product tests | `product-tests` | N/A | 执行 | `scripts/development/test.ts product` |
| Foundation package acceptance | `toolkit-foundation-typecheck`, `toolkit-foundation-lint`, `toolkit-foundation-format-check`, `toolkit-foundation-tests` | N/A | 执行 | foundation package 自有 scripts |

legacy output grouping、success/ignore/warning regex 和 report aggregation 不是类别事实，不进入新 descriptor contract。新 Gate 只按 process start/exit、Check facts、named policy 与 project-owned logs 判读。

## Goals / Non-Goals

### Goals

- 让一个与当前 package inputs 匹配的 local exact-tarball candidate 在现有 private consumer 中提供新 Gate 的全部 public imports，并在启动任何 Gate work 前核对 package entry identity。
- 用一个 scripts-owned descriptor catalog 表达 20 个命令、环境、依赖、profile 与 tags；Definition、expected-eligibility audit、对照矩阵和 handoff 都从该 catalog 派生。
- 让 process Check、Product progress、named policy、adapter summary/exit 和 per-Check logs 各自只解释自己拥有的事实。
- 用 focused failure evidence 和 same-revision required/full dual-run 证明新 Gate 已可交给 cutover，而不改变当前正式入口。

### Non-Goals

- 不把 candidate preparation、CLI/profile/tag grammar、process runner、logs 或 exit code 上移到 Product。
- 不复用 legacy verifier 的 authoring/model/runner 作为新 Gate dependency，也不为双入口验收期抽取新旧共同 framework。
- 不把 partial run 等同于完整 readiness；带 disabled tags 的成功只能证明选定子集闭合。
- 不把最终 root command spelling 或保留哪些转发名当作产品/架构决策；cutover 只需让全部正式调用指向同一 implementation。
- 不检测 ambient CI 或在行为层禁止 disabled tags；约束位于正式 repository/CI Gate contract，它只允许无 disabled tags 的 required/full invocation。

## Decisions

### 1. Candidate preparation 是 import bootstrap，不是 Gate Check

`scripts/project-gate/index.ts` 可以静态导入不依赖 `vibe-check` 的 candidate owner 与 Gate catalog。它先调用 `preparePackageCandidate()`；失败时输出单一可行动诊断并返回 `2`，不得动态导入 Gate Definition/Run。

准备成功后，adapter 动态导入 `scripts/quality/project-gate/project-run.ts`。该模块从所在目录解析 `vibe-check`，并暴露实际 resolved entry；adapter 必须把它与 preparation 返回的 `resolvedEntryPath` 做字节级路径相等检查。只有相等时才创建 unique invocation log directory 并调用 bound Run。这样 preparation 不需要先借助尚未加载的 candidate 执行，也不会出现 source/path fallback。

### 2. 共享一个 descriptor core，稳定差异只用显式 profile/tag 变体

`scripts/project-gate/**` 的 catalog 是 20 个 process commands 的唯一新事实源。每个 descriptor 至少显式包含 `checkId`、display name、command/args、environment、dependencies、profiles 和 tags；所有集合在 catalog boundary 校验、规范化并冻结。

场景公约数是“一个 process command 形成一个 Product Check、一个独立 transcript 和一个 terminal outcome”。稳定差异只有三类：required/full profile membership、local tags、command-specific environment/dependencies。它们保留为 descriptor 字段；不建立 required/full 两棵定义树，也不让 adapter 重写 command graph。

新 catalog 不 import legacy verifier definitions。并行期的两张表分别是现状和候选，same-revision mapping 负责证明覆盖；若抽取新旧共享 framework，后继删除旧 verifier 时会留下只为迁移存在的抽象，反而增加 cutover 范围。

### 3. Profile 与 disabled tag 都通过 Check-local flags 表达

candidate Gate adapter 的唯一 command grammar 是：

```text
bun scripts/project-gate/index.ts [--profile required|full] [--disable-tag <tag>]...
```

profile 默认 `full`。adapter 拒绝 unknown option、unknown profile、empty/unknown tag 和多余 positional input；它把选择规范化为一个 profile token 与按字典序去重的 disabled-tag tokens，再传给 `RunControls.flags`。具体 token spelling 由 catalog/controls 模块集中拥有，Product 不解释。

每个 Check 从同一 descriptor 和 `project.flags` 计算 eligibility：profile 不含该 Check 时返回 `not-applicable/profile-excluded`；命中 disabled tag 时返回 `not-applicable/tag-disabled`；否则才启动 process。static Task graph、dependencies 和 capacity 不随 profile 改变，N/A 继续按现有 Product prerequisite 语义闭合。

adapter 从相同 catalog 和规范化 selection 计算 expected eligibility，并逐一核对 final snapshot：eligible Check 必须是 `completed/passed`，ineligible Check 必须是带预期 reason 的 `not-applicable`。这一步防止意外 skip 被 named policy 当成通过。

Local direct invocation 可以显式使用 disabled tags，并按所选子集返回真实结果；实现不读取 `CI` 等 ambient 标记来改变或拒绝这种行为。Gate readiness 只接受无 disabled tags 的 required/full，并在 handoff 中把同一要求交给 cutover；正式 repository/CI bindings 的完整契约由 [cutover Design](../../replace-workspace-verifier-with-project-gate/design.md#5-ci-完整性是调用契约不是运行时禁令) 承接。

### 4. Process Check 只拥有命令事实与 transcript

package-backed Definition factory 从 descriptor catalog 生成普通 `defineCheck` values。command、args、environment 与依赖是静态 declarative data；unique invocation log directory 由 bound Run 的 trusted callback closure 捕获，不写入 Definition fingerprint，也不扩张 Run Controls。

每个 eligible Check 使用仓库 foundation process helper 捕获完整 command/stdout/stderr/exit facts，并只写入自己的稳定 filename。结果映射固定为：

| Process / log 事实 | Check 行为 |
| --- | --- |
| process exit `0` 且 transcript 成功闭合 | `completed/passed` |
| process 正常启动并以非零状态退出，transcript 成功闭合 | 报告一个 Check-owned `gate-command-failure` error Record，并返回 `completed/failed` |
| 启动失败、启动前已取消、无可用 exit 事实或 transcript 无法闭合 | `unavailable`，使用受控 reason code |
| profile/tag 不适用，且尚未启动 process | `not-applicable`，使用 eligibility reason code |

stdout/stderr 内容不改变 status；原 verifier 的 warning/allow/ignore regex 不迁移。Record 保存安全的 command identity、exit/signal 摘要和 log reference，不复制任意 process output，详细材料只留在 ignored `.log/project-gate/<invocation>/`。foundation process helper 接收 Check 的 `AbortSignal` 作为 `cancelSignal`；已启动 child 收到取消后仍先捕获并写入 transcript，再映射为 `execution-cancelled` unavailable；本 Change 不增加私有 kill protocol。

### 5. Named policy 与 adapter closure 各自做一层明确判断

Gate Definition 显式选择 `repository-gate` policy。每个 process Check 声明同义的 failure Record type；policy 的 blocking view 枚举 catalog 的所有 `(checkId, recordTypeId)` selector，并在 view 非空时失败。policy 不承担 profile/tag 解释，也不伪造对 N/A 的 OR readiness grammar。

adapter 只在 `RunResult.kind === "completed"`、没有 Definition warning、progress effect 成功、`decision.gate.status === "passed"`、catalog/result 一一对应且 expected eligibility 全部闭合时返回 `0`。有可信 final facts 但 gate、outcome 或 eligibility 不闭合时返回 `1`。参数、bootstrap、import identity、configuration/planning/execution/cancellation/effect failure 等没有可信完整结果时返回 `2`。adapter 输出 concise summary、candidate identity、selection、gate status 与 log directory，不解析 Product human text 反推事实。

### 6. Product progress 独占共享 stream，Gate 固定 capacity 为 4

Gate Definition 显式启用 Product progress，并禁用本 Change 不需要的 Product cache/log/output effects。Check/process 不写 progress target；adapter 只在 Product Run 前后追加边界清楚的 bootstrap/final summary。

Definition 固定 `scheduler.maxParallel: 4`，不提供 `--concurrency` 或环境覆盖。`4` 与当前 Product default 一致，是本 Change 的可复核实施选择，不是 performance SLO；required/full acceptance 记录实际 elapsed 和明显 starvation/deadlock 观察。若真实证据证明 4 无法可靠完成，应先更新本 Design，而不是恢复 caller-controlled capacity。

### 7. Readiness 同时需要确定性 failure tests 与真实双入口对照

focused tests 使用测试专用 log root 和受控 child commands，证明 parser/flags、profile/tag N/A、catalog validation、dependency projection、zero/nonzero/spawn/log/cancel mapping、policy/result-to-exit、candidate import guard 以及 preparation failure 不启动 Run。新增或修改测试时同步 Test Evidence Case。

真实 acceptance 在同一 revision、无 disabled tags 下分别运行：legacy required、新 Gate required、legacy full、新 Gate full。对照矩阵逐类记录“legacy command -> new Check -> profile -> outcome -> log/evidence”，并要求 14/19 必要类别全部闭合；文本、完成顺序和 grouping 可以不同。匹配当前 package inputs 的 candidate preparation receipt、isolated exact-tarball consumer 与动态 import identity guard 共同证明 package provenance。

`gate-readiness-handoff.md` 只在上述证据实际存在后创建。它是 cutover 输入，不把本 Plan 或测试意图写成已完成事实。

## Risks / Trade-offs

- **Bootstrap 循环：** 若先 import Gate module 再准备 candidate，clean checkout 会在 Product Run 前失败；强制“prepare -> identity guard -> dynamic import/run”并测试 no-run failure path。
- **Descriptor 双轨：** 并行期 legacy 与 candidate catalog 都描述 commands；不抽共享 framework，改用显式映射和 same-revision 双入口 acceptance，cutover 后删除 legacy owner。
- **意外 N/A 通过：** policy view 看不到没有 Record 的 N/A；adapter 必须从同一 catalog 复核预期 eligibility 与 reason，且完整 readiness 禁止 disabled tags。
- **进程失败语义混淆：** 非零 gate command 是 `completed/failed`，无法形成可信 process/log 事实才是 `unavailable`；focused tests 固定该边界。
- **并行输出破坏 TTY：** callback 只写独立文件，Product progress 独占 target；adapter 不转发 child transcript。
- **candidate drift：** controls/progress 或任何 package input 改变都会产生新 fingerprint；每次 readiness/cutover 按 candidate owner 运行 preparation、audit 并记录。匹配当前 inputs 的 receipt 可以复用，不能复用不匹配的历史 digest。
- **固定 capacity 过低或过高：** 首轮选择 4 以避免暴露不需要的公共控制；真实 required/full elapsed 只作为诊断，发现可靠性问题时回到 Design 复核。
- **partial success 被误称为完整 Gate：** summary 和 handoff 必须标出 profile/disabled tags；只有无 disabled tags 的 required/full acceptance 能构成 cutover readiness。

## Open Questions

无。Implementation 可直接从 [`tasks.md`](tasks.md) 的 1.1 开始。下游 [cutover Change](../../replace-workspace-verifier-with-project-gate/) 只在本 Change 交付 `gate-readiness-handoff.md` 后启动，并按其 Design 完成正式接线、验收与 legacy reference cleanup。
