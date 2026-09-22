# Tasks

以 [repository-material owner](../../docs/tooling/repository-material-validation.md) 的稳定材料 Check 图冻结 region corpus，再接入 eligibility 和选择证据。

## Readiness

- [x] 0.1 读取 repository-material owner 的 `materials-*` identity、输入清单、mutex，列出可增量与必须全量的 Check。
- [x] 0.2 在隔离 Git fixture 中整理 changed、unchanged、zero-match、overlap、rename/delete、unavailable 和 region 外 link target 场景。
- [x] 0.3 冻结 include/exclude、required/focused/all 矩阵和 dependency/observes 期望，确认不改变 Product flag DSL。
- [x] 0.4 审阅 effective-flags Decision；若 `repository-material` 成为长期项目规则，在验证完成后形成对应 Decision 交接。

## Implementation

- [x] 1.1 在 Project Definition 中新增 `repository-material` region，落实 corpus 确定的 include/exclude 与 owner 文档；补足会影响 schema/example 验收的 `src/**` 与共享脚本，或提供不触发的完整 corpus 证据。
- [x] 1.2 在 Gate eligibility 中投影材料 Check 的 change condition，保留 materials/all force path 和 `propagateDependsOn`。
- [x] 1.3 增加 region、selection、effective flags、callback、not-applicable 和 dependency closure tests，覆盖会改变 schema/example 验收的 region 外实现输入。
- [x] 1.4 同步 Project Gate、Project Definition、Change coordination 和材料 owner 文档的选择矩阵；只有 corpus 证据成立后才将 Check 标为输入闭合。

## Verification

- [x] 2.1 运行 Project changes、eligibility、Definition/Run selection 和 Gate focused tests。
- [x] 2.2 运行 `bun run test-evidence -- check --root .`，确认新增 selection Cases 闭合。
- [x] 2.3 运行 `bun run validate -- materials`、`bun run decisions -- check`、`bun run change-plan -- check-all changes` 和 `git diff --check`。
- [x] 2.4 运行 `bun run check`，用真实 changed/unchanged fixtures 验证默认、`--materials` 与 `--all` 的实际输出。
