# Gate cutover handoff

本交接记录保存 `replace-workspace-verifier-with-project-gate` 已完成的正式 binding 与 legacy-retirement 事实，供后续 Gate optimization 与 package publish Change 恢复。稳定 Gate 行为唯一由 [`docs/script-tooling.md`](../../docs/script-tooling.md#project-gate) 拥有；任务进度由本 Change 的 [tasks.md](tasks.md) 拥有。本文件不授予 registry、凭据或发布操作，也不证明后续 optimization、documentation 或 publish 已完成。

## 实际绑定与范围

三个保留的 root names 只是 repository wiring，不标识 legacy implementation。`package.json` 的实际 target 如下：

| 根脚本 | 直接 Project Gate target | 正式选择 |
| --- | --- | --- |
| `verify:vibe-check-workspace` | `bun scripts/project-gate/index.ts` | adapter 默认 `full` |
| `verify:vibe-check-workspace:required` | `bun scripts/project-gate/index.ts --profile required` | `required` |
| `verify:vibe-check-workspace:full` | `bun scripts/project-gate/index.ts --profile full` | `full` |

三项正式调用均不传 disabled tag。`quality` 保持独立、唯一的 non-blocking dogfood root：`bun run quality` 仍经 `scripts/quality/index.ts` 调用 repository Project Run，而不承担 Gate policy。

本次实施重新发现 repository CI/workflow：没有 `.github`、GitLab、CircleCI、Buildkite、Azure Pipelines 或 Jenkins workflow，因此没有额外 CI target 需要迁移。

## Candidate 与 manifest 证据边界

下列 identity 来自完成后 root/partial invocations 使用的 matching preparation receipt。它证明本地 consumer 所用 candidate；不代表 registry artifact、公开版本或 publish evidence。

| 字段 | 记录值 |
| --- | --- |
| 运行时 | Bun `1.3.14` on `linux-x64` |
| Candidate 版本 | `0.0.0-local.14c849cd8f47` |
| Candidate 输入 fingerprint | `14c849cd8f47f68c94e0db389fc8937e3b7d3fe59c5aee8732c6c04f01d96cc1` |
| 精确 tarball | `/workspace/vibe-check/.cache/vibe-check/package-candidate/artifacts/vibe-check-0.0.0-local.14c849cd8f47.tgz` |
| Tarball SHA-256 | `2be56847f0eed153c5a63723fd48c6d7bb19fb38ddd42f61fab2dec55dc9b46b` |
| 已安装 entry | `/workspace/vibe-check/scripts/quality/node_modules/vibe-check/index.mjs` |
| 已安装 entry SHA-256 | `8194a7bf68cbdb9e117461ef08f213ad0a02f51f198a04eff973d4a6a8f9c3ce` |

Gate manifest 使用 byte-order UTF-8 POSIX-relative paths，对每个 regular file 追加 `path + NUL + raw bytes + NUL` 后计算 SHA-256。范围是 `scripts/project-gate/**`、`scripts/quality/project-gate/**`，以及 `docs/script-tooling.md`、`docs/testing/cases/repository-tooling.md`、`scripts/tools/foundation/src/process/types.ts`、`scripts/tools/foundation/src/process/runner.ts`、`scripts/tools/foundation/test/foundation.test.ts`。

| 字段 | 记录值 |
| --- | --- |
| 文件数 | `15` |
| Cutover manifest SHA-256 | `30b631f61bc8f1a0db416e1e753ef6cc33cbc5071b4506183cad3dad64fd4e68` |

该 manifest 标识证据形成时的工作树 Gate inputs，不标识 committed tree。`.log/**`、`artifacts/**` 与 `.cache/**` 是 ignored diagnostic state；表中的本地路径只用于定位，不是 durable artifacts。

## 已执行的 Gate 证据

本次执行观测到 catalog 有 20 个 Check；完整 profile 分别执行 14 个 required 和 19 个 full eligible Check，固定 capacity 为 `4`。稳定的 adapter 与 exit 语义由 [Project Gate owner](../../docs/script-tooling.md#project-gate) 完整定义；下表记录本次 invocation 的选择、exit 与本地日志。每次 invocation 都在 `.log/project-gate/<unique>/` 下写入 per-Check transcript。

| 调用 | 选择与结果 | 耗时 | 本地日志目录 |
| --- | --- | --- | --- |
| `bun run verify:vibe-check-workspace:required` | required; `disabled-tags=none`; exit `0`; `14 passed`, `6` profile N/A | `14.7s` | `.log/project-gate/2026-08-20T16-44-09.837Z-3385854-ac969545-6908-4716-be24-341e8ce200c6` |
| `bun run verify:vibe-check-workspace:full` | full; `disabled-tags=none`; exit `0`; `19 passed`, `1` profile N/A | `16.4s` | `.log/project-gate/2026-08-20T16-44-24.785Z-3387374-d93036d8-be72-4c32-8d95-01d527114176` |
| `bun run verify:vibe-check-workspace` | default full; `disabled-tags=none`; exit `0`; `19 passed`, `1` profile N/A | `16.2s` | `.log/project-gate/2026-08-20T16-44-41.404Z-3389419-ea7d1a89-0492-4789-8fc7-7c7a47b158d0` |
| `bun scripts/project-gate/index.ts --profile required --disable-tag docs` | local partial only; exit `0`; `10 passed`, `10` N/A (`4` tag-disabled, `6` profile-excluded) | `14s` | `.log/project-gate/2026-08-20T16-44-57.764Z-3384784-975be899-5a9f-402f-bda3-da22430d1f20` |

partial invocation 只证明本地 eligibility，不替代 complete-profile acceptance。`bun run quality` 也按其 non-blocking observation 目的以 `0` 退出；本次重跑没有报告 quality record。

补充的 cutover 验证：

- Focused Gate tests：`bun test scripts/project-gate/index.test.ts scripts/quality/project-gate/project-definition.test.ts scripts/quality/project-gate/process-check.test.ts` → `12 passed / 0 failed`。
- Strict Test Evidence：`bun run test-evidence -- check --root .` → `193` current Bun entities，全部由 `10` 个 topics 中的 `45` 个 Cases 映射。
- Scripts checks：`bun run typecheck -- scripts`、`bun run lint -- scripts` 与 `bun run format -- check` 均通过。

## Legacy 退役审计

`scripts/vibe-check-workspace/**` 已作为一棵 18-file implementation tree 删除，其中包括两个 native test files。两个 legacy-only workspace adapter/profile Cases 已移除。保留的 Project Gate test 断言三个精确 root targets 及不存在 disabled tags；其 Case Owner/Proves 已指向 `docs/script-tooling.md#project-gate`。

最终审计确认：

1. `package.json` 恰有上表三个直接 Project Gate root targets；`.codex/rules/vibe-check.rules` 允许新的 direct adapter path，并保留 root-name permissions。
2. `scripts/quality/project-definition.ts` 在 tooling collection 中包含 `scripts/project-gate/**/*.ts`，且不再包含已删除 tree。
3. 当前 source、tests、Case ledger、configuration、rules 与稳定 owner 文档对 `scripts/vibe-check-workspace/**` 的 direct call/import/path reference 均为零；该 source tree 本身不存在。
4. `AGENTS.md`、Codex environment files 与 active Change artifacts 中保留的 root-name references 是 wiring 或 plan context，不是 implementation caller。活动 Decision 的形成时背景与 archived materials 是历史证据，不是 current owner。
5. 不存在可绑定不同 implementation 的 CI/workflow。

## 重新验证与下游使用

绑定与退役事实在正式 root target、direct caller、CI/workflow、source-path permission 或 legacy-retirement path 改变前持续可用。发生任一改变后，先重新审计这些 surface 并从实际 root required/full 重跑，再声称同一 cutover 状态。

Candidate input fingerprint、receipt、tarball、installed/resolved entry、Bun/runtime boundary 或 15-file manifest scope 中任一文件改变时，必须刷新 behavior/artifact evidence。matching receipt 可以复用，但发生该 drift 后仍须重新取得 complete-profile acceptance。local partial runs 始终只是 diagnostic evidence。

下游 `align-project-gate-with-native-check-authoring` 消费这里的 binding/retirement facts，并为 behavior/artifact changes 记录自己的 `gate-optimization-handoff.md`。publish Change 还需要两份 handoff、package documentation evidence 和单独的 registry/write authorization。

## VCS 回退边界

Plan baseline 是 `0b382d8bca6fc17541e79f4444400354df6c739b`；写入本 handoff 时，记录的 cutover worktree 尚未提交。回退应从该 baseline 恢复精确的 cutover path set，而不是永久保留双实现：

- `.codex/rules/vibe-check.rules`、`package.json` 和 `scripts/quality/project-definition.ts`；
- `scripts/project-gate/catalog.ts`、`scripts/project-gate/index.test.ts`、`scripts/quality/project-gate/process-check.test.ts` 和 `scripts/quality/project-gate/project-definition.test.ts`；
- `scripts/vibe-check-workspace/**`（恢复已删除 tree）；
- `docs/script-tooling.md`、`docs/navigation.md`、`docs/testing.md`、`docs/decision-and-change-governance.md`、`docs/testing/cases/repository-tooling.md` 和 `src/product/README.md`；以及
- 本 Change 的 `proposal.md`、`design.md`、`tasks.md`、`readiness-evidence.md` 和 `gate-handoff.md`，并在恢复关联计划/导航状态时包含 `changes/active-change-portfolio.md` 与 `changes/vibe-check-package-and-gate-delivery.md`。

任何回退后，都重新运行恢复后的正式 root required/full commands；不得把上方 ignored local logs 当作恢复状态的证据。
