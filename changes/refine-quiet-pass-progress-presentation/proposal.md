# Proposal

本 Plan 将现有 `visibility: "attention"` 收敛为可预测的 quiet-pass row 省略策略：Check 在运行中仍可见，安静通过后不占用结果列表，且不会伪装成漏跑。

## Why

环境探测、共享输入准备和纯计算 provider 必须参与调度、依赖传播、失败诊断与全局计数，但它们在既无 accepted Record 也无 message 的通过状态下通常没有值得长期保留的独立结果。当前 `visibility: "attention"` 只省略 settled row：TTY running row 仍显示普通 `[n/total]`，settlement 后该行消失，而 completion accounting 继续前进，容易让读者把编号跳跃理解为漏跑或结果丢失。

默认输出需要同时保留长运行反馈和成功降噪。逐项列出被省略的 Check 会抵消降噪价值；建立独立 live/results 界面会扩大 TTY 与 append-only 输出模型的差异。本 Change 因此保留现有 renderer、完整 lifecycle facts 和全局 accounting，只调整 authoring grammar、row 编号策略与汇总计数。

## Outcome

Check author 通过 `omitQuietPassedRow: true` 显式启用策略。启用后，该 Check 的 TTY running row 与所有需要保留的 settled row 都不显示 `[n/total]`；quiet pass 的 settled row 被省略，其它终态或带 accepted detail 的 pass 继续保留。Run header 报告静态配置数，final summary 报告本次实际省略数；普通编号仍按所有 executable Check 的 settlement 推进。Check facts、依赖、aggregation、duration readback、machine output 和默认未配置时的 terminal bytes 保持不变。

## Scope

### Intended Change

- 用 executable-only、non-inherited 的 `omitQuietPassedRow?: true` 替换 `visibility`；省略或 runtime own `undefined` 规范化为 `false`，显式 `true` 规范化为 `true`，其它值失败。旧字段直接退出 closed grammar，不提供 alias、双读或兼容期。
- normalized declaration 只保留一个 boolean presentation fact，并将其纳入 declarative snapshot/fingerprint。该事实沿 private prepared/started/settled progress handoff 进入 renderer，不进入 public RunResult 或 machine schema。
- policy-enabled Check 的 TTY running row 与所有 retained settled row 使用无编号格式。quiet pass 精确定义为 `passed` 且 accepted Records/messages 均为空；final data、preview limit、formatter 返回文本及终端截断不参与判定。
- 完整 settlement counter 继续为普通 `[n/total]` row 提供全局 progress accounting；quiet pass 被省略后允许编号跳跃，不把编号解释为 retained-row ID。
- 仅当至少一个 normalized executable Check 启用策略时，header 追加 `· <configured> configured for quiet-pass omission`，final summary 追加 `quiet-pass rows omitted: <actual>`。配置数包含因 flags 未匹配而未启动的声明；实际数只包含 renderer 省略的 quiet pass。零配置时现有 terminal/tee bytes 保持不变。

### Resulting Impacts

- Check authoring type、closed runtime validation、normalization、declarative snapshot、fingerprint、JSDoc 与 package declaration examples 必须原子迁移，避免新旧字段形成两个事实源。
- Check execution 与 progress presentation 的 private lifecycle feedback 必须在 start 前提供规范化策略；renderer 负责静态配置数、无编号格式、实际省略数与 exact text。
- TTY redraw、plain/`TERM=dumb`、flag-condition grouping、tee 和 writer-failure 继续遵守当前 owner；flag mismatch 仍进入既有分组并推进 settlement accounting，不计为 quiet-pass row omission。
- 公开 Run output / Check authoring 指南、内部 Human output / Project Definition owner、package examples、package Check 用法与 installed-consumer fixtures 必须同步。machine schema 与 RunResult 无字段变化，应以测试和文档明确证明“不变”，而非机械修改。
- active/unaligned Decision `260914-configure-progress-previews-and-quiet-pass-presentation` 已承接完整 preview 契约与 quiet-pass 方向；实现和 owner 证据闭合后再标记 aligned。测试正文、test identity 和 Case `Proves` 的迁移按 Test Evidence 流程闭合。下一版本的升级说明由 release Change 写入 changelog，本 Change 不改写已发布的 `0.0.2` 历史。

## Success Criteria

1. Public TypeScript authoring 和 runtime closed grammar 只接受 executable Check 的 `omitQuietPassedRow?: true`；省略/own `undefined` 与规范化 `false` 等价，`true` 形成不同 declarative fingerprint，container、`false`、`visibility` 和其它值均失败。
2. 在 TTY 中，policy-enabled Check running 时可见并刷新 elapsed；quiet pass settlement 后不留下 row，带 accepted Record/message 的 pass 及 failed/not-applicable/unavailable 均以无编号 row 保留，并继续使用既有 detail、duration、reason、escaping 和 color pipeline。
3. 在 plain 与 `TERM=dumb` output 中不新增 running row；quiet pass 不输出 settled row，其它 policy-enabled outcome 输出无编号 settled row。flag-condition-not-matched 仍按 Definition order 进入既有聚合块，不计入实际省略数。
4. 全部 executable Check 继续参与 total/completion counts、dependencies、aggregation、`RunResult.checkDurations`、Check/Record/message facts 与 machine publication。普通 row 的 `[n/total]` 随每次 settlement 推进，即使对应 quiet-pass row 没有保留。
5. 零配置 Run 的 terminal 与 progress tee bytes 保持现状。非零配置 Run 的 header 使用 `total <total> checks · <configured> configured for quiet-pass omission`，final summary 在 `elapsed` 前使用 `quiet-pass rows omitted: <actual>`；configured 与 actual 分别按静态声明和实际 renderer 省略计数。
6. Public/Internal owner、examples、package consumer evidence、successor Decision 与 Case ledger 同步完成；最窄测试、docs validation、Decision/Test Evidence checks、typecheck、lint 和完整 `bun run check -- --all` 均通过，且非实施代理从实际实现 diff 反查文档影响。

## Affected Owners

- Public contract：`src/check/check.ts` 的 Check authoring/JSDoc、`docs/guides/run-outputs.md`、`docs/guides/extending-check-lifecycle.md`。
- Definition：`src/project-definition/check-tree/**`、`src/project-definition/project-definition.ts`、`docs/development/project-definition.md` 与 declarative fingerprint evidence。
- Human output：`src/project-run/check-execution/**`、`src/project-run/progress-rendering/**`、`docs/development/human-output.md`。
- Package materials：`docs/examples/package-api/custom-check.ts`、`docs/examples/artifacts/mixed-outcomes/definition.ts`、`src/package-checks/maintenance-reminders/**`、`scripts/package/candidate/external-consumer/**` 及其投影/验收 owner。
- Governance/evidence：`docs/decisions/configure-progress-previews-and-quiet-pass-presentation.md`、`docs/testing/cases/scan-configuration.md`、`docs/testing/cases/report-output.md`、`docs/governance/change-coordination.md`。
