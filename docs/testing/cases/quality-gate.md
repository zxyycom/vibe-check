# quality-gate

## Case BB-CLI-GATE-ACCEPTANCE-001: Product gate 正式入口跨 surface 可观察
Owner: `docs/quality-metrics.md#gate-policy-and-evaluation`
Entities:
- `bun|src/product/cli-gate-acceptance.test.ts|formal CLI quality gate acceptance > distinguishes input-unchanged, changed non-regression, and regression evidence`
- `bun|src/product/cli-gate-acceptance.test.ts|formal CLI quality gate acceptance > fails an all gate for an all-only warning channel`
- `bun|src/product/cli-gate-acceptance.test.ts|formal CLI quality gate acceptance > passes a zero-warning quick all gate while preserving skipped capability evidence`
- `bun|src/product/cli-gate-acceptance.test.ts|formal CLI quality gate acceptance > rejects a comparison gate without an explicit baseline before scan work`
Proves:
- Quick `all` zero-warning gate 保留 skipped capability evidence 并退出 `0`；all-only warning 只从 `warnings.all` 形成 failed gate 并退出 `1`。
- 受控 Git comparison 在 scan work 前把 symbolic revision 解析为 canonical full commit SHA，并将 input-unchanged 作为有效 evidence；changed non-regression 与 regression 分别只按 `changed` / `regressions` channel 形成 GateResult。
- Comparison gate 缺少显式 baseline 时在 scan work 前作为 usage failure 退出 `3`，且不创建 artifact directory。
- 三个 machine artifacts 的原始 bytes 通过 production artifact-set validator；validated metrics、warning streams、requested-gate report/console 与 CLI exit 投影同一 GateResult 和 normalized warning records。

## Case BB-CLI-GATE-OMITTED-001: Product omitted-gate regression baseline 稳定
Owner: `docs/quality-metrics.md#gate-policy-and-evaluation`
Entities:
- `bun|src/product/cli-omitted-gate-baseline.test.ts|formal CLI current projection regression baseline > --verification-output changes only the warning preview`
- `bun|src/product/cli-omitted-gate-baseline.test.ts|formal CLI current projection regression baseline > records the complete-passed projection and outcome`
- `bun|src/product/cli-omitted-gate-baseline.test.ts|formal CLI current projection regression baseline > records the complete-warning projection and outcome`
- `bun|src/product/cli-omitted-gate-baseline.test.ts|formal CLI current projection regression baseline > records the legitimate-empty projection and outcome`
- `bun|src/product/cli-omitted-gate-baseline.test.ts|formal CLI current projection regression baseline > records the scan-incomplete projection and outcome`
Proves:
- 同时省略 `--gate` 与 baseline option 的正式入口使用 current-snapshot-only default，产物保留 `baseline-skipped` 与精确 `gate: { policy: null, status: "disabled" }`，且 console / report 不增加 gate section。
- Complete passed、complete warning、legitimate empty 与 scan-incomplete 四组产物中的三个 machine artifact 原始 bytes 均通过 production artifact-set validator，并分别保留既有 exit、warning conclusion 和 human-output 行为。
- `--verification-output` 只切换 warning preview，不改变稳定化后的 artifacts、completion message 或 omitted-gate 静默行为。

## Case BB-CLI-GATE-USAGE-001: Product gate usage failure 在启动前失败
Owner: `docs/cli.md#scan-flags`
Entities:
- `bun|src/product/cli.test.ts|gate CLI usage contract > returns exit 3 before scanners or artifacts for every invalid gate form`
Proves:
- Missing、duplicate、unknown gate value，comparison policy 缺少显式 baseline，retired `--with-baseline`，无法解析的显式 revision，以及 baseline / profile 冲突，均通过正式 Product CLI 退出 `3`。
- Usage failure 不写 stdout、不启动 controlled scanner，也不创建 artifact directory。

