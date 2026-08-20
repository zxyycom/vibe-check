# Design

本 Design 以单一实现 hard cut 为主线：先使用已闭合的 Readiness evidence，再重定向正式 bindings，验收后删除 legacy verifier，最后交付 binding/retirement handoff。

## Context

### 术语

- **Project Gate**：`scripts/project-gate/index.ts` 及其通过 `scripts/quality/project-gate/**` 调用的 project-owned Definition/Run。
- **Legacy verifier**：`scripts/vibe-check-workspace/**` 下的 scripts-only implementation。
- **正式 root bindings**：`package.json` 中 `verify:vibe-check-workspace`、`:required` 与 `:full` 三个 scripts。
- **Hard cut**：正式 bindings 直接改到 Project Gate，并删除 legacy verifier；命令名称不定义 implementation identity。

### 当前事实与输入

- [Cutover readiness evidence](readiness-evidence.md) 已在 `HEAD 0b382d8bca6fc17541e79f4444400354df6c739b` 完成 candidate、manifest、focused tests、Test Evidence 与 same-worktree legacy/new profile acceptance；Readiness tasks 0.1–0.4 已闭合。
- `package.json` 的正式 root bindings 仍调用 `scripts/vibe-check-workspace/verify.ts`；Project Gate 已存在但尚未成为正式 root target。
- 当前仓库未发现 CI workflow；Implementation 仍需在写 binding 前重新发现，最终 handoff 记录实际结果。
- `quality` 通过 `scripts/quality/index.ts` 运行 neutral observation/dogfood，与阻断 Gate 保持独立。
- [归档 readiness handoff](../archive/build-candidate-backed-project-gate/gate-readiness-handoff.md) 是形成时证据；本 Change 只以当前 `readiness-evidence.md` 作为直接实施输入。

本 Change 采用 [在公开 package 发布前完成项目门禁](../../docs/decisions/complete-project-gate-before-public-package-release.md) 的方向，并遵守 [程序化 API 是唯一正式产品执行入口](../../docs/decisions/use-programmatic-api-as-product-entry.md) 与 [项目持有 Definition 和 Gate](../../docs/decisions/use-user-owned-definition-for-observation-and-gates.md)：repository CLI 由项目拥有，通过 public package API 调用 bound Definition/Run，不成为 Product CLI。现有长期判断已覆盖当前方向，无需新增 Decision Record。

## Goals / Non-Goals

### Goals

- 让所有正式 root bindings 直接调用同一个 Project Gate adapter。
- 迁移绕过 root manifest 的 legacy callers、permissions 与 current-owner 描述。
- 从重绑后的 required/full 入口验收后删除 legacy implementation、tests 与 Cases。
- 保留 root command names 与 `quality` dogfood root，避免把无关命名或 observation 变更混入 cutover。
- 生成供后续优化与发布 Change 消费的 binding/retirement handoff。

### Non-Goals

- 不改变 Gate catalog、Check behavior、selection flags、transcript、policy、progress、capacity 或 `0/1/2` exit semantics。
- 不增加 root command vocabulary，也不给正式 root scripts 暴露 `--disable-tag`；local direct adapter 继续支持 partial diagnostics。
- 不修改 `quality` 的 Definition/Run 或把它合并进 Gate contract。
- 不访问 registry/credentials、不发布 package，也不提前实施 Gate authoring、Record、presentation 或 documentation 优化。

## Decisions

### 1. Readiness evidence 是 binding 写入门禁

Tasks 0.1–0.4 的已勾选状态由 [readiness-evidence.md](readiness-evidence.md) 支持。开始 1.1 前，只检查 evidence 的重新验证条件：candidate input fingerprint 或 15-file Gate manifest scope 任一内容变化时，先重跑 0.2–0.4；仅 Change artifacts 或 Git commit identity 变化不触发重跑。

Readiness failure 必须返回实际 Gate/package owner，不能用后续优化或 legacy fallback 补偿。正式 bindings 写入后使用 Verification tasks 的 actual-root evidence，不用 pre-cutover evidence 代替 cutover 验收。

### 2. Root names 保留，targets 直接替换

