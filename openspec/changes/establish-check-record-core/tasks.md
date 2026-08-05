> **核心句：**本任务清单先审计 Check/Record 双对象契约，再按 catalog → managers → built-in checks → policy → output/CLI 的依赖顺序完成一次 hard cut。

## 执行规则

- 第 1 节全部任务是所有实现任务的阻塞门禁；1.x 全部完成前不得执行第 2 节或任何后续实现任务。
- 后续章节按依赖顺序推进；checkbox 只有在代码、目标测试、语义 Case 与对应 contract/docs 同步后才能勾选。
- 实施中发现会改变 definition/run/result/record 合法状态、Task 边界或 TS authoring 的新选择时，先更新 change artifacts 并重新执行 1.1，不在源码中临时决定。

## 1. 实现前阻塞审计

- [ ] 1.1 完成语义与范围审计；审计未通过前不得执行任何实现任务：proposal、design、全部 delta specs 和 tasks 必须共享“Check 与 Record 是两个独立 managed objects”的核心句；public CheckDefinition 与 private binding/contribution 不得混合；selection/applicability、ExecutionReport、incremental acknowledgement、run/result/record 合法状态、provenance、coverage、duplicate integrity、policy operands、machine evidence 与 failure mapping 必须唯一；task orchestration、TS module loading 和未来 feature fields/algorithms 必须留在后续 change；Capabilities IDs/目录必须匹配；本 change 不得越界修改长期 spec/docs/其它 changes；`## Open Questions` 必须无未回答问题。
- [ ] 1.2 按 decision-records 流程演进并核对与本 change 冲突的 active decisions，至少覆盖 compile-time capability registry→pre-execution resolved Check catalog、semantic check/record type identity、standard record stream 与 TS project definition 方向；完成写入后运行 `bun run decisions:check` 并把结果带回 1.1 审计。
- [ ] 1.3 使用当前 OpenSpec 官方 `buildUpdatedSpec` 或等价 archive builder 在临时主 spec copy 逐项重放全部 delta；要求 0 apply warnings/errors、所有 MODIFIED 保留 current scenarios、scan-completeness 归档后仍有明确 requirements，并对重建后的完整 main spec set 运行 strict validation。单独 `openspec validate <change>` 通过不能替代本门禁。

## 2. Check catalog 与公共模型

- [ ] 2.1 在修改测试前运行 `bun run test-evidence:check` 并恢复相关 Topics/Cases；为 definition/binding one-to-one、catalog freeze/fingerprint、applicability、CheckRun 状态和 CheckResult 合法组合建立最窄失败证据。
- [ ] 2.2 实现 serializable `CheckDefinition` catalog 与独立 private `CheckExecutionBinding` registry；验证一对一 ID 关系并证明 fingerprint/output 不含 function、binding、contribution 或 Task payload。
- [ ] 2.3 实现 selection 与 pre-execution applicability freeze：skipped 和 not-applicable 不产生 contribution，applicable zero-work 仍进入 binding；覆盖所有 run/result sum。
- [ ] 2.4 实现 invocation-unique checkRunId、invocation-private domain-work handles、stable context ports 与 manager-owned progress/sink binding；确保 handles 与 Task identity 不进入 public machine fields。

## 3. RecordManager 与逐条提交

- [ ] 3.1 为 QualityRecord envelope、record type catalog、typed fields、subject/location、relations、security exclusions、stable ID 与 canonical ordering 建立 model/schema 失败矩阵。
- [ ] 3.2 实现绑定 checkId/checkRunId 的 record sink、catalog validation、identity computation 与 immediate commit；same-ID/body-equivalent replay 幂等且不重复计数。
- [ ] 3.3 实现 same-ID/different-body arrival-neutral integrity conflict 并阻止可信 final publication；证明交换 arrival order 产生相同 verdict/diagnostic 且不存在 first-arrival winner。
- [ ] 3.4 证明 runner 后续 throw、dependency failure 或普通 invalid candidate 不撤销此前 unrelated valid records，且 Core 不从 level/count 合成 CheckResult 或 synthetic record。

## 4. Direct execution 与 Check finalization

- [ ] 4.1 实现 `CheckExecutionBinding -> CheckExecutionContribution` opaque seam 与消费完整 frozen contribution batch 的 foundation coordinator；Core 不读取 payload，不引入 TaskPlan、DAG 或并发语义。
- [ ] 4.2 实现 current direct CheckRunner adapter，将 normal return、throw/rejection 和 dependency unavailable 穷尽映射为 `returned | execution-failed | unavailable` terminal ExecutionReport。
- [ ] 4.3 实现 incremental acknowledgement port：owned first ack、duplicate idempotency、unknown/foreign/late violation，以及 throw 后 progress recovery；report 不得自报 coverage/counts。
- [ ] 4.4 验证 ExecutionReport set 与 applicable contributions 在 checkRunId 上 exactly equal；missing/duplicate/unknown/unterminated batch 映射 Product integrity failure。
- [ ] 4.5 按 spec 固定 precedence 从 progress、sink state、terminal report 和 result validation 唯一 finalize run/diagnostic；覆盖 invalid-record+throw 等多失败组合。