## Case WB-CLI-GATE-PLANNING-001: Product gate parser、help 与 scan plan 稳定
Owner: `docs/cli.md#scan-flags`
Entities:
- `bun|src/product/args.test.ts|quality gate argument parsing and scan planning > accepts every descriptor-derived gate policy value`
- `bun|src/product/args.test.ts|quality gate argument parsing and scan planning > derives gate values and policy descriptions in scan help from the descriptor`
- `bun|src/product/args.test.ts|quality gate argument parsing and scan planning > keeps gate enforcement disabled when callers omit --gate`
- `bun|src/product/args.test.ts|quality gate argument parsing and scan planning > keeps --skip-baseline as a CLI-only current-snapshot compatibility flag`
- `bun|src/product/args.test.ts|quality gate argument parsing and scan planning > keeps the selected profile and baseline plan for the all policy`
- `bun|src/product/args.test.ts|quality gate argument parsing and scan planning > keeps verification output orthogonal to gate policy and scan planning`
- `bun|src/product/args.test.ts|quality gate argument parsing and scan planning > rejects comparison policies with quick profile or explicit baseline skipping`
- `bun|src/product/args.test.ts|quality gate argument parsing and scan planning > rejects missing, duplicate, and unknown gate values with actionable usage errors`
- `bun|src/product/args.test.ts|quality gate argument parsing and scan planning > rejects retired and contradictory baseline options`
- `bun|src/product/args.test.ts|quality gate argument parsing and scan planning > requires an explicit baseline for comparison policies`
- `bun|src/product/args.test.ts|quality gate argument parsing and scan planning > retains an explicit baseline revision for comparison policies`
Proves:
- Omitted request 保持 gate disabled，三个 descriptor-derived policy values 均可解析； missing、duplicate 和 unknown value 返回 actionable usage error。
- `all` 保持 caller-selected profile 与 raw baseline revision；`changed` / `regressions` 使用 full profile 且必须由 caller 显式提供 baseline，不推断历史。
- Comparison policy 拒绝 quick / `--skip-baseline`；`--skip-baseline` 只保留为 CLI compatibility spelling，不进入 normalized Core options；`--verification-output` 不改变 policy 或 scan plan。
- Help 从 descriptor 派生 values 与 policy descriptions，并记录 accepted warning 与 exit 语义。

## Case WB-CLI-BASELINE-RESOLUTION-001: 显式 baseline revision 归一为 commit identity
Owner: `docs/cli.md#scan-flags`
Entities:
- `bun|src/product/cli.test.ts|baseline resolution CLI contract > maps Git execution failures to runtime exit 2 before scan work`
- `bun|src/product/quality-core/src/input/revisions.test.ts|explicit baseline revision resolution > canonicalizes commit aliases to one full commit object ID`
- `bun|src/product/quality-core/src/input/revisions.test.ts|explicit baseline revision resolution > keeps Git execution failures as runtime errors`
- `bun|src/product/quality-core/src/input/revisions.test.ts|explicit baseline revision resolution > rejects missing, non-commit, and option-like revisions`
Proves:
- Branch、annotated tag 与 abbreviated SHA 在 invocation root 内归一为同一个 canonical full commit object ID。
- Missing ref、非 commit object expression 与 option-like input 在 scan work 前返回稳定、可操作的 unavailable-commit diagnostic。
- Git 无法启动或 project root 无法访问时保留 ordinary runtime failure，正式 CLI 在 scan work 前退出 `2`，不降格为 invalid-revision usage error `3`。

