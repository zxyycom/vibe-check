# Proposal

本 Plan 建立一个可由 Bun 本地安装和执行的 API-only `vibe-check` npm package candidate，并让仓库 `quality` 通过这个物理安装包运行。构建只生成一个 `.tgz`；repository dogfood 与隔离 consumer 使用同一文件及 digest。安装可以按普通 package 规则获取已声明的第三方依赖，但本 Change 不查询、发布或写入 `vibe-check` registry state。

跨 Change 的顺序与 handoff 见 [Vibe Check package 与 Project Gate 交付导航](../vibe-check-package-and-gate-delivery.md)。本 Plan 只拥有本地 package proof 和第一个真实 consumer；完整 Project Gate、正式入口切换与公开发布由后继 Change 拥有。

## Why

当前 `scripts/quality/project-definition.ts` 和 `scripts/quality/project-run.ts` 直接 import `src/product/**`。这能证明源码在本仓库运行，却不能证明 emitted JavaScript、declarations、manifest、production dependencies 和普通 package resolution 共同构成可安装产品。

本 Change 只回答两个问题：生成的 npm package 能否独立安装和运行；仓库自己的 `quality` 能否持续通过它使用 Product。版本发布、法律材料、公开兼容性和全仓 runtime 迁移不应混入这个本地可行性证明。

## Outcome

| 结果 | 完成证据 |
| --- | --- |
| Bun-only package candidate | fully-derived staging 包含 public ESM entry、declarations、candidate manifest 和实际 production dependencies；`bun pm pack` 生成一个经过 inventory audit 的 `.tgz`。 |
| Repository dogfood | `project-definition.ts` 与 `project-run.ts` 只从 `vibe-check` public entry 导入；`bun run quality` 在 pinned Bun/mise 环境中自动准备本地包，resolver evidence 指向由 accepted `.tgz` 安装的 package。 |
| 隔离安装证明 | repository resolution ancestry 之外的临时 Bun consumer 安装同一 `.tgz`，typecheck public imports，并在小型 fixture 上执行包含 `duplicateDetection` 的最小 Definition/Run。 |
| 明确的 scanner 边界 | `jscpd` 是 candidate 的普通 production dependency，其 public bin target 由 Bun 直接执行；`scc`、`lizard` 和显式 scanner override 继续遵守现有 Check-owned 配置与 typed unavailable 语义。 |
| 可交接证据 | `candidate-handoff.md` 记录 artifact identity、public inventory、两类 consumer 结果、tested host、scanner prerequisites、限制和重新验证条件。 |

## Scope

### In scope

- 从 `src/product/**` 和 current public-contract owner 生成 Bun ESM runtime、declarations、candidate manifest 与 fully-derived staging；
- 使用 `bun pm pack` 生成一个本地 `.tgz`，审计 public entry、declarations、production dependency metadata 和 package file allowlist；
- 为 `scripts/quality/` 建立独立的 private consumer package context，使 canonical Definition/Run 文件可以 bare-import 物理安装的 `vibe-check`，而不复制 policy 或 Run wrapper；
- 让 root `quality` 保持进入 `scripts/quality/index.ts`；该 adapter 建立 pinned Bun/mise 环境后，在 scan 前自动准备 candidate：输入变化时 build、pack、install，输入未变化时不得重复这些动作；
- 将 `jscpd@5.0.11` 声明为普通 production dependency，解析其 manifest 声明的 bin target，并由当前 Bun `process.execPath` 执行；
- 使用同一 `.tgz` 完成 repository dogfood 和隔离 consumer acceptance；
- 记录一次代表性的现状与 candidate-backed `quality` 耗时作为诊断，不建立 performance SLO 或 benchmark framework。

### Out of scope

- public version、registry authority、authentication、credential、MIT release materials、`npm publish` 和 registry-install verification；
- Node 或 dual-runtime 支持、全仓 Node elimination、pnpm/lockfile 迁移，以及无关开发工具的 runtime 改造；
- package-owned `.env` loading、environment-variable naming 或 scanner precedence；Project Definition 仍可像普通 TypeScript 一样使用自己的输入；
- scanner cache protocol 重设计；本 Change 只调整 default `jscpd` Bun command 所需的既有 backend identity normalization；
- package-manager 网络/credential 行为审计、reproducible archive 或额外 benchmark harness；
- 在隔离 consumer 中重跑完整 repository `quality`，或通过 package boundary 重放所有 Run、scheduler、cancellation 和 output 语义；这些分别由 repository dogfood 与既有 Product tests 证明；
- public bootstrap helper、Product CLI retirement、annotation consumer 迁移、完整 Project Gate 与正式 gate cutover。

