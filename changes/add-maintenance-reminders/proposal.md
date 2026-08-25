# Proposal

本 Plan 在现有 ordinary Check contract 内交付一个低样板、确定性的 `maintenanceReminders` 默认 Check，并把它作为首次公开 package 的一项可配置能力；它不同时替项目预设维护政策。

## Why

项目会持续出现“在累积一定提交或改动量后应复核、但默认不应阻断交付”的维护事项，例如文档结构复核和代码质量抽查。项目当然可以自行编写 custom Check，但每个项目都要重复处理 Git 基线、first-parent 活动量、终态消息和可选的 enforcing 结论。

当前 public authoring surface 只提供完整的 ordinary Check 值及原生对象组合。此前的专用 constructor 会引入第二种 authoring surface；同一用户结果可由一个带完整 closed options 的普通默认值承接，因此不应为此扩大 API。

## Outcome

完成后，package 使用者可从根入口导入固定 identity 的 ordinary value `maintenanceReminders`（`checkId = "maintenance-reminders"`），并用 native object composition 替换完整 options 来配置多条 local reminder entries。

一次执行以 Run 的当前 `HEAD` 为参照，对每条 immutable base commit 计算 first-parent 提交数和累计 changed lines：

- 任一已配置上限被**严格超过**时，该 entry 为 due，并按 author 的数组顺序产生 terminal message；
- advisory due 仅产生 warning message，owning Check 仍为 `passed`；enforcing due 还会使 owning Check 为 `failed`；
- Git、历史、进程、解析或取消无法完成整个评估时，owning Check 为 `unavailable`，且不发布 partial final data；
- 空 `reminders` 是合法默认配置，并产生 `not-applicable`。

## Scope

### Intended Change

#### Public value and configuration

- 新增 public `MaintenanceRemindersOptions` 和 complete ordinary value `maintenanceReminders`。默认值具有固定 Check identity、`visibility: "attention"`、Check-owned Git command configuration与空 `reminders` 数组。
- `reminders` 是 dense array。每条 entry 都包含 unique lower-kebab `id`、immutable full commit object ID `baseCommit`、`"advisory" | "enforcing"` `mode`、非空 `message`，以及至少一个 positive `maximumCommits` / `maximumChangedLines`。
- `git` 是完整且 closed 的 Check-owned execution dependency：它包含 non-empty `executable` 和 dense `availabilityArgs`。Definition validation 既不补齐缺失 nested field，也不从 environment、Run flags 或 repository tooling 生成 policy。

#### Repository activity measurement

- Git 命令以 callback 的 `context.project.root` 为工作目录；本 Check 只度量该 Run 所在 repository 的 committed history，不读取 worktree 或 index delta。
- `baseCommit` 必须是 lowercase 40 或 64 hex 的完整 object ID，解析后必须是 commit，并精确位于 current `HEAD` 的 first-parent chain。symbolic ref、abbreviated ID、tag、branch name、non-first-parent ancestor 和无法取得所需历史的 shallow checkout 都不接受。
- Base 本身不计入活动量。`commitCount` 是 `base..HEAD` 的 first-parent commit 数；`changedLines` 是这些 commits 各自相对 first parent 的 Git numstat additions + deletions 累计。
- Merge 只计一次并使用 first-parent diff；revert 仍按自身实际 diff 计活动；binary numstat 条目计零；rename 服从 Git numstat。

#### Result, presentation and identity

- Entry 在实际值严格大于任一已配置 maximum 时 due；等于 maximum 仍为 current。所有 due entries 保持 options author order。
- 每个 due entry 使用 stable message code `maintenance-reminder-due`。advisory message level 是 `warning`，enforcing message level 是 `error`，正文保留已验证的 author message。
- 正常完成时，final data 保留 version、总数、due/enforcing-due counts 和有序的 per-entry safe assessments；有任一 enforcing due 时返回 `failed`，否则返回 `passed`。
- Reminder entry 始终是 owning Check 的局部配置与 assessment；它不成为 Check、Record、dependency、aggregation selection 或全局 baseline identity。

