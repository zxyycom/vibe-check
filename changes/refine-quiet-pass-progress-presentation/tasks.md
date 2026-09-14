# Tasks

按长期判断、单一策略事实、renderer 行为、公开材料和完整证据的顺序推进；只有所有 owner 与验证闭合后才完成 Change。

## Readiness

- [x] 0.1 已建立 active/unaligned Decision `260914-configure-progress-previews-and-quiet-pass-presentation`，以自包含修订保留 preview/formatter/安全/failure 契约，并固定 `omitQuietPassedRow?: true`、直接移除旧 grammar、accepted-fact predicate、无编号 rows 与 configured/actual 双计数；前序已按 Decision Records 事务归档，`bun run decisions -- check` 通过。Owner: Decision owner。
- [x] 0.2 Test Evidence 起点检查通过（605 个 current Bun entities 全部映射到 140 个 Cases）。语义审计确认本 Change 不新增 Case：Definition 两个 visibility entities 在 `WB-PROJECT-DEFINITION-001` 内连续 rename；共享 fingerprint entity 继续同时证明该 Case 与 `WB-PROGRESS-PREVIEW-DEFINITION-001`；renderer lifecycle 和 accepted-detail entity 分别在 `WB-OUTPUT-RUN-PROGRESS-001`、`WB-PROGRESS-OUTPUT-001` 内连续更新；package Check 与 installed-consumer entity 保留既有 Case。Owner: Test Evidence owner。
- [x] 0.3 当前 HEAD 与 Plan base 相同，Change distance 为零；协调队列仍要求本 Change 在后续 Definition grammar 扩张前完成。序位 1 的 file-metrics SCC Change 不修改本 Plan 的 Definition/progress owners；序位 3 及其后续共享 owner 的 Change 应在本 Change 合入后同步基线。Owner: Change maintainer。

## Implementation

- [ ] 1.1 在 Check authoring、closed parser、tree materialization/resolution、normalized declaration 和 declarative snapshot 中用 `omitQuietPassedRow?: true` / normalized boolean 原子替换 `visibility`；拒绝 container、`false`、旧字段和其它值，覆盖 omission/own `undefined`/`true`、non-inheritance、freezing 与 fingerprint。Owner: Project Definition owner。
- [ ] 1.2 将 normalized policy 沿 execution identity、started/settled lifecycle feedback 交给 progress renderer，并在 prepared feedback 中提供全部 normalized executable Checks 的 configured count；保持 Check facts、selection、dependency、aggregation、duration readback、disabled output 和 machine/public result shape 不变。Owner: Project Run / Check execution owner。
- [ ] 1.3 实现 indexed/unnumbered running 与 settled formatting、accepted-fact quiet-pass omission、全局 completion accounting 和 actual omitted count；保持 flag-condition grouping 优先级、plain/dumb append-only、TTY elapsed refresh、preview/formatter、escaping/color、tee 和 writer-failure containment，并精确实现 design 中的非零配置 header/final 文案与零配置 byte compatibility。Owner: Human output owner。
- [ ] 1.4 原子迁移 `maintenanceReminders`、public JSDoc、package API/mixed-outcomes examples、API projection source 和 external-consumer type/runtime fixtures；从 owner source 重建派生材料，不手改生成投影。Owner: Package material owners。
- [ ] 1.5 更新 `docs/guides/run-outputs.md`、`docs/guides/extending-check-lifecycle.md`、`docs/development/project-definition.md` 与 `docs/development/human-output.md`，分别说明 authoring、quiet-pass predicate、unnumbered rows、configured/actual counts、accounting jump、default compatibility 与不变的 RunResult/machine boundary；明确当前版本 changelog 不在本 Change 改写。Owner: public/internal documentation owners。
- [ ] 1.6 按 0.2 的连续映射修改测试而不新增 Case：将 `project-definition.visibility.test.ts` 及其两个 entities 重命名为 quiet-pass policy，并更新 `WB-PROJECT-DEFINITION-001` 的 keys/`Proves`；保留 fingerprint entity 对 `WB-PROGRESS-PREVIEW-DEFINITION-001` 的既有证明；在 `WB-OUTPUT-RUN-PROGRESS-001` 内更新 renderer lifecycle entities，在 `WB-PROGRESS-OUTPUT-001` 内更新 accepted-detail entity；package Check、`AUX-PUBLIC-AUTHORING-TYPES-001` 和 external runtime Case 保持原 ID。最窄集合覆盖 TTY/plain/dumb、四类 retained outcome、quiet pass、有 detail pass、preview limit/empty formatter、flag mismatch、configured≠actual、zero config、escaping、writer failure 和完整 facts，并同步两个 Case 文件的受影响 keys/`Proves`。Owner: test owners。

## Verification

- [ ] 2.1 运行更新后的最窄 Project Definition、progress renderer/invocation、package Check 与 external-consumer tests，核对 exact bytes、fingerprint、closed validation、full-fact preservation 和 failure containment；随后运行 `bun run test-evidence -- check --root .`。Owner: implementation verifier。
- [ ] 2.2 运行 `bun run docs:api:write` 后确认无非 owner 派生差异，再运行 `bun run docs:api`、`bun run validate -- docs`、`bun run typecheck` 与 `bun run lint`，确认公开类型、投影、链接、示例和 owner 文档一致。Owner: documentation/package verifier。
- [ ] 2.3 运行 `bun run decisions -- check` 与 `bun run change-plan -- check changes/refine-quiet-pass-progress-presentation`，逐项核对 Success Criteria；在事实和 owner 已同步后按 Decision 流程将 successor 标记 aligned，并在准备完成 Change 前从 `docs/governance/change-coordination.md` 移除已兑现的当前队列项。Owner: governance verifier。
- [ ] 2.4 运行 `bun run check -- --all`，以 exact installed candidate 验收 package declarations、随包文档/examples、runtime behavior、machine artifact 不变边界与完整 Project Gate。Owner: package/Gate verifier。
- [ ] 2.5 由非实施代理从实际实现 diff 起点反查 public 用户变化、内部职责、JSDoc/examples、RunResult/machine 不变判断和更新后的说明；修复发现并记录独立语义审查结论，不能用机械校验或 task checkbox 替代。Owner: independent reviewer。
