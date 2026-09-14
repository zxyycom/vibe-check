# Tasks

按长期判断、单一策略事实、renderer 行为、公开材料和完整证据的顺序推进；只有所有 owner 与验证闭合后才完成 Change。

## Readiness

- [x] 0.1 已建立 active/unaligned Decision `260914-configure-progress-previews-and-quiet-pass-presentation`，以自包含修订保留 preview/formatter/安全/failure 契约，并固定 `omitQuietPassedRow?: true`、直接移除旧 grammar、accepted-fact predicate、无编号 rows 与 configured/actual 双计数；前序已按 Decision Records 事务归档，`bun run decisions -- check` 通过。Owner: Decision owner。
- [x] 0.2 Test Evidence 起点检查通过（605 个 current Bun entities 全部映射到 140 个 Cases）。语义审计确认本 Change 不新增 Case：Definition 两个 visibility entities 在 `WB-PROJECT-DEFINITION-001` 内连续 rename；共享 fingerprint entity 继续同时证明该 Case 与 `WB-PROGRESS-PREVIEW-DEFINITION-001`；renderer lifecycle 和 accepted-detail entity 分别在 `WB-OUTPUT-RUN-PROGRESS-001`、`WB-PROGRESS-OUTPUT-001` 内连续更新；package Check 与 installed-consumer entity 保留既有 Case。Owner: Test Evidence owner。
- [x] 0.3 当前 HEAD 与 Plan base 相同，Change distance 为零；协调队列仍要求本 Change 在后续 Definition grammar 扩张前完成。序位 1 的 file-metrics SCC Change 不修改本 Plan 的 Definition/progress owners；序位 3 及其后续共享 owner 的 Change 应在本 Change 合入后同步基线。Owner: Change maintainer。

## Implementation

- [x] 1.1 Check authoring、closed parser、tree materialization/resolution、normalized declaration 和 declarative snapshot 已用 `omitQuietPassedRow?: true` / normalized boolean 原子替换 `visibility`；executable/container TypeScript union 与 runtime validation 一致拒绝 container、`false`、旧字段和其它值，并覆盖 omission/own `undefined`/`true`、non-inheritance、freezing 与 fingerprint。Owner: Project Definition owner。
- [x] 1.2 normalized policy 已沿 execution identity、started/settled lifecycle feedback 交给 progress renderer，prepared feedback 也提供全部 normalized executable Checks 的 configured count；Check facts、selection、dependency、aggregation、duration readback、disabled output 和 machine/public result shape 保持不变。Owner: Project Run / Check execution owner。
- [x] 1.3 renderer 已实现 indexed/unnumbered running 与 settled formatting、accepted-fact quiet-pass omission、全局 completion accounting 和 actual omitted count，并保留 flag grouping、plain/dumb、TTY refresh、preview/formatter、escaping/color、tee 与 writer-failure 边界；非零配置 exact text 和零配置 bytes 均有测试。Owner: Human output owner。
- [x] 1.4 `maintenanceReminders`、public JSDoc、package API/mixed-outcomes examples、API projection source 和 external-consumer type/runtime fixtures 已原子迁移；受管 API 投影已从 owner source 重建。Owner: Package material owners。
- [x] 1.5 public Run output / Check authoring 指南、内部 Project Definition / Human output owner，以及直接受影响的 API mechanics / machine output 边界说明均已同步；当前版本 changelog 未改写。Owner: public/internal documentation owners。
- [x] 1.6 测试和 Case 已按 0.2 连续迁移而未新增 Case：Definition test/entities 已重命名，fingerprint、renderer lifecycle、accepted-detail、package 与 installed-consumer evidence 保持原 Case 身份；607 个 current Bun entities 全部映射到既有 140 个 Cases，并覆盖计划中的 TTY/plain/dumb、outcome、detail、计数、failure 与完整 facts 矩阵。Owner: test owners。

## Verification

- [x] 2.1 最窄 Project Definition、progress renderer/invocation、package Check 与 external-consumer tests 已通过，并直接核对 exact bytes、fingerprint、closed validation、full-fact preservation 和 failure containment；`bun run test-evidence -- check --root .` 通过。Owner: implementation verifier。
- [x] 2.2 `bun run docs:api:write` 重建受管投影后，`bun run docs:api`、`bun run validate -- docs`、`bun run typecheck` 与 `bun run lint` 均通过。Owner: documentation/package verifier。
- [x] 2.3 Success Criteria 已逐项核对；successor Decision 已在完整事实和 owner 验证后标记 aligned，已兑现的当前队列项已从 `docs/governance/change-coordination.md` 移除，Decision 与 Change checks 作为最终门禁复跑。Owner: governance verifier。
- [x] 2.4 `bun run check -- --all` 已以 exact installed candidate 通过全部 36 个 Checks，覆盖 package declarations、随包文档/examples、runtime behavior、machine artifact 不变边界与完整 Project Gate。Owner: package/Gate verifier。
- [x] 2.5 非实施代理已从实际 diff 独立反查正确性，发现并推动修复 container TypeScript grammar 与 runtime 不一致；复核后 public/internal owner、JSDoc/examples、RunResult/machine 不变判断均无剩余 correctness 阻断。Owner: independent reviewer。
