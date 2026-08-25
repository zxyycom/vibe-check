# Proposal

本 Plan 将 `maintenanceReminders(entries)` 落实为一个只生成单一 ordinary Check 的专用 package constructor，并为其 Git 维护周期结论建立公开契约与完整验证证据。

## Why

项目会积累“应当复核，但默认不应把交付判为失败”的维护事项，例如文档结构复核与代码优化质量抽查。每个项目自行实现会重复 Git 基线、变化量、提醒展示和可选阻断的处理；Product 可以提供一个低样板的专用能力。

多条提醒不天然需要独立调度、dependency、aggregation selection、progress row 或 machine Check row。把每条提醒提升为 Check 会污染 canonical Check catalog，也会使一个维护职责被错误拆成多个 Product entities。因此一组提醒必须保持为一个 owning Check 的局部数据。

## Outcome

package 根入口将公开 `maintenanceReminders(entries)`、`MaintenanceReminder` 和 `MaintenanceReminderOptions`。constructor 返回一个 complete ordinary executable Check，固定 `checkId = "maintenance-reminders"`、`displayName = "Maintenance reminders"` 和 `visibility = "attention"`；它不新增 Run、factory family、Check node family 或 Record model。

每条 entry 用完整 immutable base commit 与当前 `HEAD` 的 committed first-parent history 计算提交数和累计 changed lines。默认 `advisory` 到期或无法测量时返回 `passed`、完整 final assessment data 和 warning；显式 `enforcing` 在相同条件下返回 `failed`、相同 data 和 error。只有无法形成可信完整 assessment payload 的 callback 边界才返回 whole-Check `unavailable`。维护者在实际复核后手动更新 base；Product 不自动推进。

## Scope

### Intended Change

- 在 `src/**` 增加专用 maintenance-reminders Check 的 public entry types、constructor、closed option validation、Git history adapter 与 assessment/message folding，并从 `src/index.ts` 的唯一 package root 导出。
- 让 constructor input 只包含 reminder policy entries：唯一 lower-kebab-case `id`、40/64-hex `baseCommit`、至少一个正安全整数 limit、非空 `message` 和可省略 `mode`；它生成 package-owned Git executable default 与完整 ordinary Check options。
- 为 first-parent committed-history measurement、entry-local `clear | due | unavailable` data、advisory/enforcing result folding、terminal message readback、generic v4 final data 和 one-Check identity 添加 hermetic runtime / Definition / output evidence。
- 更新 current behavior owners、README/API projection、package artifact / isolated consumer evidence、semantic Case catalog 与 Change/Decision material，使公开 surface、测试和说明一致。

### Resulting Impacts

- `maintenance-reminders` 成为一个新的 fixed-ID Product-provided executable Check；Project Definition validation 必须拒绝 malformed constructor-generated/ordinary-composed options，并让所有 reminder policy 与 Git executable 值进入 declarative fingerprint。
- callback 必须区分“单条 entry 无法测量但 assessment payload 完整”和“整个 callback 无法给出可信 payload”；前者不可伪装为 clear，也不可丢失其它 entries 的 final data。
- terminal messages 继续只经 progress 与 `RunResult.checkMessages` 展示；final assessment data 继续经 generic v4 Check outcome 发布，不添加 reminder Record、machine message 字段或 aggregation special case。
- public symbol inventory、declarations、docs、package tarball 和 isolated consumer 的预期导入集合会改变；所有相关 package evidence 必须同步更新。
- 本仓 `quality` Definition、scan adapter、具体 base/limits/message、progress visibility 和 Gate inclusion 不在本 Change 范围内；它们仍是独立 repository consumer policy。

## Success Criteria

1. package consumer 能从根入口调用 `maintenanceReminders([...])`，并获得唯一、完整、固定 identity 的 ordinary Check；多条 entries 不生成 child Check、Record、额外 progress row、machine Check row 或 aggregation target。
2. runtime validation fail-closed 地接受且只接受确定的 entry/options shape；重复 entry ID、非完整/非 hex base、缺少 limits、非法 limit、空 message、非法 mode 或未知 key 都以既有 Definition configuration failure 表达，且 policy/options 改变影响 declarative fingerprint。
3. hermetic Git fixtures 证明完整 first-parent base/head 检查、提交数、累计 numstat、merge、revert、binary/rename、严格超限和不可测量的 assessment；测量不读取 worktree/index delta，也不自动更新 base。
4. 对清洁、到期和不可测量 entries，advisory/enforcing folding 分别返回承诺的 status、full ordered data、warning/error messages；whole-Check `unavailable` 仅覆盖无法形成完整 payload 的边界。
5. progress / `RunResult.checkMessages` 与 v4 generic final data 各自保留既有边界，且 package docs、declaration/public inventory、README projection、isolated consumer、semantic Cases 和 workspace gates 全部通过。

## Affected Owners

- [Configuration](../../docs/configuration.md)、[Quality Metrics](../../docs/quality-metrics.md)、[Output](../../docs/output.md) 与相邻 `src/definition/**`、`src/checks/**`、`src/run/**`：public Check authoring、options、four-state result、message、fingerprint 与 publication boundary。
- [Coding Style](../../docs/coding-style.md)、[Testing](../../docs/testing.md)、[测试证据维护](../../docs/testing/case-maintenance.md) 与相邻 Bun tests / `docs/testing/cases/**`：实现结构、测试和 Case evidence。
- [脚本工具](../../docs/script-tooling.md) 与 `scripts/docs/package-api/**`、`scripts/package/**`：README/JSDoc projection、artifact audit 和 isolated package consumer。
- [`complete-first-release-check-set-with-specialized-maintenance-reminder.md`](../../docs/decisions/complete-first-release-check-set-with-specialized-maintenance-reminder.md)：已建立、尚未对齐的长期方向；本 Plan 只实施其中 maintenance-reminders 范围。
