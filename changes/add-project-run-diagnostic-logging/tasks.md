# Tasks

任务先固定可读日志样例和logging-on/off行为基线，再建立output方向、实现Product core观测、接入仓库消费者并完成分层验证。

## Readiness

- [x] 0.1 已恢复Project Run、progress、scheduler、preflight/Check handoff、output/result、quality/Gate和相关active Decisions，定位到Product core缺少连续运行证据。
- [x] 0.2 已确认外部package默认关闭、本仓库quality/Gate默认开启；只记录Product core运行时信息，不给Check authoring或package-provided Checks增加logger，Check-specific信息继续由final data/Record/message承接。
- [x] 0.3 已运行49项现有owner tests固定logging-off基线，并在design Audit Baseline明确logging-on/off语义等价口径及complete/partial目标样例；实际logging-on证据留给implementation与verification。

## Implementation

- [x] 1.1 已建立`add-ephemeral-project-run-diagnostic-logging.md` active、unaligned Decision，并以“修订”关系归档`replace-global-tool-effects-with-run-outputs.md`。
- [ ] 1.2 增加`diagnosticLogging` Definition/Controls/default/validation/effective configuration/status/file/result contract，并建立invocation-specific append writer、renderer、Product-private logger和failure isolation。
- [ ] 1.3 按design required event set在invocation/planning、preflight handoff、scheduler、dependency/Record、callback/settlement、cancellation、aggregation和output事实形成位置接入core日志，证明logging-on/off最终运行事实等价。
- [ ] 1.4 让repository quality与Project Gate默认启用，将Gate Product log绑定到invocation directory，并补齐并列process transcript、file/directory发现信息与logging failure映射。
- [ ] 1.5 同步Configuration、Architecture、Output、Script Tooling、README、public JSDoc、package examples/declarations、tests与Semantic Case evidence；保持Check guides和Check authoring contract不变。
- [ ] 1.6 在实现、稳定owner和package material全部对齐后，用Decision Records lifecycle命令将successor Decision标记为aligned。

## Verification

- [ ] 2.1 运行最窄Product output/lifecycle/scheduler/preflight/dependency/Record与Project quality/Gate tests，并运行`bun run test-evidence -- check --root .`。
- [ ] 2.2 验收representative complete/partial logs：外部默认零I/O，内部默认创建；entry不交错，最后事件可定位interruption，required event set完整，create/render/append/close failure不改写Check facts。
- [ ] 2.3 运行product/scripts typecheck、lint、format、docs/package projection、installed consumer、Decision与Change checks，确认Check authoring、package-provided Checks、machine v4和其它outputs未被无关扩张。
- [ ] 2.4 重建exact package candidate，运行`bun run verify:vibe-check-workspace:required`与`bun run verify:vibe-check-workspace:full`，复核logging-on/off等价、Decision alignment和全部Success Criteria。
