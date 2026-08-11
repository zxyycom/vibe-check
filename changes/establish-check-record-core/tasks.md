# Tasks

按 Core 模型与 managers、现有 built-in 迁移、policy/output 消费和最终验收的顺序实施；只有实际产物与证据完成后才勾选 Implementation 或 Verification。

## Readiness

- [x] 0.1 已核对 proposal、design 与 tasks 指向“独立 Check/Record managers 和一个 final snapshot”这一目标，范围不包含 Project Definition、TaskPlan 或 feature algorithms。
- [x] 0.2 已读取当前 `docs/` owners、`src/product/**` 实现、直接相关活动决策及历史形成材料，并区分当前 capability/machine-v1 事实与本 Change 实施的未来方向。
- [x] 0.3 已确认 affected owners、built-in 身份迁移、public/private seam、hard-cut 出口和失败优先级；`Open Questions` 无阻塞实施的未决项。

## Implementation

- [ ] 1.1 在修改测试前按 `test-evidence-review` 恢复相关 Cases，并为 catalog/binding 一对一、closed `passed | failed | not-applicable` verdict、run/result 合法组合、record identity、policy 与 publication 建立最窄失败证据。
- [ ] 1.2 在 `src/product/**` 实现 serializable Check/record-type catalog、canonical validation/fingerprint 与独立 private binding registry；在 work 前冻结完整 definitions、bindings、selection 与 applicability。
- [ ] 1.3 实现 CheckManager 的 invocation-unique run、pre-work applicability-owned `not-applicable`、opaque domain-work handles、bound acknowledgement port、contribution correlation、terminal report set validation 和单点 finalization；确保 `skipped` / `failed` run 的 `result = null`，`completed` run 恰有一个 result。
- [ ] 1.4 实现 RecordManager 的 bound sink、catalog validation、location-independent identity、immediate commit、equivalent replay idempotency、arrival-neutral conflict 与 canonical snapshot ordering。
- [ ] 1.5 实现 direct-runner private adapter 和完整 frozen contribution batch coordinator，覆盖 normal `passed | failed` return、execution 非法返回 `not-applicable` candidate、unavailable、throw/rejection、其它 invalid result、ack violation、missing/duplicate/unknown report 及 records-after-failure 组合。
- [ ] 1.6 将 file/function/duplicate 领域行为迁移到 `file-metrics`、`function-metrics`、`duplicate-detection` built-in Checks 及五个既定 record types；scanner inputs、process/native reports 与 backend identity 保持 private。
- [ ] 1.7 实现 closed named `DecisionPolicy` catalog、acceptance/views/`blockWhen` evaluator 和显式 frozen named-reference handoff；只消费最终 Check/Record snapshot，不引入 executable policy。
- [ ] 1.8 将 current config 输入单向适配到新 built-in catalog/policy，保持 repository ungated observation 与 `quality:gate` 的 `regressions` intent；不在 Core 中建立长期 JSON 或 Project Definition 双模型。
- [ ] 1.9 一次性迁移 runtime schemas、DTO、mappers、serializers、validators、publication、report、console、annotation、CLI gate/exit 和 dogfood 到 `run.json` / `records.ndjson` / `report.md` final snapshot。
- [ ] 1.10 删除旧 capability/completeness、warning/channel、machine-v1 与 dual consumer 路径，更新 public shallow exports、owner docs、schemas/examples、fixtures 和语义 Case catalog。

## Verification

- [ ] 2.1 运行 catalog/run/result/record/partial-failure/policy/reference/machine-set/CLI/annotation 的目标测试，证明 closed verdict union、`not-applicable` 只能由 pre-work applicability 产生、run/result 合法状态矩阵、quality-failed lifecycle readiness、identity conflict、deterministic bytes 与同源 consumer projection。
- [ ] 2.2 运行 `bun run test-evidence:check`，确认新增、删除或重命名的测试实体与语义 Cases 双向闭合。
- [ ] 2.3 运行 product import boundary、`bun run typecheck:product`、`bun run lint:product` 与 `bun run test:product`，确认 runtime 只由 `src/product/**` 和声明依赖闭合。
- [ ] 2.4 运行 `bun run decisions:check`、`bun run validate` 与针对本 Change 的 `bun run change-plan -- check changes/establish-check-record-core`，确认决策、文档、schemas/examples 和计划结构一致。
- [ ] 2.5 运行 `bun run verify:vibe-check-workspace:full` 与 full dogfood；检查同一 final snapshot 驱动全部 surface，旧 IDs/artifact paths/readers 不可达且 diff 只覆盖本 Change owners。
