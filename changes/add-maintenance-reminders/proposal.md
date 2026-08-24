# Proposal

本 Plan 在当前 ordinary Check contract 上交付低样板、确定性的 maintenance reminders default Check，并把它纳入首次公开 package。

## Why

项目会持续积累需要在一定变化量后复核、但默认不应阻断交付的维护事项，例如文档结构复核和代码质量抽查。项目可以自行编写 custom Check，但会重复 Git基线解析、first-parent变化度量、terminal messages与可选 enforcing结果。原 Draft选择专用 constructor，却会扩展当前 value-only public authoring surface；同一结果可以由一个 ordinary default value及其完整 options更简单地承接。

## Outcome

Package公开 ordinary value `maintenanceReminders`（`checkId = maintenance-reminders`）。项目通过 native object composition替换其 closed options，配置多条 local reminder entries；Check按 current `HEAD`相对每条 immutable base commit的 first-parent commits和累计 changed lines判断是否 due，以 terminal messages提示，并只在显式 enforcing reminder due时返回 `failed`。

## Scope

### Intended Change

- 新增 `MaintenanceRemindersOptions`：完整 Git executable配置与 dense `reminders`数组；每项包含 unique lower-kebab `id`、full commit object ID、`advisory | enforcing` mode、非空 message，以及至少一个 positive `maximumCommits` / `maximumChangedLines`。
- Default value使用 `visibility: attention`、固定 Check identity、`git` executable default与空 reminder数组；空数组执行时返回 `not-applicable`。
- 对每条 reminder验证 base是当前 `HEAD` first-parent chain上的 commit；commit count为 base之后的 first-parent commits数，changed lines为这些 commits逐个相对 first parent的 additions+deletions累计。
- Due条件是任一实际值严格大于对应 maximum；所有 due entries按 options顺序附加 terminal messages，advisory使用 warning、enforcing使用 error。
- 正常无 enforcing due时 `passed`，任一 enforcing due时 `failed`；final data保留 version、counts与每条 safe assessment。Git availability/history/process/parse/cancellation failure使整个 Check `unavailable`，不伪造 partial clean data。
- 公开 value/options、runtime validation、README/API example、package contract、owner docs、语义 Cases、Gate与 exact candidate。
- 不创建 constructor/factory、reminder-level Check或 Record、不自动推进 base、不包含 wall-clock schedule、acknowledgement workflow、external notification、path-filtered metrics或 shared baseline channel。

### Resulting Impacts

Git measurement、options fingerprint、message presentation、final data和 status folding必须作为同一 producing Check边界闭合；reminder entries始终是 Check-local配置，不进入全局 dependency/aggregation identity。

## Success Criteria

- Empty、current、commit-limit due、line-limit due、both-limits、mixed advisory/enforcing与多个 entries有稳定、按 author order的结果和 messages。
- Base必须是 full lowercase 40或64 hex commit ID并位于 current first-parent chain；missing/non-commit/non-first-parent/shallow unavailable均失败关闭。
- Merge相对 first parent计一次 commit，revert继续计实际 activity，binary changed lines计零，rename按 Git numstat，worktree/index未提交变化不计入。
- Advisory due保持 owning Check `passed`并因 `attention` + message可见；enforcing due使 Check `failed`；Git failure为 `unavailable`且没有 final data。
- Public value/options、Definition fingerprint/runtime validation、RunResult messages、README/declarations/isolated consumer和 required/full Gate均完成验证。

## Affected Owners

- `docs/configuration.md`：ordinary default value、closed options、native composition与 execution dependency。
- `docs/quality-metrics.md`：maintenance final data、四态 folding和无 supplemental Records边界。
- `docs/output.md`：final data进入 generic v4；messages仍不进入 machine publication。
- `docs/scanner-dependencies.md` 或相邻 process owner：Git executable与 process failure只作为 Check-owned private adapter。
- `src/checks/**`、`src/definition/**`、`src/index.ts` 与 package contract/materials：measurement、Check implementation、validation与 public surface。
- `docs/testing/cases/**`：Git history、limits、messages、status、failure与 public-consumer evidence。
