# Proposal

本 Plan 建立一个可与旧 workspace verifier 并行运行的、由当前本地 npm package candidate 驱动的 repository Project Gate；它完成 Gate 功能与证据交付，但不切换正式入口、不删除旧 verifier，也不公开发布 package。

## Why

Vibe Check 的首个公开 package 需要先由真实项目消费者证明其核心用途：项目拥有的 Definition、bound Run 和 command adapter 能执行完整基础门禁。当前 `scripts/vibe-check-workspace/**` 已有成熟的 required/full 类别、进程编排、日志与退出映射，但它仍是 scripts-only verifier，并不通过 public `vibe-check` Package Run 表达这些门禁。

若在同一个 Change 中同时建设新 Gate、切换 CI/开发者入口并删除旧 verifier，任何类别遗漏、package resolution、`not-applicable`、progress stream 或 exit mapping 错误都会同时失去对照和回退路径。本 Change 因此只建立 candidate-backed consumer，并用同一 revision 的双入口结果证明 readiness；不可逆 cutover 继续由后继 Change 负责。

三个上游能力已经落地：Package Run 接受 project-local string flags，Product progress 已提供 Check 生命周期反馈，candidate preparation 已能 build/pack/audit 并把 exact tarball 安装到 `scripts/quality` 私有 consumer。历史 artifact identity 只说明证据形态；本 Change 必须运行 preparation 并记录与当前 package inputs 匹配的 candidate identity，不能复用不匹配的旧 digest 作为完成证据。

## Outcome

完成后，`bun scripts/project-gate/index.ts --profile required|full [--disable-tag <tag>]...` 会先通过唯一 candidate preparation owner 准备并核对当前 tarball，再动态加载现有 `scripts/quality` private consumer 中的 Gate Definition 与 bound Run。Gate 使用 20 个普通 project process Checks、一个 named `DecisionPolicy`、Product progress、固定 scheduler capacity 和 project-owned per-Check process logs。

`required` 无 disabled tags 时执行 14 个必要类别，`full` 执行 19 个；两者共享同一个 20-Check static graph，profile/tag 排除由 Check-local flags 产生明确的 `not-applicable`。adapter 只在 candidate identity、Run closure、expected eligibility、named gate、progress effect 和全部 eligible Check 结果同时闭合时返回成功。

旧 `verify:vibe-check-workspace:*` 入口仍保持正式且不被修改。本 Change 最终写出 `gate-readiness-handoff.md`，记录与当前 package inputs 匹配的 candidate identity、20-Check 类别映射、controls/N/A、固定 capacity、日志/进度/exit 行为、required/full 对照与 exact-tarball 证据，供 [replace-workspace-verifier-with-project-gate](../../replace-workspace-verifier-with-project-gate/) 消费。

## Scope

| 纳入本 Change | 明确不纳入本 Change |
| --- | --- |
| 在现有 candidate owner 成功返回后再动态加载的 candidate Gate adapter；candidate package resolution 必须与 preparation receipt 指向同一 installed entry。 | npm registry 查询、凭据、`npm publish`、公开版本选择或 registry-install proof。 |
| 独立于 legacy verifier 的 20-Check descriptor catalog、process Check factory、project-owned Gate Definition、bound Run、named policy 和固定 capacity。 | 修改 Product public contract、Product CLI、Task engine、`CheckOutcome` / Record / machine grammar 或增加 public observer/renderer。 |
| `required` / `full` 与 repeatable disabled-tag 的 project-local grammar；Check-local N/A、expected-eligibility closure 和 partial-run output；readiness handoff 明确正式 repository/CI Gate 契约不使用 disabled tags。 | scheduler-level selection、dynamic Task graph、dependency skip propagation、caller-controlled global concurrency，或根据 ambient CI 环境在运行时禁止 disabled tags。 |
| Product progress target 与 project-owned unique-invocation/per-Check process transcripts；structured `RunResult` 到进程状态的 adapter mapping。 | 逐字复制 legacy grouping、success/warning regex、completion report、CLI aliases 或日志格式。 |
| focused adapter/Check tests、Test Evidence Case、matching-candidate/isolated acceptance、same-revision required/full dual-run 与 readiness handoff。 | 正式 command/CI/workflow/documentation cutover、旧 verifier 删除或把 candidate Gate 宣布为唯一门禁。 |

## Success Criteria

