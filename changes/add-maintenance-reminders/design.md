# Design

本设计用一个 ordinary default Check value承接多条 local reminders，并以固定 first-parent Git activity模型产生 deterministic assessments。

## Context

当前 Product已支持 ordinary Check values、Check-owned options/execution dependencies、four-state final result、terminal messages、`attention` visibility、explicit aggregation和 native object composition。`keep-comparison-semantics-inside-producing-checks.md`要求 baseline acquisition与comparison留在 producing Check；`let-check-options-own-execution-dependencies.md`要求 Git executable属于 Check options。

[`complete-first-release-check-set-before-publication.md`](../../docs/decisions/complete-first-release-check-set-before-publication.md) 已将 maintenance reminders纳入首版，并明确不增加 constructor。Reminder entry只是 owning Check的局部配置和 assessment，不是 Check、Record或 dependency target。

## Goals / Non-Goals

**Goals**

- 让项目用一个 exported ordinary value和完整 options配置多条维护提醒。
- 固定可复现的 committed-history度量、messages与 enforcing折叠。
- 保持默认 advisory提示不阻断，真正 Gate结论仍由 caller aggregation消费 Check status。

**Non-Goals**

- 不新增 factory/constructor、generic baseline service、reminder Records或第二 scheduler。
- 不读取 worktree/index delta，不按 wall clock调度，也不自动修改 base commit。
- 不实现 path filters、acknowledgement state、notifications或 task-management workflow。

## Decisions

### Intended Change

1. **一个 fixed-ID ordinary value。** `maintenanceReminders`使用 `checkId = maintenance-reminders`、`displayName = Maintenance reminders`、`visibility = attention`、完整 default options与 direct execution。一个 Definition只配置这一组；多个提醒留在同一数组，不允许 reminder-level全局 identity。
2. **Closed options。** `git`精确包含 non-empty `executable`与 dense `availabilityArgs`。每条 reminder精确包含 `id`、`baseCommit`、`mode`、`message`、optional `maximumCommits`与 `maximumChangedLines`；至少一个 maximum存在。IDs unique lower-kebab，message非空，maximum为 positive safe integer，base为 lowercase 40或64 hex。
3. **Full commit identity与 first-parent ancestry。** Runtime验证 base解析为 commit object并精确出现在 `HEAD` first-parent chain。Symbolic refs、abbreviated IDs、tags、branch names、non-first-parent ancestors和无法取得的 shallow history均不接受，避免同一 options随 refs移动。
4. **Activity metrics。** Base本身不计；`commitCount`是 `base..HEAD` first-parent commit数量。`changedLines`逐 commit相对 first parent累计 numstat additions+deletions；merge只看 first-parent diff，binary entry计零，revert仍按其实际 diff计 activity，rename服从 Git numstat。未提交 worktree/index不进入。
5. **Due与 messages。** Actual严格大于任一配置 maximum时 entry due；等于上限仍 current。Due message保留 author顺序，code固定 `maintenance-reminder-due`，advisory level=`warning`，enforcing level=`error`，message正文使用 validated author string。
6. **Final data与 status。** 空 reminders为 `not-applicable`。正常 assessment返回 versioned final data：`reminderCount`、`dueCount`、`enforcingDueCount`和 ordered assessments（id、mode、status、commitCount、changedLines、exceeded dimensions）。有 enforcing due为 `failed`，否则 `passed`；advisory due因此可表现为 passed + warning message。
7. **Whole-Check failure。** Git unavailable、invalid history、process/parse failure或 cancellation使 Check `unavailable`并给出 closed reason；不返回 partial final data。因为本 Check不报告 Records，不存在 partial Record retention问题。
8. **Public/package closure。** 在 `default-checks.ts`与 runtime validator注册 value/options，同步 `src/index.ts`、public contract inventory、Configuration/Quality/Output、README/JSDoc/example、semantic Cases和 isolated candidate；不增加 CLI或 subpath。

### Resulting Impacts

- Definition fingerprint包含完整 Git/reminder options和 author order；execution callback不从 environment、Run flags或 repository tooling补造 policy。
- Messages在 progress与 `RunResult.checkMessages`可见，但不进入 Core Records或 machine v4；final assessment data正常进入 Check outcome publication。

## Risks / Trade-offs

- Cumulative changed lines刻画活动量而非 endpoint净差；revert也计入是预期行为，文档必须明确。
- Full commit ID要求调用方显式更新 baseline，但换来稳定、可审阅的 identity；本 Check不会自动推进。
- 整个 Check在一条 history失败时 unavailable，会隐藏其它 entries的 final data；这比发布不完整 assessment更可信，terminal reason仍可定位失败。

## Open Questions

无。

## Implementation Observations

2026-08-24：用户将本 Change提前到首次公开版本；原 constructor方向已改为 ordinary default value，Git/history、empty input、failure folding、identity与 public grammar均已收敛，可进入 Plan。
