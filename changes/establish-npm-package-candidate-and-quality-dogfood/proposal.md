# Proposal

本 Plan 是 npm 产品交付的本地准备阶段：把 Product runtime 交付为可安装的 API-only Bun package candidate，并让仓库 <code>quality</code> 通过该 package 运行。

跨 Change 的依赖、handoff 与完成判读见 [Vibe Check package 与 Project Gate 交付导航](../vibe-check-package-and-gate-delivery.md)。本 Plan 只拥有 candidate 及其第一个真实 consumer；它不以 package 可安装或 quality 通过宣称完整 Gate 或公开发布完成。

## Why

当前 `quality` 已是仓库唯一的 dogfood root entry，却在 `scripts/quality/project-definition.ts` 和 `scripts/quality/project-run.ts` 中直接导入 `src/product/**`。这只能证明源码在本仓库可运行，不能证明普通 package 的 entry、declarations、runtime dependencies 和 tarball 能共同服务真实 Project Definition。

发布前需要先完成可复现的本地 npm 交付链，并让实际消费者使用同一个 artifact：Product source 生成 candidate，candidate 经 `npm pack` 安装后运行 repository-quality。该证据是后续公开发布的前提，不是 registry authority、版本可用性或发布授权的替代品。

## Outcome

| 交付结果 | 可观察证据 |
| --- | --- |
| 可安装 candidate | clean staging 生成 package entry、declarations、manifest 和 runtime dependency closure，并从 staging 执行 `npm pack`。 |
| 实际 consumer | `scripts/quality/project-definition.ts` 和 `scripts/quality/project-run.ts` 只从 `vibe-check` public entry 导入；`quality` 仍拥有仓库 policy、bound Run 与命令适配。 |
| 独立安装证明 | 同一 exact tarball 在隔离 Bun consumer 中安装后，以 repository-quality Definition/Run 执行仓库根目录，且 package runtime 不回退到 source tree 或 workspace runtime material。 |
| 可交接 gate evidence | candidate inventory、consumer 结果、Bun/platform 与 scanner-prerequisite 边界被记录为后继 Project Gate Change 的输入。 |

本 Plan 不访问 registry、凭据或公开版本，也不执行 `npm publish`、删除 Product CLI 或声明 public release 已完成。

## Scope

### In scope

- 从已归档 [`unify-check-authoring-and-execution`](../archive/unify-check-authoring-and-execution/) 和已对齐 public-contract owner 消费最终 Check/Run contract；
- 建立 API-only Bun package 的 public entry、declarations、runtime closure、clean staging、`npm pack` 与 artifact audit；
- 让 repository-quality 通过 public package entry 运行，且保持 `scripts/quality/index.ts` 的锁定工具环境和 pure scan adapter 边界；
- 用 exact tarball 安装运行真实 repository-quality consumer，并验证 source/workspace independence；
- 将 candidate 的 package evidence 交接给 [build-candidate-backed-project-gate](../build-candidate-backed-project-gate/)；它完成 readiness 后由 [replace-workspace-verifier-with-project-gate](../replace-workspace-verifier-with-project-gate/) 切换正式入口，再交接发布。

### Out of scope

- registry 查询、认证、version availability、Trusted Publishing 或 `npm publish`；
- public package 的最终版本、registry authority、copyright/legal completion、public README/release materials 或发布后 registry install；
- Product CLI hard cut、`product:cli` 删除或 repository command adapter 的重新设计；
- Check、Run、Task、Core、policy、output 或 scanner protocol 的语义变更，以及 Node direct runtime、public `bin`、plugin API、configuration discovery 或 compatibility exports。

## Success Criteria

1. candidate 的 public runtime/type inventory 与 [`expose-recursive-check-authoring-and-run-surface`](../../docs/decisions/expose-recursive-check-authoring-and-run-surface.md) 和 current-contract source 一致；没有 internal/wildcard subpath 或 legacy export。
2. `bun run quality` 通过 built public entry 调用 repository-owned Project Definition 和 bound project Run；它不再导入 Product source。
3. exact tarball 的隔离 consumer typechecks 并运行同一 repository-quality Definition/Run；审计证明 package runtime 没有使用 source tree、symlink、workspace runtime dependency 或 repository devDependency 兜底。
4. installed runtime 的 Bun host、effects 和 Check-owned scanner prerequisites 按已声明边界工作，或返回既有 typed unavailable/configuration result。
5. build、pack、artifact audit 和 repository-quality dogfood 均有可复现证据；未发生 registry query、credential access 或 external publish。
6. `candidate-handoff.md` 使后继 Project Gate Change 能恢复 candidate identity、public inventory、consumer evidence、support/prerequisite facts 和必须在 full-gate / release 阶段重新核验的条件。

## Affected Owners

| Owner | 在本 Plan 中的责任 |
| --- | --- |
| [`unify-check-authoring-and-execution`](../archive/unify-check-authoring-and-execution/) | 已完成的 authoring/execution handoff；本 Plan 只消费，不重新定义。 |
| [`expose-recursive-check-authoring-and-run-surface`](../../docs/decisions/expose-recursive-check-authoring-and-run-surface.md) 与 `src/product/public-contract/**` | public runtime/value/type inventory 的唯一 owner。 |
| `src/product/**` | Bun runtime 与 declaration closure 的实现 owner。 |
| root manifest、lockfile、build/declaration configs 与 package scripts | candidate build、staging、pack 和 artifact audit 的 owner。 |
| `scripts/quality/**` | 首个实际 consumer；拥有 repository policy、Project Definition、bound Run、scanner configuration 与 command adaptation。 |
| `docs/scanner-dependencies.md` | installed scanner prerequisite 的稳定说明 owner。 |
| `docs/architecture.md` | Product invocation boundary 的稳定 owner；只链接相关 Change，不复制 package、gate 或 release 规则。 |
| [build-candidate-backed-project-gate](../build-candidate-backed-project-gate/) | candidate 的下一真实 consumer；拥有完整 Gate 功能建设、controls/feedback 集成与 readiness handoff。 |
| [replace-workspace-verifier-with-project-gate](../replace-workspace-verifier-with-project-gate/) | 拥有正式入口切换、旧 verifier 退役和最终 gate handoff。 |
| [`publish-public-api-only-npm-package`](../publish-public-api-only-npm-package/) | 在 full-gate handoff 后拥有 public registry release、发布后验证和可能的 CLI hard cut。 |
