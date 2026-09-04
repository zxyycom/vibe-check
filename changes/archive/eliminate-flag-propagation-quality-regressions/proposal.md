# Proposal

本 Change 只消除 flag 依赖传递交付新增的四项代码质量 finding，并保持已发布行为不变。

## Why

提交 `fb695143` 让 matching flag root 可以传递启动其 `dependsOn` prerequisite，并让 aggregate 使用同一次 effective selection。required Gate 随后报告四项新增的非阻断质量 finding：一个 authoring parser 的 cyclomatic complexity 和 nesting depth，以及三个超过项目 product-source 文件长度阈值的文件。它们使新增逻辑的局部责任与测试浏览路径变差；但此前已存在的指标不能借本次质量修复扩大成无关重构。

## Outcome

`parseEnabledByFlags` 以可直接审阅的 parser 阶段表达 `propagateDependsOn` 的严格 grammar。三个拆分文件各自只承接一个已有责任：`resolved-execution-result.ts` 承接 Check execution 到 invocation 的私有终态事实、`check-facts-effective-selection.test-support.ts` 构造 effective aggregation 的专用 fixture、`flag-dependency-selection.test.ts` 证明 flag 依赖选择。public flag propagation、`effective` aggregation、Gate selection 与现有测试语义保持不变，四项指定 paths/functions 不再产生本次新增的 quality finding。

## Scope

### Intended Change

- 只修复 `fb695143` 引入的下列质量 finding：
  - `src/project-definition/check-tree/authoring.ts` 中 `parseEnabledByFlags` 的 cyclomatic complexity 11（limit 10）与 nesting depth 8（limit 7）。
  - `src/project-run/check-execution/resolved-checks.ts` 的 308 code lines（limit 300）。
  - `src/project-run/check-facts-aggregation.test-support.ts` 的 302 code lines（limit 300）。
  - `src/project-run/controls/flags.test.ts` 的 449 code lines（limit 300）。
- 在 parser 现有 authoring 边界内，以具名、私有的 validation/normalization helper 分离 closed-key、required-field 与 literal-true 判断；helper 只承接被复用或可独立审阅的 grammar 责任。
- 将运行时实现及测试 support/test 文件按已经存在的 owner、稳定数据流或独立证明目的做机械移动：
  - `check-execution/resolved-execution-result.ts` 是 Check execution owner 的私有终态交接值，只供 invocation 读取，不形成公共 result 或第二套 selection。
  - `check-facts-effective-selection.test-support.ts` 是 Check-facts integration owner 的 effective aggregation fixture；它不承接 flags predicate 或运行时策略。
  - `check-execution/flag-dependency-selection.test.ts` 是 Check execution owner 的依赖选择行为证明；它不接管 `controls/flags.test.ts` 的输入校验、snapshot 或 predicate-mode 证明。
  这些移动保留公共 API、运行时 lifecycle、snapshot/aggregate 和 Gate 行为。
- 测试拆分前后依 `test-evidence-review` 与项目 Case 账本维护 entity mapping；不为文件长度人为拆分 Case 或增加名义测试。

### Resulting Impacts

- authoring parser 的内部 helper 和相邻 Definition tests 需证明 malformed `propagateDependsOn`、canonical snapshot 和既有 `enabledByFlags` grammar 未改变。
- `resolved-checks.ts` 的拆分必须保持 private effective check IDs 与 flag control settlement 在同一次执行路径中传递，且不新建无消费者的通用 runtime abstraction。
- aggregation support 与 flag tests 的移动会改变测试实体路径/名称；需按语义连续性更新 `docs/testing/cases/` 映射，并让完整 test-evidence closure 通过。
- 文件移动和 import 重排需更新局部测试入口；不得同步治理既有超长文件或既有 function-metric finding。
- 最终先使用质量 Check 的对应 records 直接复核四个指定目标，再在最终状态运行一次 required Gate；required Gate 证明跨 owner 集成，不替代四项 quality finding 已消除的直接证据。若 quality Check 的非阻断项目仍被 Gate 汇总为 passed，不得据此把全仓或本 Change 的质量误写为达标。除非实施实际扩大到 package artifact 或 external-consumer 边界且需要该额外证明，否则不运行 `check -- --all`。

## Success Criteria

1. 质量 Check 的指定 record 中，`parseEnabledByFlags` 不再有 cyclomatic-complexity 或 nesting-depth finding，且 `authoring.ts` 仍通过既有 Definition behavior tests。
2. `resolved-checks.ts`、`check-facts-aggregation.test-support.ts` 与 `controls/flags.test.ts` 都不再有本 Change 对应的 file-metrics finding；三个拆分文件分别具有上述明确 owner、真实调用方或独立证明责任。
3. public `enabledByFlags.propagateDependsOn` grammar、effective `dependsOn` closure、`observes` 不传播、`checks: "effective"` aggregation，以及 Gate 行为均无语义改变。
4. 目标测试、完整 `bun run test-evidence -- check --root .`、范围匹配的 type/lint/format/docs checks 及一次 `bun run check` 通过。
5. 变更完成后 Change artifacts、Case 映射与稳定 owner 文档保持一致；在当前已授权范围内归档，并以单独一次 Git commit 记录。

## Affected Owners

- `docs/configuration.md#flag-enabled-checks`：已发布的 flag authoring grammar、effective selection 与 aggregation 边界；本 Change 不改写该稳定行为 owner。
- `docs/quality-metrics.md#explicit-aggregation-and-repository-gate-mapping`：已发布的 effective aggregate 事实边界；本 Change 不改写该稳定行为 owner。
- `docs/testing.md` 与 `docs/testing/case-maintenance.md`：测试实体和 Case 映射维护。
- `docs/coding-style.md`：最小职责拆分、局部可推理性与无多余抽象。
- `src/project-definition/check-tree/`、`src/project-run/check-execution/`、`src/project-run/controls/`：本 Change 的唯一生产与测试实现归属。
