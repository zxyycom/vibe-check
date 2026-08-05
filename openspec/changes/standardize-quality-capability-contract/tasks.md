> **核心句：**本任务清单按registry/records → runs → policy → output → CLI的依赖顺序实施统一quality capability contract，并以实现前审计阻止歧义进入代码。

## 执行规则

- 章节2至6是依赖顺序，不是可任意并行的工作流；后续章节只有在前序public model和失败证据稳定后才能开始。
- Checkbox只有在代码、对应测试证据和该项要求的contract/docs同步完成后才能勾选；命令成功本身不等于任务完成。
- Tasks只安排spec已定义的行为。实施中发现新的产品选择时，先更新proposal/design/spec并重新执行task 1.1，不在代码或测试中临时决定。

## 1. 实现前阻塞审计

> 任务1.1完成前，不得执行2.1或任何后续实现任务。

- [ ] 1.1 完成实现前语义审计；以下检查必须同时成立，任一失败都保持本change不可实现：
  - proposal、design、全部delta specs与tasks共享同一主承诺：capability emit final records/execution summary，Core finalize runs并执行selected `DecisionPolicy`。
  - `quality-records`拥有registry、record和commit contract；`scan-completeness`拥有public run；`quality-decision-policy`拥有acceptance、views、`blockWhen`和gate result；`output-contract`只投影final model。
  - Apply后的主spec不再保留Observation/Finding双模型、atomic partial discard、overall completeness、fixed channels或machine v1。
  - Machine output只发布status-specific policy identity、decision与evidence，不嵌入policy body，也不要求consumer执行policy。
  - 一个config change、七个feature changes与deferred Lizard change的follow-up边界和实现顺序已复核。
  - `## Open Questions`没有未回答问题，tasks没有引入spec之外的产品行为。
- [x] 1.2 按decision-records流程核对record/run、explicit reference、declarative policy、semantic check identity与machine decision-evidence长期方向，并运行`bun run decisions:check`。

## 2. Registry 与 standard records

- [ ] 2.1 先运行`bun run test-evidence:check`并恢复相关Topics/Cases；为compile-time registry、semantic IDs、catalog fingerprint、DAG与duplicate/unknown descriptor建立失败证据。
- [ ] 2.2 实现typed descriptor/public catalog和single shallow registry；注册现有file、function与duplicate capabilities，不建立平行ID arrays或runtime loader。
- [ ] 2.3 为`QualityRecord`closed envelope、final level、subject/location、typed fields、causal paths、comparison relations、stable hash identity与canonical ordering建立model/schema失败矩阵。
- [ ] 2.4 实现record sink逐条validation/commit；invalid record只拒绝本条并使run diagnostic可见，后续failure不撤销此前committed records。
- [ ] 2.5 为safe constructors、catalog exposure与secret/URL/path/backend-output禁入边界建立capability-owned security tests。

## 3. Exact work、run 与 cache

- [ ] 3.1 从one normalized inventory和`CapabilityPolicyProjection`构造exact work，证明current/reference/fallback共享selector且runner不能重新遍历root或扩大scope。
- [ ] 3.2 实现registry dependency DAG、typed internal services与受限reader，证明public records不承担private/sensitive execution handoff。
- [ ] 3.3 让runner返回execution summary/work acknowledgements，由Core按plan、sink count与summary finalize`skipped|no-input|completed|failed`run、coverage与`committedRecordCount`。
- [ ] 3.4 迁移现有三个capabilities为final record producers，证明先成功emit、后续work failure时records保留且coverage诚实。
- [ ] 3.5 按work unit、`CapabilityPolicyProjection`、reference和relevant backend构造cache identity；unfinished/invalid/failed work不得缓存为success。

## 4. Decision policy 与 references

- [ ] 4.1 为named `DecisionPolicy` catalog和normalized policy validator建立失败测试，覆盖stable IDs、exactly-one `blockWhen`、registered record/run predicates、operator typing、empty reducer semantics、unknown references/views/policies、cycle和script/dynamic input。
- [ ] 4.2 实现acceptance annotations → named views → selected `blockWhen`的single evaluator；records/runs保持immutable，unmatched acceptance只服从resolved `ignore|diagnostic|error` mode。
- [ ] 4.3 实现explicit named reference planning与immutable identity；capability emit final relations，Core不推断reference、不计算domain comparison或硬编码changed/regression。
- [ ] 4.4 按design中已确认的built-in policy catalog，将current semantic config与这些entries单向适配到normalized `DecisionPolicy`；证明catalog entry变化不需要修改evaluator，并保留`add-file-policy-overrides`作为public v2 owner。
- [ ] 4.5 产生作为policy identity/evidence唯一owner的gate result：disabled使用null identity与empty policy-derived arrays，evaluated使用policy ID/fingerprint、passed/failed status和canonical record/run evidence；capability failure只作为operand。

## 5. Machine v2 与 consumers

- [ ] 5.1 为run/record v2 schemas、catalog fingerprint、record order、`committedRecordCount`总和、annotations/views、gate status-specific identity和evidence references建立byte/schema/set-invariant失败矩阵。
- [ ] 5.2 实现schema-derived DTOs、one run mapper与one generic record mapper；`run.json`不得复制records或resolved policy body，也不得在gate result之外重复policy identity/evidence fields。
- [ ] 5.3 实现record-stream/artifact-set validators与validated publication chain；producer在projection前验证decision，machine validator不实现第二个evaluator。
- [ ] 5.4 删除metrics/warning v1 files、DTOs、schemas、fixed channel structures与dual readers/writers。
- [ ] 5.5 生成`completed-empty`、`completed-records`、`gate-passed`、`gate-failed`和`partial-capability`canonical examples并运行independent drift validation。
- [ ] 5.6 更新report、console和annotation consumer；所有surface同时呈现records与producing runs，annotation只消费common level/location。

## 6. CLI、文档与验收

- [ ] 6.1 将`--gate`改为resolved `DecisionPolicy` ID，按descriptor规划required capabilities/references，并更新help、usage errors与exit0/1/2/3 mapping。
- [ ] 6.2 同步Quality Metrics（包括现行spec Purpose）、Decision Policy、Scan Scope、Completeness、Output、CLI与Scanner Dependency owners、navigation、migration note及public shallow exports。
- [ ] 6.3 更新semantic Case catalog后运行targeted registry/record/run/policy/reference/machine/CLI/annotation tests与`bun run test-evidence:check`。
- [ ] 6.4 运行product/scripts typecheck、lint、dependency/import checks、schema/example drift、`openspec validate standardize-quality-capability-contract --strict`与`bun run validate`。
- [ ] 6.5 运行`bun run verify:vibe-check-workspace:full`及full dogfood，证明新增capability只扩展descriptor/producer/catalog且Core无feature-specific branch。
- [ ] 6.6 复核一个config change与七个feature changes仍保持实现门禁并记录所需record/run/policy迁移；deferred Lizard change恢复前要求新contract baseline。