## Case WB-METRICS-GATE-EVALUATOR-001: Product gate evaluation 稳定
Owner: `docs/quality-metrics.md#gate-policy-and-evaluation`
Entities:
- `bun|src/product/quality-core/src/model/gate-evaluator.test.ts|gate evaluator prerequisites > applies the fixed disabled, completeness, and comparison priority`
- `bun|src/product/quality-core/src/model/gate-evaluator.test.ts|gate evaluator prerequisites > does not make comparison evidence a prerequisite for the all policy`
- `bun|src/product/quality-core/src/model/gate-evaluator.test.ts|gate evaluator warning selection > counts accepted-only warnings as evaluated but not blocking`
- `bun|src/product/quality-core/src/model/gate-evaluator.test.ts|gate evaluator warning selection > preserves mixed warning identity, order, channels, and input data`
- `bun|src/product/quality-core/src/model/gate-evaluator.test.ts|gate evaluator warning selection > selects the descriptor-owned all, changed, and regressions channels`
- `bun|src/product/quality-core/src/model/gate-evaluator.test.ts|gate evaluator warning selection > treats input-unchanged as valid evidence for comparison policies`
Proves:
- Disabled、failed/empty completeness 与 comparison-unavailable 使用固定 prerequisite priority；`all` 不把 comparison 当作 prerequisite。
- `all`、`changed`、`regressions` 只选择 descriptor-owned channel，且 `input-unchanged` 是有效 comparison evidence。
- Accepted warnings 保留在 evaluated membership；mixed warnings 只把 unaccepted records 按原 identity/order 放入 blocking set，不修改输入 channels。

## Case WB-METRICS-GATE-MODEL-001: Product gate descriptor 与 result validation 稳定
Owner: `docs/quality-metrics.md#gate-policy-and-evaluation`
Entities:
- `bun|src/product/quality-core/src/model/gate-policy.test.ts|GateResult model > exposes closed reason and status types`
- `bun|src/product/quality-core/src/model/gate-policy.test.ts|GateResult model > exposes the closed not-evaluated reasons`
- `bun|src/product/quality-core/src/model/gate-policy.test.ts|GateResult validation > accepts evaluated and not-evaluated shapes`
- `bun|src/product/quality-core/src/model/gate-policy.test.ts|GateResult validation > accepts the disabled shape produced by empty metrics`
- `bun|src/product/quality-core/src/model/gate-policy.test.ts|GateResult validation > rejects invalid GateResult shapes with path-aware errors`
- `bun|src/product/quality-core/src/model/gate-policy.test.ts|gate policy descriptor > derives closed policy values, help, channels, and prerequisites from one descriptor`
Proves:
- 单一 descriptor 派生 closed policy values、help、selected channels 和 comparison prerequisites；GateResult/schema model 拥有 closed statuses 与 not-evaluated reason codes。
- Disabled、evaluated 与 not-evaluated GateResult shapes 通过 metrics validation。
- Unknown enum、status-specific field、count/list、policy/channel 与 status/count invariant violations 返回 path-aware validation error。

## Case WB-RUNTIME-GATE-OUTCOME-001: Product gate process outcome 与 output priority 稳定
Owner: `docs/quality-metrics.md#status-and-failure`
Entities:
- `bun|src/product/quality-core/src/engine.test.ts|quality scan process outcome > does not publish a computed failed gate when output validation fails`
- `bun|src/product/quality-core/src/engine.test.ts|quality scan process outcome > keeps gate projection independent from verification warning preview`
- `bun|src/product/quality-core/src/engine.test.ts|quality scan process outcome > publishes the same warnings and GateResult across successful outputs`
- `bun|src/product/quality-core/src/engine.test.ts|quality scan process outcome > returns failed for requested gates without complete evidence`
- `bun|src/product/quality-core/src/engine.test.ts|quality scan process outcome > returns failed when artifact output fails after a failed gate was computed`
- `bun|src/product/quality-core/src/engine.test.ts|quality scan process outcome > returns gate-failed only after the written failed-gate metrics validate`
Proves:
- Disabled 与 evaluated gate 使用同一 final warning records；accepted records、warning streams 和 report projection 不因 policy 改变。
- Validated failed gate 产生 `gate-failed`；empty/incomplete requested gate 分别产生 closed not-evaluated result 和 `failed` process outcome。
- Artifact write 或 output validation failure 优先于已计算 failed gate，且不保留 partial canonical machine set、owned temps 或提前打印的 trusted machine paths。
- `--verification-output` 只改变 warning preview，不改变 GateResult 或 process outcome。