1. adapter 在任何 `vibe-check` import 前调用现有 `preparePackageCandidate()`；准备失败时不加载或运行 Gate。准备成功后，动态模块解析的 `vibe-check` entry 与 preparation 返回的 `resolvedEntryPath` 完全相同，不存在 source/path/workspace fallback。
2. 新 Gate catalog 独立拥有 20 个 process Checks，并把当前 verifier 的 14 个 required 与 19 个 full 必要类别一一映射；candidate preparation 是 import bootstrap，不伪装成 candidate-backed Check。
3. 一个 static graph 同时服务 required/full/tag-partial 场景：adapter 只产生规范 project flags，Check 在启动 process 前决定执行或返回 `not-applicable`；adapter 从同一 catalog 复核每个 outcome 与预期 eligibility。
4. Gate Definition 显式选择一个 named `DecisionPolicy`。命令非零结果形成 Check-owned failure Record 和 `completed/failed`；启动、取消或 transcript 写入失败形成 `unavailable`。adapter 不从 stdout/stderr regex 推断事实。
5. Product progress 是唯一共享终端进度输出；详细 command/stdout/stderr 只写入 unique invocation 下的 per-Check logs。Gate 使用固定 `scheduler.maxParallel: 4`，不接受 concurrency 参数。
6. 退出状态区分通过、门禁不通过和 adapter/bootstrap 失败：只有具有可信 final facts 且 policy、eligibility、effects 和 eligible Checks 全部通过时为 `0`；具有 final facts 但未通过 Gate closure 时为 `1`；参数、candidate/import、configuration/planning/execution/cancellation/effect 等无法形成可信完成结果时为 `2`。
7. focused tests 证明参数/flag 规范化、profile/tag eligibility、依赖、process/log/result mapping、candidate resolution guard 和失败闭合；Test Evidence 账本同步且完整检查通过。
8. 与当前 package inputs 匹配的 exact-tarball acceptance，以及同一 revision、无 disabled tags 的 legacy/new required 与 full 四次运行通过。正式 repository/CI Gate contract 固定为不传 disabled tags；实现不检测 ambient CI，也不因进程恰好运行在 CI 环境中拒绝 local partial controls。对照以类别与结构化结果为准，不要求逐字输出相同。
9. `gate-readiness-handoff.md` 保存 candidate version/path/digest/fingerprint、package entry、类别矩阵、N/A policy、capacity、progress/log/exit evidence、未继承项、对照结果和所有重新验证条件；稳定 script/testing owner 与下游 Change 引用同步。
10. 旧 verifier 的实现、root commands、CI/workflow 与正式文档入口保持不变；docs/Change、scripts typecheck/lint/format、candidate/consumer tests、quality、Test Evidence 与 required/full workspace verification 通过。

## Affected Owners

- Candidate build/pack/install 与 current identity：`scripts/package-candidate/**` 及 [Candidate handoff](../establish-npm-package-candidate-and-quality-dogfood/candidate-handoff.md)；本 Change 复用 owner，不复制 preparation。
- 新 Gate catalog、adapter、CLI grammar、日志和 result-to-exit mapping：新增 `scripts/project-gate/**`。
- 需要从 installed `vibe-check` 创建 Definition/Run 的模块：新增 `scripts/quality/project-gate/**`，继续使用 `scripts/quality/node_modules/vibe-check` 这一既有 private consumer boundary；现有 neutral quality Definition/Run 不改变语义。
- 当前脚本边界与正式入口事实：[Script Tooling](../../../docs/script-tooling.md)；实现完成后只写入已经验证的 candidate Gate 事实，仍明确旧 verifier 是正式入口。
- Project Definition、Run controls、policy、progress、Check/Record 与 result 语义：[Configuration](../../../docs/configuration.md)、[Architecture](../../../docs/architecture.md)、[Quality Metrics](../../../docs/quality-metrics.md) 与 [Output](../../../docs/output.md)；本 Change 只消费这些 owner，不修改 Product contract。
- 自动化证据与 Case：Gate 相邻 tests、[Testing](../../../docs/testing.md) 与 `docs/testing/cases/repository-tooling.md`。
- 实施顺序与下游交接：[Vibe Check package 与 Project Gate 交付导航](../../vibe-check-package-and-gate-delivery.md)、[Active Change Portfolio](../../active-change-portfolio.md) 与 [replace-workspace-verifier-with-project-gate](../../replace-workspace-verifier-with-project-gate/)。
