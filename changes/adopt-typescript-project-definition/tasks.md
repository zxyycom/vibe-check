# Tasks

本 Change 在 foundation seams、fixed path 与 public API identifiers 闭合前保持 shelved；恢复后按 authoring shape、private loader、foundation handoff、JSON hard cut 和 evidence 的顺序实施。

## Readiness

- [x] 0.1 已核对 Proposal、Design 与 Tasks 共享“single TypeScript Project Definition 组合全部执行配置，并解析到既有 Check/Record/orchestration/effect owners”的目标。
- [x] 0.2 已区分现行 JSON/CLI facts、active future directions、foundation prerequisites、Vibe Check 产品显示名与尚未确认的 package/API/path/environment identifiers；本 Change 不平行拥有上游判断。
- [x] 0.3 上游已确认 Bun-only host、package-private project-code containment、default logs/cache/output effects，以及只公开配置定义与工具运行两个操作；配置文件由使用者创建，不公开 bootstrap/init 或 resource operation。
- [ ] 0.4 Check/Record foundation、Task orchestration 与 reporting/cache/output owners 已提供 public catalog/private binding、closed policy/effect declarations、`requiresChecks`、applicability-time factory、TaskPlan validation 和 shared scheduler seams。
- [ ] 0.5 Fixed discovery path、public imports/exports、两个操作及必要类型的 symbols、default effect paths 与 supported environment identifiers 已由上游确认，并进入唯一 current public-contract source；本 Change 没有 local alias、placeholder、bootstrap 或 resource export。
- [ ] 0.6 已重新核对 single-source selection、private-runtime handoff、global scheduler、effects、fingerprint/cache、missing-config diagnostics 与 JSON hard cut，不存在 blocking Open Questions；随后执行 `resume` 和 `plan`，未完成前不得进入 implementation。

## Implementation

- [ ] 1.1 修改测试前按 `test-evidence-review` 恢复 Configuration、public package API、runtime、Check/Record、orchestration、reporting/cache/output 与 fixture Cases；建立 JSON/CLI-only Case 删除集合和 Project Definition/API 证明迁移集合。
- [ ] 1.2 实现 closed Project Definition input、plain structured export、required `scheduler: { maxParallel }`、closed effect configuration 与 confirmed 配置定义操作/types；验证该操作不建立 brand、第二种 input 或 load prerequisite。
- [ ] 1.3 实现 invocation-scoped private Bun loader 与 typed source/evaluation/export/validation failures；public input 只接受 serializable source locator/context，selected module 的 import、single evaluation 和 invalid-subset no-run 符合 private runtime contract。
- [ ] 1.4 实现 built-in refs 与 custom direct/task declaration resolver，把 `scheduler.maxParallel` 归一化到唯一 `SchedulerPolicy`，把 declarative metadata 交给 Check/policy owners，并把 executable variants 保留在 private runtime；验证 catalog/binding 一对一且无第二并发预算。
- [ ] 1.5 实现 declarative detached snapshot/fingerprint 与 custom-result-cache exclusion；function、import、closure、Task value、absolute path 和 policy body 不进入 fingerprint、public boundary 或 machine output。
- [ ] 1.6 将 configuration selection hard cut 为 explicit serializable locator、confirmed fixed target、ungated neutral definition 与 typed disabled selection；neutral definition 显式使用 `scheduler: { maxParallel: 4 }` 和 default effect configuration，并实现 gate prerequisite 与 dynamic-policy diagnostics。
- [ ] 1.7 接入 custom initial request、policy/reference inputs、`requiresChecks` closure 与 applicability-time TaskPlan factory；证明 skipped/not-applicable 不调用 factory，execution 中无法注册 Check/Task。
- [ ] 1.8 实现 private runtime startup、cancellation、termination、cleanup 与 abnormal-exit mapping；只声明 process-failure containment，不把 Bun worker/process 或 Product subprocess/thread 使用表述成 permission sandbox。
- [ ] 1.9 删除 Product configuration initialization/file-creation path；missing definition、legacy JSON 和 unsafe target 只返回 typed actionable diagnostics。Canonical example 证明 authoring shape，但不进入 package resource；repository tooling 如需生成本仓库 definition 则自行拥有实现。
- [ ] 1.10 删除 active JSON reader/comment grammar/runtime-editor schemas/sibling generation/dual-source fixtures，原子迁移 repository dogfood、configured fixtures、tool effects/provenance output 与 public authoring source。
- [ ] 1.11 同步 Configuration、public API、Architecture、Output、cache/reporting、Testing/navigation owners、schemas/examples 和语义 Case catalog，明确 Bun prerequisite、private containment、global scheduler、default effects、disabled observation、fingerprint/cache boundary 与 confirmed identifiers。

## Verification

- [ ] 2.1 运行 Project Definition shape、missing/legacy/invalid config、scheduler/effects、private loader/import/error/selection/gate/containment/direct+task binding 与 provenance/fingerprint 的最窄 tests；证明 path/import/symbol 只来自 current public-contract source，且 Product 不创建配置文件。
- [ ] 2.2 运行 neutral、configured fixture 与 repository dogfood acceptance，证明 neutral definition 与 canonical example 使用 `maxParallel: 4` 和 default effects、custom direct/task Checks 共享唯一 invocation-wide budget、dependency closure 与 applicability-time factory 正确，且没有 custom-result cache。
- [ ] 2.3 运行 product import boundary、`bun run typecheck:product`、`bun run lint:product`、`bun run test:product` 与 `bun run test-evidence:check`。
- [ ] 2.4 运行 `bun run decisions:check`、`bun run validate` 与本 Change 的 `change-plan -- check`。
- [ ] 2.5 运行 `bun run verify:vibe-check-workspace:full` 和 full dogfood；focused search 确认 active JSON/schema/dual reader、CLI-only selection、placeholder public names、public worker protocol、helper brand、module-load TaskPlan、custom-result cache、executable-data publication 和额外 concurrency budget 均已退出。
