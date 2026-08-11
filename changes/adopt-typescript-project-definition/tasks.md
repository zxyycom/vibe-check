# Tasks

先确认 foundation 与 orchestration seams 已落地，再依次实现 authoring/loader、selection/trust、init migration、runtime integration 和完整验收；只有实际产物与证据完成后才勾选 Implementation 或 Verification。

## Readiness

- [x] 0.1 已核对 proposal、design 与 tasks 共享“TypeScript Project Definition 只负责 authoring/source selection，并解析到既有 Check/Record/orchestration owners”的目标。
- [x] 0.2 已读取当前 Configuration/CLI/Architecture/Output owners、`src/product/config*.ts`、直接相关活动决策、两个 foundation 计划与历史形成材料，并区分现行 JSON v1 事实与本 Change hard-cut 目标。
- [x] 0.3 已确认 affected owners、implementation 依赖、selection、trust、global scheduler authoring/default/validation、public/private/fingerprint/cache、init 和迁移出口；`Open Questions` 无阻塞实施的未决项。

## Implementation

- [ ] 1.1 在修改测试前按 `test-evidence-review` 恢复 Config、CLI、runtime、Check/Record、orchestration、output 与 fixture Cases，并证明 `establish-check-record-core` 和 `establish-check-task-orchestration` 的目标 seams 已在当前 owner/runtime 可用。
- [ ] 1.2 实现 closed `ProjectDefinitionInput` runtime envelope、plain structured export、required closed `scheduler: { maxParallel }` 与 optional `vibe-check/project` identity helpers/types；验证 `maxParallel` 是 positive safe integer，helpers 不得成为 brand 或 load prerequisite。
- [ ] 1.3 实现 invocation-scoped Bun loader与 typed source/evaluation/export/validation failures，证明 top-level await、bare/local project imports、same-invocation single evaluation和 invalid subset no-run。
- [ ] 1.4 实现 built-in refs与 custom direct/task declarations resolver，把 global `scheduler.maxParallel` 归一化到唯一 orchestration `SchedulerPolicy`，把 declarative metadata交给 Check/policy owners，把 executable variants交给各 private adapter；验证 public catalog/private binding一对一，且 Check declarations / schedule metadata 不能声明第二个并发预算。
- [ ] 1.5 实现 declarative detached snapshot/fingerprint与 custom-cache exclusion；functions、imports、closures、Task values、absolute path 和 policy body不得进入 fingerprint或 machine output。
- [ ] 1.6 将 config selection hard cut为 explicit `.ts`、fixed `.vibe-check/config.ts`、ungated neutral 与 disabled path；Product-owned neutral definition显式使用`scheduler: { maxParallel: 4 }`，并实现 gate prerequisite、`--no-project-definition` pre-load conflicts、static help和 post-load dynamic policy diagnostic。
- [ ] 1.7 接入 custom initial request、policy/reference inputs、`requiresChecks` closure与 applicability-time TaskPlan factory；证明 skipped/not-applicable不调用 factory，execution 中无法注册 Check/Task。
- [ ] 1.8 将 `init` 改为 deterministic import-free `.vibe-check/config.ts` single target，starter显式写入`scheduler: { maxParallel: 4 }`，保留 safe-file ownership/race/error语义并增加 legacy JSON manual-migration diagnostic；`init` 不 evaluate module。
- [ ] 1.9 删除 active JSON reader/comment grammar/runtime-editor schemas/sibling generation/dual-source fixtures，原子迁移 repository dogfood、configured fixtures、CLI/output provenance和 public authoring entry。
- [ ] 1.10 同步 Configuration、CLI、Architecture、Output、Testing/navigation owners、schemas/examples和语义 Case catalog，明确 global scheduler authoring/default、trusted same-process权限、disabled observation、no sandbox/timeout与 non-Bun project使用边界。

## Verification

- [ ] 2.1 运行 Project Definition envelope、missing `scheduler` / `maxParallel`、unknown scheduler field、unsafe/non-positive `scheduler.maxParallel`、loader/import/error/selection/gate/help/trust/init/direct+task binding和 provenance/fingerprint的最窄 tests。
- [ ] 2.2 运行 neutral、configured fixture与 repository dogfood acceptance，证明 neutral definition和 import-free starter都使用`maxParallel: 4`、custom direct/task checks共享唯一 invocation-wide budget、built-in refs、dependency closure、applicability-time factory、records/results和 no custom cache。
- [ ] 2.3 运行 product import boundary、`bun run typecheck:product`、`bun run lint:product`、`bun run test:product` 与 `bun run test-evidence:check`。
- [ ] 2.4 运行 `bun run decisions:check`、`bun run validate` 与针对本 Change 的 `bun run change-plan -- check changes/adopt-typescript-project-definition`。
- [ ] 2.5 运行 `bun run verify:vibe-check-workspace:full` 和 full dogfood；focused search确认 active JSON/schema/dual reader、helper brand、module-load TaskPlan、custom cache和 executable data publication均已退出，且没有引入 per-Check / feature-specific concurrency budget；diff只覆盖本 Change owners。
