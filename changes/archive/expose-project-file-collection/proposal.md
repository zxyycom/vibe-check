# Proposal

本 Plan 在不扩大 Check policy 的前提下，把现有 project-file collection 的单 selection 使用结果作为经过验证的公开 Product contract。

## Why

自定义 Check 与普通项目脚本需要按 Vibe Check 已定义的 `source`、`include` 与 `exclude` 规则取得一份项目文件选择，避免复制候选枚举、Git worktree 处理、glob 过滤、路径归一化和失败处理。当前 package root 虽已公开 `defaultProjectFileSelection`、`ProjectFileSelection`、`ProjectFileSelectionOptions` 与 `ProjectFileSource`，实际 collection 仍只在 `src/package-checks/project-files/collection.ts` 中由 package-provided Checks 调用。

这些 consumer 只共同需要“一次同步收集一份显式 selection”；`codeAreas`、领域阈值、overlap/duplicate comparison、content read、cache、watcher 与多 selection 枚举不属于该共同用途。直接 export 内部 typed-trust 函数会把未经 public validation 的边界与 private batch optimization 锁进兼容面。

## Outcome

package root 提供一个同步、单 selection 的 public collector。调用方显式提供 root 和完整 selection；它返回冻结的、相对该 root 且使用 `/` 的稳定去重排序路径快照，或者以可辨认错误报告无效输入或选定 source 的普通 I/O/Git 失败。它不读取文件内容、不隐式选择 current working directory、不支持取消，也不公开 batch、source candidate、cache 或 watcher API。

## Scope

### Intended Change

在现有 `src/package-checks/project-files/**` owner 内增加公共 validation/snapshot façade `collectProjectFiles({ projectRoot, selection })`，通过 package root re-export 给 custom Check 与普通脚本使用。它接收显式、非空、无 U+0000 的 root string（relative text 相对当前 CWD、absolute text 直接使用，并在边界 `resolve(...)`）和完整 `ProjectFileSelection`；运行时 closed validation 后复用既有 trusted collector。返回 detached frozen `readonly string[]`，路径相对 resolved root、slash-normalized、stable text-sort且去重。

只同步 public root、public inventory、project-files owner、README、package-published guide/managed executable example、public consumer acceptance以及直接 tests/scan-scope Case。public operation 不猜测 partial `ProjectFileSelectionOptions` defaults；consumer 可显式 spread `defaultProjectFileSelection` 形成完整 selection。

### Resulting Impacts

- 因为新增 package root operation/options type，必须同步 `src/index.ts`、`scripts/package/public-api-inventory.ts`、其 direct test和 installed consumer type/import evidence，并以 adjacent Chinese JSDoc 满足 public-root inventory policy。
- 因为 public boundary 现在接受 unknown/JS caller data，必须区分 `TypeError` invalid invocation 与现有 filesystem/Git synchronous collection `Error`；成功空数组仍是合法结果，绝不 fallback 或改 source。
- 因为 public snapshot 不能暴露 internal mutable return，必须验证 output frozen/detached；它不承诺与 Check 共用同一 snapshot、atomic filesystem、后续 content/readability、sandbox或 cancellation。
- 因为公开使用说明必须从 package material 恢复，必须更新 project-files stable owner、README和一个 guide/managed example，明确 root resolution、full selection、source behavior、output与非目标；并保持 private batch/enumerator/Check policy 不进入 public surface。
- 因为新增或变更 direct test entities，必须维护 `docs/testing/cases/scan-scope.md`，在测试前后运行 strict test-evidence closure及最窄行为验证。
- 因为 public API 有 installed consumer contract，必须为 package-candidate consumer增补 root import/type/runtime evidence；Project Gate definition、API mechanics和 quality-gate/scan-configuration files由主代理维护，不在本 Change implementation ownership内混改。

## Success Criteria

1. `collectProjectFiles({ projectRoot, selection })` 能从 package root 被 TypeScript/JavaScript consumer 调用，selection 为完整 `ProjectFileSelection`；consumer 可显式组合 `defaultProjectFileSelection`，而 partial defaults 不被 collector 推断。
2. 对成功 collection，返回 value 与内容均不可由 caller mutation影响，且每个 path 是相对 resolved root 的 slash path、stable text-sorted并去重；无匹配 path 返回冻结空数组。
3. public input validation 拒绝 malformed/extra-key/hostile options、root或 selection，不读取 accessor value；invalid invocation 同步给出 action-bearing `TypeError`。filesystem/Git selected source failure仍同步为 collection `Error`，没有 source fallback或空集合伪装。
4. filesystem/git-worktree、glob、Git ignore、submodule与候选 mechanic 继续由既有 private collector承接；package root 不导出 batch、`ReadonlyMap`、source candidate、content read、cache、watcher、`codeAreas`或 `AbortSignal` contract。
5. project-files owner、README、public guide/example、inventory、public consumer evidence和 scan-scope semantic Case一致，且范围匹配验证通过。

## Affected Owners

- [`docs/development/project-files.md`](../../../docs/development/project-files.md)：public collection contract及 Check-owned/private collection boundary。
- `src/package-checks/project-files/**`：public validation/snapshot façade、trusted collection reuse及直接行为 tests。
- `src/index.ts` 与 `scripts/package/public-api-inventory.ts`：唯一 package root与approved public roots inventory。
- [`docs/tooling/documentation.md`](../../../docs/tooling/documentation.md)：README/guide/executable example projection与package material mechanics。
- [`docs/testing/strategy.md`](../../../docs/testing/strategy.md) 与 [`docs/testing/case-maintenance.md`](../../../docs/testing/case-maintenance.md)：direct test entity与`scan-scope` Case proof/closure。
- active、已对齐的 [provide-synchronous-single-selection-file-collection](../../../docs/decisions/provide-synchronous-single-selection-file-collection.md)：它承接本 Change 的同步单 selection direction；完整方向已经过独立审查和包消费者验收。
