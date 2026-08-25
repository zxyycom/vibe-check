# Tasks

先固定已确认的 public / lifecycle 判断，再按 Definition、Git execution、result evidence、package material 的顺序实现和验证该 single-Check constructor。

## Readiness

- [x] 0.1 用 `complete-first-release-check-set-with-specialized-maintenance-reminder.md` 归并并建立 `maintenanceReminders(entries)`、single-Check、advisory/enforcing 与 Git failure folding 的长期方向；已运行 `bun run decisions -- check`。
- [x] 0.2 审阅 Configuration、Quality Metrics、Output、Coding Style、Testing、package tooling、现有 default Check / Run source 与相邻 tests；确认 `quality` dogfood policy 不在本 Change 范围。
- [x] 0.3 在实施前运行 `bun run test-evidence -- check --root .`，定位将变更的 current Cases 与目标 Bun tests；记录起点已闭合并按该账本维护新增/变更实体。

## Implementation

- [x] 1.1 在 `src/checks/**` 与 Definition owner 中实现 `MaintenanceReminder`、`MaintenanceReminderOptions` 和 `maintenanceReminders(entries)`：生成 fixed-ID/attention ordinary Check、Check-owned Git executable default、closed entry/options validation 与 declarative fingerprint coverage；从 `src/index.ts` 公开最小 runtime/type surface。
- [x] 1.2 实现 private Git-history adapter 和 direct Check callback：以 project root / AbortSignal 测量 base 到 HEAD 的 first-parent commits 与逐提交 numstat，形成完整 ordered local assessments，并将 process/history/parse failures准确分类为 entry unavailable 或 whole-Check unavailable。
- [x] 1.3 实现 advisory/enforcing folding、terminal message attachments 与 final assessment data；覆盖 one-Check identity、no Record / child Check、Definition failures、clear/due/unavailable、progress / `RunResult.checkMessages`、generic v4 final-data boundary和 cancellation/protocol boundary的最窄 Bun tests。
- [x] 1.4 用 hermetic temporary Git repositories 覆盖 full base、first-parent ancestry、commit / changed-line count、strict thresholds、merge、revert、binary/rename、Git executable/history failure 和不读取 worktree/index delta；将测试实体映射到真实 semantic Cases。
- [x] 1.5 更新 Configuration、Quality Metrics、Output、README template / root JSDoc 和 package API examples，说明 constructor input、single-Check effect、manual base、advisory/enforcing、message/output/aggregation边界与非目标；运行 package-api projection，勿直接手改生成物。
- [x] 1.6 更新 package artifact public-export audit、declaration expectations、isolated consumer 与相关 semantic Cases，使 exact tarball 能 typecheck/import/use新 constructor；不改 `scripts/project/quality/**` 的实际 policy。

## Verification

- [x] 2.1 运行所有受影响的最窄 Bun tests、`bun run test-evidence -- check --root .`、`bun run typecheck`、`bun run lint` 和 `bun run validate`；审阅每项失败是否为本 Change 引入。
- [x] 2.2 运行 `bun run decisions -- check`、`bun run change-plan -- check changes/add-maintenance-reminders`、package artifact / isolated-consumer target tests 和 `bun run verify:vibe-check-workspace:required`，确认 public package、docs、output与 Gate消费证据闭合。
- [x] 2.3 在提交发布准备前运行 `bun run verify:vibe-check-workspace:full`，并逐项核对 proposal Success Criteria、no-dogfood scope、完整 final-data evidence和未引入 generic factory/Check collection/Record model。
