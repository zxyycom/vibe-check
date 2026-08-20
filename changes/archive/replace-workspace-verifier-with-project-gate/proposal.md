# Proposal

本 Plan 将仓库正式门禁的底层实现硬切到 Project Gate，删除旧 workspace verifier；root command 名称保持不变，名称不参与新旧实现判定。实施与验收证据见 [gate-handoff.md](gate-handoff.md)。

## Why

Plan 形成时，Candidate-backed Project Gate 已具备完整门禁所需的 20-Check catalog、required/full profile、partial eligibility、progress、transcript、policy 与 `0/1/2` exit closure，但 `package.json` 的正式门禁仍以 `scripts/vibe-check-workspace/**` 为执行目标。新实现可运行不等于仓库已经只有一个门禁 owner；切换后的实际状态由 [gate-handoff.md](gate-handoff.md) 记录。

本 Change 把能力证明与正式切换分开：Readiness 已在未修改 bindings 的同一工作树重新验证；Implementation 只负责重绑实际调用者、删除旧实现并从重绑后的入口验收。这样可以把功能缺口与接线错误分别定位，也不会为回退长期保留双实现。

本 Change 落实 [在公开 package 发布前完成项目门禁](../../../docs/decisions/complete-project-gate-before-public-package-release.md) 的交付顺序。Typed Record、result presentation、package documentation 与 native Check authoring 属于 cutover 后优化，不阻塞本 Change，也不构成恢复旧 verifier 的理由。

## Outcome

完成后，以下三个正式 root scripts 保持原名，但都直接调用 `scripts/project-gate/index.ts`：

| Root script | Project Gate invocation |
| --- | --- |
| `verify:vibe-check-workspace` | `bun scripts/project-gate/index.ts` |
| `verify:vibe-check-workspace:required` | `bun scripts/project-gate/index.ts --profile required` |
| `verify:vibe-check-workspace:full` | `bun scripts/project-gate/index.ts --profile full` |

所有正式入口都不传 disabled tags。`scripts/vibe-check-workspace/**` 及其专属 tests、Cases 和 current-owner 描述被删除，不保留 forwarding、fallback 或第二套 profile、scheduler、日志与结果解释。保留原 root names 只是 repository wiring 连续性，不是 legacy compatibility layer。

`quality` 继续是人或 AI 调用 repository Project Run 的唯一 dogfood root entry，不承担阻断政策。`gate-handoff.md` 记录切换后的实际 bindings、candidate 与 Gate evidence、legacy retirement、CI/workflow 审计、重新验证条件和 VCS 回退边界；后续 `gate-optimization-handoff.md` 承接发布前最新 behavior/artifact evidence。

## Scope

纳入范围：

- 使用 [cutover readiness evidence](readiness-evidence.md) 作为正式 binding 写入前的能力门禁；适用重新验证条件触发时先刷新该证据。
- 将现有三个正式 root scripts 直接重绑到 Project Gate，并迁移绕过 root manifest 的 legacy source callers 与 source-path permissions。
- 更新稳定 owner、测试 Case 与交付导航，使它们只把 Project Gate 描述为当前正式实现。
- 从重绑后的 required/full root scripts 验收后，删除 `scripts/vibe-check-workspace/**` 及其专属证据。
- 写出 `gate-handoff.md`，把 binding/retirement 事实交给后续优化与发布 Change。

不纳入范围：

- 修改 root command vocabulary；仅调用保留 root names 的 environment、instructions 和 active Change 不需要改名。
- 新增或重写 Check callback、20-Check 类别映射、process adapter、profile/tag grammar、observer/renderer、scheduler capacity、package build 或 public exports。
- 修改 `quality` Project Definition/Run、invocation controls、lifecycle feedback、timestamp/duration policy、Product CLI 或 npm artifact。
- 访问 npm registry、凭据、远端 CI 状态或执行 `npm publish`。
- 为消除字符串命中而改写 archived Change、历史材料或 Decision 的形成时背景；reference audit 只排除 current implementation/caller 残留。

## Success Criteria

1. Readiness evidence 在正式 binding 写入前有效；若 candidate inputs 或其列出的 15-file Gate manifest scope 发生变化，先重新验证再实施。
2. 三个正式 root scripts 都直接到达 `scripts/project-gate/index.ts`；base 与 `:full` 选择 full，`:required` 选择 required，所有正式调用均无 disabled tags。
3. 当前可执行配置、source imports、permissions、owner 文档与 Cases 都不再 direct-call、加载或描述 `scripts/vibe-check-workspace/**` 为当前实现；CI/workflow 全部绑定新 Gate 或明确不存在。
4. `scripts/vibe-check-workspace/**` 及只证明该实现的 tests/Cases 已删除；仓库不存在 legacy forwarding、fallback 或第二套 profile/scheduler/result interpretation。
5. 从重绑后的 root scripts 运行 required/full 均通过，并完成 focused Gate tests、Test Evidence、scripts typecheck/lint/format、docs validation 与 legacy audit。
6. `gate-handoff.md` 能让下游独立恢复实际 bindings、candidate/artifact evidence 的有效边界、legacy retirement、重新验证条件与 VCS 回退方式，且不把后续优化或 registry 发布写成已完成事实。

## Affected Owners

- Root 与自动化调用：`package.json`、`.codex/rules/vibe-check.rules`；`.codex/environments/*.toml` 与 `AGENTS.md` 作为保留 root names 的调用者接受审计。
- Gate 与 legacy scripts：`scripts/project-gate/**`、`scripts/quality/project-gate/**`、`scripts/vibe-check-workspace/**` 及相邻 tests。
- 稳定文档与测试证据：[`docs/script-tooling.md`](../../../docs/script-tooling.md)、[`docs/navigation.md`](../../../docs/navigation.md)、[`docs/testing.md`](../../../docs/testing.md)、[`docs/decision-and-change-governance.md`](../../../docs/decision-and-change-governance.md) 与 `docs/testing/cases/**`。
- 当前交付导航：[`changes/active-change-portfolio.md`](../../active-change-portfolio.md) 与 [`changes/vibe-check-package-and-gate-delivery.md`](../../vibe-check-package-and-gate-delivery.md)。
- Readiness 与 cutover 证据：本目录的 [readiness-evidence.md](readiness-evidence.md) 和 [gate-handoff.md](gate-handoff.md)；后续优化证据由 [`align-project-gate-with-native-check-authoring`](../../align-project-gate-with-native-check-authoring/) 拥有。
