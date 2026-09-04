# Design

本设计以最小的 owner-local 拆分恢复新 flag propagation 代码的可读性和质量阈值，而不改变已交付的选择语义。

## Context

`fb695143` 已归档其行为 Change，并在稳定 owner 中定义以下当前契约：`enabledByFlags.propagateDependsOn` 只接受省略或 literal `true`；matching opt-in root 将 normalized `dependsOn` 完整闭包加入 invocation-private effective selection；`observes` 不参与传播；`checks: "effective"` 使用同一 private selection。现有 required Gate record 的新增 finding 精确定位到一个 parser function 与三个文件；`parseCheck`、`validateRunControlsValue` 和 `invocation.ts` 是该 commit 前已存在的 finding，不是本 Change 输入，也不因本 Change 的 Gate 结果变为质量整改目标。

质量阈值是审查信号，不取代语义判断。实现必须保留 authoring 的 closed grammar、frozen canonical value、Scheduler lifecycle、direct dependency semantics、Case 语义与 Gate exit mapping。用户已授权完成后的归档和每 Change 一次提交，但当前规划阶段不实施、归档或提交。

## Goals / Non-Goals

Goals：降低四项新增 finding；让 parser 条件和四个文件的责任边界可从局部恢复；维持 public 与 Gate 行为；通过 Case 账本证明测试移动的语义连续性。

Non-Goals：不改变 `enabledByFlags` public grammar 或 effective selection policy；不调整 flag vocabulary、scheduler、global concurrency、aggregation policy、Gate preset；不修复既有质量 finding；不因指标建立通用 parsing/runtime/test utility；不运行完整 `--all` Gate 作为默认验证。

## Decisions

### Intended Change

1. 在 `check-tree` authoring owner 内先提取仅承接 `enabledByFlags` closed-object grammar 的私有 helper：分别表达 record/key/required-field 校验、mode narrowing、literal `propagateDependsOn` 约束或 canonical result 构造。选择以实际重复与独立审阅责任决定 helper 边界；若一个 guard 仍直接呈现单一规则，则保持内联。parser 对外的 `undefined` invalid signal、`null` omission、frozen/sorted flags 与 optional literal field 形状完全保持。
2. 为 `resolved-checks.ts` 选择与现有 `flag-controls.ts`、execution lifecycle 和 finalization 的 owner 一致的最小文件边界。唯一的新 production 文件 `check-execution/resolved-execution-result.ts` 只承接已完成 execution 的私有终态事实到 invocation：它有 invocation 这个真实消费者，且不计算 selection、不公开 `RunResult` 字段，也不形成策略接口。不得引入 public export、通用 selection service 或第二次 selection calculation。
3. 将 aggregation fixture/support data 与 flags behavior tests 按既有聚合语义及 flags 生命周期的证明边界拆到同 owner 下的 test/support modules。`check-facts-effective-selection.test-support.ts` 只构造 effective aggregation 的 fixture；`check-execution/flag-dependency-selection.test.ts` 只证明 dependsOn closure、observes exclusion 与 cancellation ordering。输入 validation、canonical snapshot 和 predicate modes 保留在 `controls/flags.test.ts`。移动测试不得改变 assertion 信号；是否保留同一个 Case ID 取决于证明目的是否连续，不以文件数或 test count 判断。
4. 使用质量 Check 中对应 function/path 的 records 直接确认四个目标 finding 消失，再运行一次最终 `bun run check` 证明跨 owner 集成。required Gate 的 passed aggregate 不等于 quality Check 的每个 advisory record 都通过，因此它不是四项整改的替代证据。完整 Gate 不是本 Change 的默认验证；若没有新 package artifact/external-consumer 影响，不运行 `--all`。

### Resulting Impacts

1. 任何 parser helper 必须是 `authoring.ts` 私有实现细节，仍由 `parseCheckTreeAuthoring` 的现有测试和 Definition validation 证明；不得新增稳定文档或 Decision。
2. execution stage 拆分会涉及 local imports 和 direct-execution tests；需验证 static graph validation 仍先于 effective selection，flag-control settlement 仍只处理 effective selection 外的 predicate misses。
3. test file move/split 会改变 test entity keys。实施前先运行全树 test-evidence check 并查询受影响 Cases；实施后按 Case 语义更新 `docs/testing/cases/`，运行目标 Bun tests 与完整 closure。
4. quality scan 的完成判定只比较质量 Check 中四个指定 path/function 的相应 metrics；其它已有 record 保持 out of scope，不能用 required Gate 的 passed aggregate 误称为全仓或本 Change quality-clean。
5. 若实现发现必须改变 public grammar、selection or aggregation behavior、Gate policy，停止扩大本 Change，先请求或建立独立长期判断/Change；当前没有此类需要，因此不创建 Decision。

## Risks / Trade-offs

仅为降低行数拆出过多文件会把一个连续生命周期切碎；因此每个新模块必须有明确 owner、输入输出和至少一个真实 consumer。相反，完全内联 parser guards 可能继续超过 complexity/nesting 阈值；以 grammar 阶段命名而非按语法 token 切分可同时降低指标并保持 readable flow。测试实体路径变化若未同步 Case 账本会使 closure 阻断，即使 Bun tests 通过；以 `test-evidence` 的前后检查作为保护。一次 final required Gate 可能重新报告无关既有 findings；验收只对本 Change 新增的四项作消除结论，并完整报告其它 findings 未处理。

## Open Questions

无。实施时只需在相邻源码确认哪个 execution stage 与哪个 test group 已具备独立责任；这不会改变本 Change 的范围或验收。
