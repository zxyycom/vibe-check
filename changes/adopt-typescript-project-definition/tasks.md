# Tasks

**当前入口：** 本 Change 可执行，下一任务是 `1.1`。先恢复测试证据，再建立唯一 current public-contract source 及其 definition-facing fields，随后按编号连续完成 authoring shape、private loader、foundation handoff、JSON hard cut 和 Verification；完成并归档前不切换到 API-only package Change。

## Readiness

- [x] 0.1 已核对 Proposal、Design 与 Tasks 共享“single TypeScript Project Definition 组合全部执行配置，并解析到既有 Check/Record/orchestration/effect owners”的目标。
- [x] 0.2 已区分现行 JSON/CLI facts、active future directions、current foundation facts、Vibe Check 产品显示名与由工程闭合的 package/API/path/environment identifiers；本 Change 不平行拥有长期决策。
- [x] 0.3 上游已确认 Bun-only host、package-private project-code containment、default logs/cache/output effects、unscoped public/MIT package，以及只公开配置定义与工具运行两个操作；配置文件由使用者创建，不公开 bootstrap/init 或 resource operation。
- [x] 0.4 已核对 Check/Record Core、Task orchestration、policy、reporting、cache 和 output owners：public catalog/private binding、`requiresChecks`、applicability-time TaskPlan factory、plan validation、shared scheduler 与当前 effect 行为均有可消费事实；目标 Project Definition field shape 由本 Change 实现。
- [x] 0.5 已确认 exact identifiers、fixed/default paths、environment 与 dependency-binding names 由工程闭合；本 Change 先建立唯一 current public-contract source 及其 definition-facing fields，API Change 后续只在同一 source 中添加 package/release evidence fields。
- [x] 0.6 已把两个 Change 重构为“Project Definition 完整完成并归档，再由 API-only package 单向消费”的顺序；single-source selection、private-runtime handoff、global scheduler、effects、fingerprint/cache、missing-config diagnostics 与 JSON hard cut 没有 blocking Open Questions。

## Implementation

- [ ] 1.1 修改测试前按 `test-evidence-review` 恢复 Configuration、runtime、Check/Record、orchestration、reporting/cache/output 与 fixture Cases；建立 JSON/CLI-only Case 删除集合、Project Definition 证明集合和后续 API/package 证明边界。
- [ ] 1.2 在 `src/product/**` package-private boundary 建立唯一 typed current public-contract source 及其 definition-facing fields；保存已确认的 unscoped `vibe-check`/MIT identity，选择并固定 Project Definition 所需的 public import/export 与 operation/type identifiers、fixed discovery path、default effect paths、supported environment identifiers 和 operational dependency-binding names，并为 canonical example、loader、diagnostics 与下游 API 建立 generation 或单向 comparison map，不写 candidate/version/host placeholder。
- [ ] 1.3 实现 closed Project Definition input、plain structured authoring operation、required `scheduler: { maxParallel }`、closed effect configuration 与 necessary types；全部 identifiers 和 defaults 消费 current public-contract source，且 authoring operation 不建立 brand、第二种 input、public package entry 或 load prerequisite。
- [ ] 1.4 实现 invocation-scoped private Bun loader 与 typed source/evaluation/export/validation failures；package-private input 只接受 serializable source locator/context，selected module 的 import、single evaluation 和 invalid-subset no-run 符合 private runtime contract。
- [ ] 1.5 实现 built-in refs 与 custom direct/task declaration resolver，把 `scheduler.maxParallel` 归一化到唯一 `SchedulerPolicy`，把 declarative metadata 交给 Check/policy owners，并把 executable variants 保留在 private runtime；验证 catalog/binding 一对一且无第二并发预算。
- [ ] 1.6 实现 declarative detached snapshot/fingerprint 与 custom-result-cache exclusion；function、import、closure、Task value、absolute path 和 policy body 不进入 fingerprint、public boundary 或 machine output。
- [ ] 1.7 将 configuration selection hard cut 为 explicit serializable locator、current-contract fixed target、ungated neutral definition 与 typed disabled selection；neutral definition 显式使用 `scheduler: { maxParallel: 4 }` 和 default effect configuration，并实现 gate prerequisite 与 dynamic-policy diagnostics。
- [ ] 1.8 接入 custom initial request、policy/reference inputs、`requiresChecks` closure 与 applicability-time TaskPlan factory；证明 skipped/not-applicable 不调用 factory，execution 中无法注册 Check/Task。
- [ ] 1.9 实现 private runtime startup、cancellation、termination、cleanup 与 abnormal-exit mapping；只声明 process-failure containment，不把 Bun worker/process 或 Product subprocess/thread 使用表述成 permission sandbox。
- [ ] 1.10 删除 Product configuration initialization/file-creation path；missing definition、legacy JSON 和 unsafe target 只返回 typed actionable diagnostics。Canonical example 证明 authoring shape，但不进入 package resource；repository tooling 如需生成本仓库 definition 则自行拥有实现。
- [ ] 1.11 删除 active JSON reader/comment grammar/runtime-editor schemas/sibling generation/dual-source fixtures，原子迁移 repository dogfood、configured fixtures、tool effects/provenance output 与 package-private execution seam。
- [ ] 1.12 同步 Configuration、Architecture、Output、cache/reporting、Testing/navigation owners、schemas/examples 和语义 Case catalog；记录可供 API-only package Change 的 Readiness `0.15` 核对的 source、consumer comparison、JSON hard cut 与 runtime-seam 证据。本任务不修改 API Change artifacts，也不实施 package work。

## Verification

- [ ] 2.1 对 current public-contract source 执行 owner-to-consumer comparison，证明 definition-facing identifiers、paths、environment/dependency bindings、canonical example、loader 和 diagnostics 只使用 owned values；source 保持 package-private 且没有 candidate/version/host placeholder。
- [ ] 2.2 运行 Project Definition shape、missing/legacy/invalid config、scheduler/effects、private loader/import/error/selection/gate/containment/direct+task binding 与 provenance/fingerprint 的最窄 tests；证明 Product 不创建配置文件且 package-private runtime seam 不泄漏 internal protocol。
- [ ] 2.3 运行 neutral、configured fixture 与 repository dogfood acceptance，证明 neutral definition 与 canonical example 使用 `maxParallel: 4` 和 default effects、custom direct/task Checks 共享唯一 invocation-wide budget、dependency closure 与 applicability-time factory 正确，且没有 custom-result cache。
- [ ] 2.4 运行 product import boundary、`bun run typecheck:product`、`bun run lint:product`、`bun run test:product` 与 `bun run test-evidence:check`。
- [ ] 2.5 运行 `bun run decisions:check`、`bun run validate` 与本 Change 和 API-only package Change 的 `change-plan -- check`；确认两个 Plans 只表达 Project Definition → API package 的单向依赖。
- [ ] 2.6 运行 `bun run verify:vibe-check-workspace:full` 和 full dogfood；focused search 确认 active JSON/schema/dual reader、CLI-only configuration selection、placeholder public names、public worker protocol、helper brand、module-load TaskPlan、custom-result cache、executable-data publication、额外 concurrency budget 和跨 Change 反向 handoff 均已退出。