## 5. 迁移当前 built-in checks 与 dependencies

- [ ] 5.1 注册 `file-metrics`、`function-metrics` 与 `duplicate-detection` definitions，把五个 current semantic identities 迁移为所属 recordType IDs，并将 current semantic config 单向投影为 runner settings。
- [ ] 5.2 迁移 file/function/duplicate 领域判断，使 runner 直接返回 CheckResult 并提交 final records；删除 Core warning generation、specialized result unions 与 fixed channel membership。
- [ ] 5.3 迁移 structural/jscpd 及其它 scanner adapters 为 direct-binding private dependencies；证明 pre-execution not-applicable 不创建 contribution、failure 保留 records、current/named references 复用 dependency snapshot 且 cache 只使用 relevant domain inputs。
- [ ] 5.4 删除 old capability result、overall completeness 和 parallel legacy model paths，并用 targeted import/dependency checks 证明只有新 Core owners 可达。

## 6. DecisionPolicy 与 references

- [ ] 6.1 为 normalized policy catalog validator 建立失败证据，覆盖 IDs、registered operands、typed comparisons、boolean/reducers、empty semantics、acceptance/view dependencies、unknown references 与 executable input rejection。
- [ ] 6.2 实现 acceptance annotations→named views→selected `blockWhen` 的 single evaluator；输入 snapshot 保持 immutable，GateResult 唯一拥有 policy identity/fingerprint 和 canonical evidence。
- [ ] 6.3 实现 explicit named-reference planning 与 immutable identity handoff；checks 产生 final relations，Core 不推断 reference 或 domain comparison。
- [ ] 6.4 实现 current semantic config 到唯一 built-in `regressions` policy 的 adapter，证明 required checks/baseline、acceptance、record 和 run evidence 通过通用 evaluator 生效，且不存在 legacy `all`/`changed` alias 或 policy-name branch。

## 7. Machine v2 与 output consumers

- [ ] 7.1 为 `MachineRunV2`/`MachineQualityRecordV2` schemas、public catalog/private exclusion、checkRunId uniqueness、run-result sum、coverage/counts、record exact owning-run reference、record order、annotations/views 和 gate evidence 建立 schema/set failure matrix。
- [ ] 7.2 实现一个 run mapper 与一个 generic record mapper、deterministic JSON/NDJSON serializers 和 complete-set validator；run 不得复制 records 或 resolved policy body。
- [ ] 7.3 实现 validated candidate→same-directory temp rename publication chain，并删除 `metrics.json`、warning streams、MachineMetricsV1/MachineWarningV1 和 dual readers/writers。
- [ ] 7.4 更新 report、console 和 annotation consumer，使所有 surface 同时呈现 records 与 owning runs/results；annotation 只消费 common level/location 并在完整 stream validation 后渲染。
- [ ] 7.5 生成并独立验证 `completed-empty`、`completed-records`、`gate-passed`、`gate-failed` 和 `partial-check` canonical examples，证明重复生成 byte-stable。

## 8. CLI、文档与验收

- [ ] 8.1 将 `--gate` 改为 resolved policy ID selection，保留省略 gate 观察行为和 `--baseline`→`baseline` reference；普通 help 只说明 dynamic catalog 来源，unknown-ID 在 definition load 后列本次 resolved IDs；更新 exit0/1/2/3 mapping。
- [ ] 8.2 同步 Check、Record、DecisionPolicy、metrics、scope、scanner dependency、output、CLI 与 testing 长期 owner 文档、navigation、public exports 和 migration note。
- [ ] 8.3 更新语义 Case catalog 并运行 targeted catalog/run/result/record/partial/policy/reference/machine/CLI/annotation tests 与 `bun run test-evidence:check`。
- [ ] 8.4 运行 product/scripts typecheck、lint、dependency/import、schema/example drift、`openspec validate establish-check-record-core --type change --strict` 与 `bun run validate`。
- [ ] 8.5 运行 `bun run verify:vibe-check-workspace:full` 和 full dogfood，证明同一 final snapshot 驱动全部 surface，`quality:gate` 只通过 normalized `regressions` entry 阻断。
- [ ] 8.6 在各后续 change 实施前复核依赖：task orchestration 只能扩展 batch coordinator；TS project definition 只能贡献 pre-freeze definitions/policies；其它 feature changes 只补各自 CheckResult/record catalog/领域算法，不修改 Core managers。
