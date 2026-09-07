# Proposal

本 Plan 以已获批准的测试窄修复消除 Process Check 集成测试对仓库根默认 machine publication 的写入，不改变 Product 的生成机制或目录保留策略。

## Why

已授权删除的 `artifacts/vibe-check/run.json` 与 `records.ndjson` 是该测试未传入 `projectRoot` 且保留旧 `outputs.output` 配置时留下的默认 machine publication。测试应显式表示禁用 publication，并在自己的临时 project root 内运行，而不能继续依赖或污染仓库根。

## Outcome

Process Check 的 nonzero-exit public Run 证明保留安全 Record、`command-failed` message 与 progress 语义，同时显式得到 disabled machine-publication 状态，并在测试结束后不留下默认 `artifacts/vibe-check/{run.json,records.ndjson}`。

## Scope

### Intended Change

仅更新 `scripts/project/gate/checks/process/process.test.ts` 中既有 nonzero-exit 测试：将陈旧 `outputs.output` 替换为 `outputs.machinePublication: { enabled: false }`，传入该测试创建的临时 `projectRoot`，并断言 RunResult 的 disabled publication 状态及该临时 root 内默认 publication 文件不存在。同步更新同一既有实体的 repository-tooling Case，记录其新增的隔离证据。

### Resulting Impacts

- 测试 fixture root 继续由现有 `try/finally` 删除；其 `checks` transcript 断言保持原样，且不创建、覆盖或检查仓库根 sentinel。
- 本次只证明该 Run 配置禁用了默认 publication；默认 enabled 行为仍由 Project Run 输出 owner 的既有测试证明。
- 不修改 `src/**`、package/candidate/build 机制、manifest、稳定用户或内部行为文档，且不进行更多 artifact 删除。

## Success Criteria

- 目标测试使用 current `machinePublication` output field 和 test-local `projectRoot`。
- 目标 RunResult 显式报告 machine publication disabled，且临时 root 中不存在默认 `run.json` 与 `records.ndjson`。
- 既有安全 Record、message、progress preview 与 transcript-only secret assertions 仍通过。
- 目标 Bun test、test-evidence closure 和本 Change Plan check 通过。

## Affected Owners

- `docs/tooling/project-gate.md#project-gate`：Process Check 的 transcript、Record 与 Run integration contract；其 current Case 在 `docs/testing/cases/repository-tooling.md`。
- `docs/development/project-run.md` 与 `docs/output.md`：读取为 Run controls、disabled output status 与默认 machine publication 的事实 owner；本次不修改其稳定契约。
- `docs/testing/strategy.md` 与 `docs/testing/case-maintenance.md`：测试实体正文与 Case 维护流程 owner。