## Success Criteria

1. Candidate 的 runtime/type inventory 与 [`expose-recursive-check-authoring-and-run-surface`](../../docs/decisions/expose-recursive-check-authoring-and-run-surface.md) 和 `src/product/public-contract/current.ts` 一致；没有 `bin`、internal/wildcard subpath、legacy alias、test 或 repository source material。
2. 一个经过审计的 `.tgz` 同时被 repository-quality consumer 和隔离 consumer 安装；两者记录相同 digest，且 resolver evidence 不指向 Product source、workspace link 或祖先目录 fallback。
3. `bun run quality` 在 pinned Bun/mise 环境中自动准备 candidate，再通过安装后的 public entry 运行 canonical repository Definition/Run。Candidate 输入未变化时复用现有安装；输入变化时自动 rebuild/reinstall；准备失败、状态损坏或身份不一致时不得运行 scan 或回退旧 candidate。
4. 所有会加载或 typecheck repository-quality consumer 的入口共享同一个 preparation owner。Fresh local state 下直接运行 scripts typecheck、目标 Project Run test、test-evidence check、`quality` 与 workspace verifier 都不要求手动 prepare，不使用 source/path alias，也不会并发改写同一 install state。
5. 隔离 consumer 在 repository ancestry 之外 typecheck public imports，并在小型 fixture 上成功执行 `duplicateDetection`；它只能使用 candidate 声明的 production dependency closure。
6. Candidate manifest 声明精确的 `jscpd@5.0.11` production dependency；default duplication Check 解析已安装 package 的 bin target，并以 pinned Bun 执行。现有 explicit override 以及 external `scc` / `lizard` 语义不变。
7. 现有 scanner cache identity 在 Node launcher 切换为 Bun direct entry 时失效旧 backend identity，但不会因为同一默认 dependency 的 consumer install 绝对路径不同而碎片化；不新增 `.env` 或 environment-specific cache contract。
8. `candidate-handoff.md` 保存后继 Gate 真正需要的 artifact、consumer、host/prerequisite、限制和重新验证条件；相关 Product tests、package acceptance、`quality`、required/full workspace verification 与 Change/docs checks 通过。

## Affected Owners

| Owner | 本 Plan 的责任 |
| --- | --- |
| `src/product/public-contract/current.ts` 与 [`expose-recursive-check-authoring-and-run-surface`](../../docs/decisions/expose-recursive-check-authoring-and-run-surface.md) | Candidate runtime/type inventory 的唯一 owner。 |
| `src/product/**` | Bun runtime、declaration closure、default `jscpd` command 与既有 cache identity 实现。 |
| `scripts/package-candidate/**` | 自动准备、派生 manifest、build、pack、input fingerprint、preparation receipt、artifact audit 与 isolated acceptance。 |
| `scripts/quality/{project-definition,project-run}.ts` | Canonical repository consumer；只改为 public package imports。 |
| `scripts/quality/package.json` 与生成的 local install | 与 root package self-reference 隔离的 private repository-consumer resolution context。 |
| `scripts/quality/{index,scan}.ts` | `index.ts` 只建立 pinned Bun/mise 环境并进入 candidate-backed workflow；`scan.ts` 继续只调用 bound Run 并映射 process exit。二者都不拥有 candidate build。 |
| scripts typecheck、目标 Project Run test、test-evidence 与 workspace verifier | 在加载或 typecheck repository consumer 前复用同一 preparation owner；workspace verifier 用显式依赖避免并发准备。 |
| `AGENTS.md`、`docs/script-tooling.md` 与相邻稳定 owner | 实现后同步 root `quality` 的自动准备调用链、owner 与验证入口；不提前把计划描述成当前事实。 |
| [`support-bun-as-the-package-host`](../../docs/decisions/support-bun-as-the-package-host.md) | Bun-only host direction；本地证据只记录实际测试的 Bun/platform。 |
| [build-candidate-backed-project-gate](../build-candidate-backed-project-gate/) | 消费 `candidate-handoff.md`，并在 public/package inputs 变化后要求重新构建和验证 candidate。 |
| [publish-public-api-only-npm-package](../publish-public-api-only-npm-package/) | 以后独立处理 public version、legal materials、registry facts、授权与 publish。 |
