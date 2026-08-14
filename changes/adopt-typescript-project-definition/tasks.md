# Tasks

按编号完成测试证据恢复、current public-contract source、Project Definition、Product 运行内核、Task/dependency handoff、JSON hard cut 和验证；本 Change 完成并归档前，下游 API package Change 保持等待。

## Readiness

- [x] 0.1 Proposal、Design 与 Tasks 使用同一调用链：其他调用方 → 项目 Run → Package Run → 项目函数 → Task 系统。
- [x] 0.2 已区分当前 JSON/CLI facts、active future decisions、当前 foundation facts 和本 Change 的实现范围。
- [x] 0.3 已确认项目只持有配置文件与运行脚本；package 提供配置定义函数与 Package Run；项目文件路径不属于 Product contract。
- [x] 0.4 已核对 Check/Record、DecisionPolicy、`TaskPlan`、shared scheduler、scanner dependencies 和 effects owners，可直接消费本 Change 的 handoff。
- [x] 0.5 已确认 Package Run 接收一个 Project Definition 与 closed Run Controls；controls 只拥有 invocation-scoped context/overrides。
- [x] 0.6 已确认项目函数在调用 Package Run 的 Bun runtime 中执行；Task 系统负责 task dependency、bounded parallelism 和 named resources。
- [x] 0.7 已按 `decision-records` 修订 configuration input、public operations、Task execution boundary、neutral/gate 和 naming directions，并同步下游 Change。

## Implementation

- [ ] 1.1 使用 `test-evidence-review` 恢复 Configuration、Package Run、Check/Record、Task orchestration、scanner dependency、effects、项目 Run 和 fixture Cases；运行 `bun run test-evidence:check`，明确保留、迁移和删除的 Case 集合。
- [ ] 1.2 先形成 package name/consumer comparison，再在 `src/product/**` 建立唯一 current public-contract source；确定 package import、config-definition/Package Run symbols、必要 types、effect defaults、environment 和 dependency identifiers；不写项目文件路径或 version/host/legal/manifest placeholders。
- [ ] 1.3 实现配置定义函数、Project Definition authoring types 和 plain return value；支持 exact-key inference 和 owned authoring defaults，不建立 brand、builder、registration 或 file ownership。
- [ ] 1.4 实现 Product 运行内核的 `(Project Definition, Run Controls)` input contract、runtime validation 和 typed pre-work failures；一次 invocation 恰好一个 definition，controls 只接受 Design 声明的当次输入类别。
- [ ] 1.5 将 valid Project Definition 归一化为 frozen declarative snapshot、foundation-owned public Check catalog 和一一对应的 custom function bindings；functions/closures/Tasks/internal ports 不进入 public data。
- [ ] 1.6 按 `explicit Run Control > supported environment > Project Definition/Product default` 解析一个 `ScannerDependencySnapshot`；在 work 前验证 required bindings，禁止 repository state 或 ambient `PATH` fallback，并保持 diagnostics secret-safe。
- [ ] 1.7 建立 declarative fingerprint 和 custom-result-cache exclusion；function source、closure、module graph、project file path、ambient environment、resolved executable path、Task value 和 policy body 不进入 fingerprint/machine output。
- [ ] 1.8 实现 explicit Project Definition requirement、neutral observation authoring、gate named-policy prerequisite，以及 Run Controls 对 effects/references/dependencies 的 closed precedence。
- [ ] 1.9 将 custom selection、policy/reference inputs、`requiresChecks` closure、direct runner 和 applicability-time `TaskPlan` factory 接入 existing owners；证明 skipped/not-applicable 不调用 factory，execution 不动态注册 Check/Task。
- [ ] 1.10 接通 shared scheduler：一个 `SchedulerPolicy.maxParallel` 管理 direct/Task/completion work；task dependencies 决定等待，named resources 决定互斥，可运行 tasks 在预算内并行。
- [ ] 1.11 建立 canonical 项目配置文件和项目运行脚本；项目 Run 绑定 definition，只暴露允许的 controls。迁移 repository dogfood，并删除 Product config discovery/init/create path。
- [ ] 1.12 删除 JSON reader/comment grammar、runtime/editor schemas、sibling generation、dual-source fixtures 和旧 selection；legacy JSON 只产生 migration diagnostic。
- [ ] 1.13 同步 Configuration、Architecture、Scanner Dependencies、Output、Testing/navigation、examples 和 Case catalog；记录下游 Readiness `0.15` 所需的 current-contract、Product 运行内核、Task/dependency、JSON hard cut 和 canonical usage evidence。

## Verification

- [ ] 2.1 对 current public-contract source 执行 owner-to-consumer comparison；证明 package symbols/types/defaults/environment/dependency identifiers 只有一个 owner，且 source 不含项目文件路径或 package/release placeholders。
- [ ] 2.2 运行配置定义 authoring、Project Definition/Run Controls validation、normalization、function-slot、neutral/gate、operational dependency、effects、fingerprint 和 typed failure tests。
- [ ] 2.3 运行完整调用链 acceptance：其他调用方只调用项目 Run；Package Run 调用 project functions；direct work 和 `TaskPlan` 按 dependency、parallel budget 和 named resources 执行。
- [ ] 2.4 运行 product import boundary、`bun run typecheck:product`、`bun run lint:product`、`bun run test:product` 和 `bun run test-evidence:check`。
- [ ] 2.5 运行 `bun run decisions:check`、`bun run validate` 和两个 active Changes 的 `change-plan -- check`；确认下游只消费本 Change 的 current facts。
- [ ] 2.6 运行 `bun run verify:vibe-check-workspace:full` 和 full dogfood；focused audit 证明 active JSON/schema/discovery/init、dual source、function serialization/reload、whole-invocation execution protocol、custom-result cache、ambient dependency fallback 和跨 Change 反向 handoff均已退出。
