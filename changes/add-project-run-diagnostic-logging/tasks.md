# Tasks

任务先固定可读日志样例和logging-on/off行为基线，再建立output方向、实现Product core观测、接入仓库消费者并完成分层验证。

## Readiness

- [x] 0.1 已恢复Project Run、progress、scheduler、preflight/Check handoff、output/result、quality/Gate和相关active Decisions，定位到Product core缺少连续运行证据。
- [x] 0.2 已确认外部package默认关闭、本仓库quality/Gate默认开启；只记录Product core运行时信息，不给Check authoring或package-provided Checks增加logger，Check-specific信息继续由final data/Record/message承接。
- [x] 0.3 已运行49项现有owner tests固定logging-off基线，并在design Audit Baseline明确logging-on/off语义等价口径及complete/partial目标样例；实际logging-on证据由2.2的完整与中断日志审计闭合。

## Implementation

- [x] 1.1 已建立`add-ephemeral-project-run-diagnostic-logging.md` active Decision，初始以unaligned约束实施，并以“修订”关系归档`replace-global-tool-effects-with-run-outputs.md`。
- [x] 1.2 已增加`diagnosticLogging` Definition/Controls/default/validation/effective configuration/status/file/result contract，并建立invocation-specific append writer、renderer、Product-private logger和failure isolation。
- [x] 1.3 已按design required event set在invocation/planning、preflight handoff、scheduler、dependency/Record、callback/settlement、cancellation、aggregation和output事实形成位置接入core日志，并由目标tests证明logging-on/off最终运行事实等价。
- [x] 1.4 已让repository quality与Project Gate默认启用，将Gate Product log绑定到invocation directory，并补齐并列process transcript、file/directory发现信息与logging failure映射。
- [x] 1.5 已同步Configuration、Architecture、Output、Script Tooling、README、public JSDoc、package examples/declarations、tests与Semantic Case evidence；Check guides和Check authoring contract保持不变。
- [x] 1.6 实现、稳定owner和package material全部对齐后，已用Decision Records lifecycle命令将successor Decision标记为aligned。

## Verification

- [x] 2.1 已运行56项最窄Product output/lifecycle/scheduler/preflight/dependency/Record与Project quality/Gate tests；Test Evidence门禁确认263个当前test entities全部由81个Semantic Cases映射。
- [x] 2.2 已验收representative complete/partial logs：外部默认零I/O，内部默认创建；entry不交错，中断时末事件可定位，required event set完整，create/render/append/close failure不改写Check facts。
- [x] 2.3 已通过product/scripts typecheck、lint、format、docs/package projection、installed consumer、Decision与Change checks；Check authoring、package-provided Check执行契约、machine v4和其它outputs未被无关扩张。
- [x] 2.4 已重建exact package candidate `0.0.0-local.ed8f94950f51`；required Gate 27 passed/6 not-applicable，full Gate 33/33 passed，logging-on/off等价、Decision alignment和全部Success Criteria已复核。
