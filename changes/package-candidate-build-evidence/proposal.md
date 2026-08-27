# Proposal

本 Plan 将本地 package candidate 的可查看 build evidence 与可复用缓存状态分离，并提供明确的根级操作入口。

## Why

当前 candidate 将 unpacked package 和 versioned tarball 同 receipt、编译状态一起置于 `.cache/vibe-check/package-candidate/`。这使完整 package build evidence 难以发现，也让 cache 目录同时承担可查看产物的角色。

## Outcome

默认 build 后，`build/package/` 是唯一可直接查看的完整 unpacked package evidence，`build/artifacts/` 保存 versioned `.tgz`，而 `.cache/vibe-check/package-candidate/` 只保存 receipt 与编译缓存状态；`package:status`、`package:build` 与 `package:verify` 分别提供只读 freshness、prepare/reuse/reinstall/rebuild+审计和完整 package acceptance。

## Scope

### Intended Change

集中 package build path/output contract，迁移 candidate lifecycle 与 Gate typed handoff 到默认 build roots，增加 fail-closed root commands、相邻测试和稳定 owner 文档，同时保持 package 内 runtime、types、maps、sources、docs、licenses 与 external runtime dependency manifest 义务不变。

### Resulting Impacts

- receipt reuse 必须验证 build-owned artifact 和 unpacked evidence，而清理只能删除精确拥有的 generated package paths。
- fixture 可传入独立 state/build roots，避免测试写入默认 build roots。
- Gate 和 artifact acceptance 必须继续消费同一次 candidate 的 typed unpacked/tarball evidence；完整 acceptance 复用 existing full Gate。

## Success Criteria

- 默认 output layout、state boundary、root commands 与状态字段有实现和测试证据。
- package material/consumer acceptance 继续针对同一完整 artifact，且 package content obligations 不变化。
- Change、Decision、Case、owner docs 与范围匹配的验证通过。

## Affected Owners

- `docs/script-tooling.md#package-artifact-与-candidate`
- `docs/script-tooling.md#project-gate`
- `docs/testing.md` 与 `docs/testing/cases/repository-tooling.md`
- `scripts/package/**`、`scripts/project/gate/**` 与根 `package.json`