#### Public closure and explicit exclusions

- 同步 public value/options、runtime validation、Definition fingerprint、README/API example、declarations、package contract、owner docs、semantic Cases、exact package candidate和 required/full Gate evidence。
- 不新增 constructor/factory、reminder-level Check 或 Record、generic/shared baseline service、自动 base 推进、wall-clock schedule、acknowledgement workflow、external notification、path-filtered metrics、CLI、subpath 或新的 Run/Core entity。
- 当前 Plan 尚未指定在 `scripts/project/quality/definition.ts` 配置非空的 repository reminder policy。该 Definition 的具体 base、上限、mode 与可见性是项目消费策略，不是 package default；若用户要求立即 dogfood 该策略，须先扩大本 Change 的 scope、tasks 与验证。

### Resulting Impacts

| Boundary | 必须闭合的影响 | 证明方式 |
| --- | --- | --- |
| Definition / fingerprint | 完整 Git 与 reminder options（含 author order）进入 validated declarative fingerprint；callback 不偷读隐藏 policy。 | options、validation 和 fingerprint tests。 |
| Producing Check | Git acquisition、first-parent measurement、due classification、messages、final data 与 status folding 由同一个 Check 完成。 | hermetic Git history、limits、message/status/failure tests。 |
| Run / output | Messages 只进入 progress 与 `RunResult.checkMessages`；assessment final data 按 generic v4 Check outcome publication；没有 supplemental Records。 | Run/output tests、docs schema/example validation。 |
| Public package | 新 value/options 与说明、声明、contract inventory、example 和 installed consumer 必须一致。 | candidate build、isolated Bun consumer 和 package audit。 |
| Repository policy | package capability 不能被隐式当成 Vibe Check 仓库的强制维护规则；当前 Plan 未指定非空 policy。 | scope review；若启用实际策略，先补充独立 policy 决定。 |

## Success Criteria

- 空配置、current、仅 commit-limit due、仅 line-limit due、两个 limit 同时 due、mixed advisory/enforcing 和多 entry 都产生稳定的 assessment 顺序与 terminal messages。
- Base 只接受 full lowercase 40/64-hex commit ID，且必须位于 current first-parent chain；missing、non-commit、non-first-parent 和 shallow-history failure 均 fail closed 为 `unavailable`。
- Merge、revert、binary、rename 和未提交 worktree/index 的行为符合本 Plan 的 activity model。
- advisory due 保持 owning Check `passed` 且因 `attention` + message 可见；enforcing due 为 `failed`；任何 whole-Check measurement failure 为 `unavailable` 且无 final data。
- public value/options、Definition validation/fingerprint、`RunResult.checkMessages`、README/declarations、isolated consumer、required Gate 与 full Gate 都有对应证据。

## Affected Owners

| Owner | 本 Change 的责任 |
| --- | --- |
| [`docs/configuration.md`](../../docs/configuration.md) | ordinary default value、closed options、native composition、execution context 与公开 authoring 说明。 |
| [`docs/quality-metrics.md`](../../docs/quality-metrics.md) | maintenance final data、四态结果、无 supplemental Records 与 aggregation 边界。 |
| [`docs/output.md`](../../docs/output.md) | final data 进入 generic v4、messages 不进入 machine publication 的边界。 |
| [`docs/scanner-dependencies.md`](../../docs/scanner-dependencies.md) 或相邻 process owner | Git executable、availability、process failure 和 cancellation 的 private adapter 边界。 |
| `src/checks/**`、`src/definition/**`、`src/index.ts`、`src/contract/**` 与 package materials | measurement、Check implementation、runtime validation、public export、candidate 和说明。 |
| [`docs/testing/cases/**`](../../docs/testing/cases/) | Git history、limits、messages、status、failure、identity 与 public-consumer evidence 的语义 Case 闭合。 |