| Root script | 唯一 target | Profile contract |
| --- | --- | --- |
| `verify:vibe-check-workspace` | `bun scripts/project-gate/index.ts` | adapter default `full` |
| `verify:vibe-check-workspace:required` | `bun scripts/project-gate/index.ts --profile required` | `required`，无 disabled tags |
| `verify:vibe-check-workspace:full` | `bun scripts/project-gate/index.ts --profile full` | `full`，无 disabled tags |

这些 names 是 repository wiring。重绑后它们不经过 legacy adapter，因此不是 compatibility aliases。Command rename 不属于本 Change 的前置或完成标准。

### 3. Caller audit 依据 target 和 source path，不依据 root name

必须迁移：root manifest target、direct legacy source callers、允许执行旧 source path 的 Codex rules、稳定 owner 与 Case ledger 中的 current implementation 描述。无需迁移：只调用保留 root names 的 environment、agent instructions 和 active Change，因为更新 manifest 后它们自动到达 Project Gate。

Reference audit 分别证明：全部正式 root targets 指向 Project Gate；current direct-call/import 对 `scripts/vibe-check-workspace/**` 为零；legacy source tree 为零；形成时/归档 references 具有非当前语境。`verify:vibe-check-workspace*` 字符串存在本身不表示 legacy implementation 残留。

### 4. 新 binding 验收后删除 legacy implementation

先完成 root target 与 direct caller 迁移，再从实际 root bindings 运行 required/full。通过后确认 legacy tree 外没有 runtime/test imports，然后删除整个 `scripts/vibe-check-workspace/**`、专属 tests 和只证明旧 adapter/profile 的 Cases。

Shared Product Task engine 与 foundation process helpers 由各自 consumer 决定是否保留。VCS 回退使用 Plan `baseCommit` 与精确 path set 恢复 bindings、references 和 legacy tree；回退不通过长期保留双实现实现。

### 5. 测试证据随当前 owner 切换

测试正文或节点、Case Owner/Proves、删除的 legacy entities 按 `test-evidence-review` 流程维护。现有 candidate Gate Cases 改为证明正式 Project Gate；legacy workspace adapter/profile Cases 随实现删除。Focused tests 证明 deterministic failure boundaries，actual root required/full 证明最终接线，两类证据不能互相替代。

### 6. Cutover 与 optimization evidence 分层

`gate-handoff.md` 记录实际 root/CI bindings、candidate identity、manifest、required/full evidence、partial invocation 边界、capacity、output/exit/log behavior、legacy audit、重新验证条件和 VCS rollback paths。

该 handoff 的 binding/retirement 事实持续有效，直到正式入口再次改变；Gate/package inputs 变化只使 behavior/artifact evidence 需要刷新。后续 [`align-project-gate-with-native-check-authoring`](../align-project-gate-with-native-check-authoring/) 通过 `gate-optimization-handoff.md` 保存 documentation-complete exact artifact 与最新 Gate evidence。Publish Change 必须同时消费两份 handoff。

## Risks / Trade-offs

- **Readiness drift：** candidate inputs 或 15-file manifest scope 在 1.1 前变化时，按 evidence 条件重跑 0.2–0.4。
- **Hidden direct caller：** 某些配置可能绕过 root manifest；实施时同时审计 package target、source path、imports 与 executable permissions。
- **CI 事实变化：** Readiness audit 未发现 workflow；Implementation 重新发现并在 handoff 记录实际状态。
- **Premature deletion：** 只有重绑后的 required/full 通过且 legacy tree 外 imports 为零，才删除旧 tree。
- **Name/identity confusion：** 保留的 `verify:vibe-check-workspace*` 必须直接指向 Project Gate，不能加载或 fallback 到旧 tree。
- **Evidence drift：** tests 或 Case authority 变化必须与 implementation owner 切换同步，并通过 strict Test Evidence。

## Open Questions

无。Readiness 已闭合，长期方向、正式 targets、profile contract、caller 分类、删除门禁、测试证据与 handoff owner 均已确定；下一项可执行任务是 1.1。

## Implementation Observations

Readiness 形成时的 exact candidate、manifest、命令结果与重新验证条件只在 [readiness-evidence.md](readiness-evidence.md) 完整记录；本 Design 不复制该证据。
