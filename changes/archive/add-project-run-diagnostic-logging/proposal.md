# Proposal

本 Plan 为 Project Run core 增加一次性详细诊断日志，使维护者无需断点调试即可从一次 invocation 的连续记录恢复 Product 运行时编排细节。

## Why

现有材料分别回答最终结果或局部过程，不能还原完整的 Product core 运行路径：

| 当前材料 | 能回答 | 不能回答 |
| --- | --- | --- |
| progress rendering | Check started/settled 与 final summary | planning、preflight、等待原因、取消和 output closure 细节 |
| `RunResult` / machine v4 | 最终 Check/Record、duration、message 与 output facts | 中断前最后阶段和并发过程的实际观察顺序 |
| Project Gate process transcript | 一个已启动 command Check 的 stdout/stderr 与 exit | Product scheduler、admission、dependency/Record handoff 和其它 core 生命周期 |

真实消费者是开发和维护 Vibe Check core 的人员。外部 package 默认不得产生额外日志；本仓库的 bound quality Run 和 Project Gate 则默认保留运行中持续追加、按发生顺序组织的本地日志。日志只服务当前人工排障，不建立机器解析、跨版本格式兼容或长期证据承诺。

Check-specific 领域细节不属于这个缺口。Check 需要发布额外业务信息时继续使用 passed/failed final data、supplemental Record 或 terminal message；本 Change 不给 package-provided 或 custom Check 增加 logger。

## Outcome

每次有效且启用 `diagnosticLogging` 的 Project Run 都创建一个 invocation-specific 人读日志。日志从已验证 Definition/Controls 与 aggregation selection 的 invocation 初始化开始，连续记录 Product core 已知的 planning、preflight、scheduler、Check admission/lifecycle、dependency read、Record report、cancellation、aggregation 和 output 细节；完整或中断文件都能指出最后成功记录的阶段、等待原因和关键上下文。日志自身 close 后的最终 status 只能由 `RunResult` 回读，文件不自称已经观察到自己的关闭结果。

外部 Project Definition 默认关闭该 output；本仓库 quality 与 Project Gate 默认开启。无效 Definition/Controls/aggregation selection 继续只返回 configuration diagnostic，因为 Product 尚未取得可信 logging configuration，不创建日志。所有 Check authoring contract 与实现保持不变。

## Scope

### Intended Change

- 增加第三个明确 Run output `diagnosticLogging`，覆盖 Definition/Controls 配置、validation、effective configuration、status/file readback、result failure 与 output priority；machine v4 保持不变。
- 在 `src/project-run/diagnostic-logging/**` 建立 Product-private invocation logger，以唯一 sequence、monotonic elapsed、scope、event、summary 和 details 持续追加一次性人读文本。
- 只在 Product core 的真实事实形成位置记录事件：invocation/graph、preflight handoff、scheduler waiting/admission、dependency read、Record report、callback handoff、settlement、cancellation、aggregation 和 outputs；不解析 progress/stdout，也不根据 final snapshot 重建过程。
- 保持 `CheckExecutionContext`、`CheckPreflight`、package-provided Check 执行与 Check guides 的 authoring contract 不变。Product 可以记录它亲自观察到的 options、callback result、dependency readback 和 Record report；Check-specific 新信息继续由 final data/Record/message 承接。Package JSDoc 中的 Project Definition 示例只同步新 output 字段，不向 Check 增加 logger。
- 让 repository quality 与 Project Gate 默认启用。Gate 把 Product log 与现有 process transcripts 放入同一个 invocation directory；两者并列且各自保留 owner。
- 建立 `add-ephemeral-project-run-diagnostic-logging.md`，以“修订”关系演进 `replace-global-tool-effects-with-run-outputs.md`：保留明确 Run outputs 与 Check-owned cache，增加已有真实消费者的一次性 diagnostic logging output。

### Resulting Impacts

- Product output/configuration surface 发生预正式 hard cut；public declarations、README、Configuration、Architecture、Output、package examples 与 installed consumer evidence必须同步。
- Project Run、task scheduler、preflight/settlement handoff、dependency/Record reporter 和 completion/output owners增加只观察事实的 logging seam 与相邻测试；原执行、结算和取消 owner不变。
- `RunResult.outputs` 增加 logging status/file；logging failure不改写 Check/Record facts，也不阻断 progress 或 machine publication closure。
- 本仓库 quality/Gate 在 ignored `.log/**` 下增加 invocation-local 文件；不新增 release artifact、rotation、retention、cleanup、`latest` 或跨 invocation index。
- Check authoring、package-provided Checks、Check final-data/Record contract 和 machine v4 不因本 Change 扩张。

## Success Criteria

1. 未显式配置的外部 Project Definition 不创建 diagnostic log；repository quality 与 required/full Project Gate 默认创建可发现的 invocation-specific Product log。
2. 一个代表性 Run 覆盖并行、dependency、mutex、root budget、preflight success/continue/block、four-state settlement、cancellation 和 output closure；仅凭日志即可恢复每个 core 状态转换、等待原因、实际观察顺序与 pre-logging result branch，日志自身 status由`RunResult`补足。
3. Product log 包含 normalized catalog/policy、prepared/fallback options、dependency readback、Record report、callback result、outcome/messages/duration 和 output status；无需 Check 主动埋点，也不修改任一 package-provided Check。
4. 日志在运行中追加且 entry 不交错；abrupt interruption 留下截至最后一次成功 append 的可读 partial log。create/render/append/close failure 形成 logging output failure，不传播到 Check callback、不改写 Check/Record facts。
5. 禁用、成功和失败状态都返回明确 logging status；启用时返回预先计算的 project-root-relative file，即使文件创建失败也能指出尝试目标。多 output 同时失败时保留所有 statuses，并按既定优先级选择唯一 Run diagnostic。
6. 日志没有 schema version、parser、machine publication、格式兼容或迁移承诺，但每个 entry 仍局部自足并通过代表性人工可读性验收。
7. 目标测试、Semantic Case/Test Evidence、package material、Decision/Change/docs checks 与 required/full workspace verification 全部通过。

## Affected Owners

- `src/project-definition/**`、`src/project-run/controls/**`、`src/project-run/output-*.ts`、`src/project-run/result.ts`：logging 配置、validation、status/file 与结果契约。
- `src/project-run/diagnostic-logging/**`、`src/project-run/invocation.ts`、`src/project-run/completion.ts`、`src/project-run/task-scheduler/**`、`src/project-run/check-execution/**`：logger、内容和 Product core 事件。
- `src/check-settlement/**` 的现有调用 seam：观察 Product 已拥有的 dependency/Record/settlement 操作，不修改 Check/Record 事实契约。
- `scripts/project/quality/**`、`scripts/project/gate/**`：仓库内部默认启用、invocation directory 绑定、并列 transcript 与运行验收。
- `docs/configuration.md`、`docs/architecture.md`、`docs/output.md`、`docs/script-tooling.md`、README、package examples/declarations：当前行为与 consumer 使用说明。
- `docs/decisions/add-ephemeral-project-run-diagnostic-logging.md`、decision index 与 archived `replace-global-tool-effects-with-run-outputs.md`：长期 output 判断和演进关系。
- 相关 Product runtime、Project tooling tests、Semantic Cases、`changes/active-change-portfolio.md` 与本 Change artifacts。
