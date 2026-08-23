# Tasks

任务按“先固定输入与证据，再实现唯一代码源和两个消费投影，最后验证 exact installed artifact”的顺序执行。

## Readiness

- [x] 0.1 已核对 active Change portfolio 与交付顺序：本 Change 是当前下一步；Gate optimization 等待 documentation-complete artifact；publish 仍无外部操作授权。
- [x] 0.2 已从 `CURRENT_PUBLIC_CONTRACT`、candidate entry、declaration owners、Configuration 与 Output 恢复 current public inventory、稳定语义 owner 和 candidate 限制，确认本 Plan 不新增 export、不改变 Product contract。
- [x] 0.3 已固定中文主语言、JSDoc closed tag policy、README task structure、`registry.ts` typed shape、首版 source/region/evidence/target inventory、placeholder/region/JSDoc locator、operation/CLI/candidate责任与 artifact binding；没有需要实施者重新选择的方案。
- [x] 0.4 已运行修改前 `bun run test-evidence -- check --root .` 并查询相关 Cases；起点为 146/146 test entities 闭合，优先复用 `AUX-PACKAGE-CANDIDATE-001` 与 `WB-PROJECT-DEFINITION-001`，只有出现独立证明目的才新增 Case。
- [x] 0.5 已按 AI 消费契约审阅 proposal、design 与 tasks：实施者能从实际文本恢复首个修改入口、owner/投影方向、目标文件、失败边界、验证出口与暂停条件；Open Questions、讨论期候选和临时解释均已收敛，没有阻塞实施的问题。

## Implementation

- [ ] 1.1 依据 `CURRENT_PUBLIC_CONTRACT` 定位 public roots 与 consumer-visible supporting closure；在 declaration owners 中补充中文 summary 和按需 tags，确认 registry 指向的 declaration names 唯一且不存在 unmanaged `@example`，并证明 runtime/type export inventory 未改变。
- [ ] 1.2 新建 `docs/package-readme.template.md`，按 installed consumer task 写出 host/availability、安装、最小 Run、default/custom Checks、Records/dependency data、controls/effects、result handling 与不支持范围；template 只保存叙述和 closed placeholders，安装命令使用 inline code，不引入无 source/evidence 的 executable fence。
- [ ] 1.3 新建 `docs/examples/package-api/{quick-start,custom-check,typed-dependency}.ts` 与 `scripts/docs/package-api-docs/registry.ts`；按 Design 固定的四项 inventory、region markers、runtime evidence 和 typed targets，使三个完整 programs 面向 installed candidate typecheck并运行。
- [ ] 1.4 实现 `scripts/docs/package-api-docs/render.ts` 的 read-only operation、`render.test.ts` 和 `index.ts` 的薄 `--write | --check` CLI；确定性生成 source JSDoc example blocks 与 root README，拒绝 inventory/marker/target/evidence/payload/drift 错误，并把 `--check` 接入 docs validation。
- [ ] 1.5 更新 package-candidate preparation，在同一 Bun process 中直接调用 documentation operation；把全部文档 inputs 纳入 fingerprint，在 declaration emit/pack 前拒绝 stale projections，并更新 staging/manifest allowlist、tar inventory、byte audit、receipt reuse 与 installed checks。
- [ ] 1.6 更新 public-contract、CLI adapter、candidate lifecycle 和 isolated-consumer tests；从 exact inventory 验证 comments/tags，从真实 example sources 验证 generated blocks与 installed type/runtime，从 operation output 验证 root/staging/tar/installed README，并证明任一 input 变化拒绝旧 receipt。
- [ ] 1.7 按独立证明目的维护 `docs/testing/cases/**`；在 `docs/navigation.md` 与 `docs/script-tooling.md` 增加最小 package guide/documentation operation/candidate material 入口，同时保持 Configuration、Output 与 `src/product/README.md` 的 owner 边界。

## Verification

- [ ] 2.1 运行 `bun test src/product/public-contract/current.test.ts scripts/docs/package-api-docs/render.test.ts scripts/docs/package-api-docs/index.test.ts scripts/package-candidate/index.test.ts scripts/package-candidate/isolated-consumer.test.ts scripts/package-candidate/run-quality.test.ts`，验证 inventory/JSDoc policy、registry/operation/CLI、candidate lifecycle、installed docs/examples 与 runtime acceptance。
- [ ] 2.2 运行 `bun run test-evidence -- check --root .`，确认测试实体、Case owner/proves 与受支持 Bun test surface 闭合。
- [ ] 2.3 运行 `bun run format -- check`、`bun run typecheck -- product`、`bun run typecheck -- scripts`、`bun run lint -- product`、`bun run lint -- scripts`；example package imports 继续由 installed-candidate acceptance 证明。
- [ ] 2.4 运行 `bun run validate` 与 `bun run change-plan -- check changes/ship-public-package-api-documentation`，确认 documentation `--check`、generated projections、导航链接、文档格式、局部 diff 与 Change artifacts 有效。
- [ ] 2.5 运行 `bun run verify:vibe-check-workspace:required`，证明 documentation-complete candidate 仍通过当前正式 Project Gate；完整 Gate optimization/full evidence 由下游 Change 刷新。
- [ ] 2.6 在 2.1–2.5 通过后写出 `package-api-documentation-handoff.md`，记录 exact inputs/projections、public inventory、tag coverage、receipt/fingerprint、artifact identity、tar/installed byte evidence、consumer/validation results 与失效条件，再重跑目标 Change 和 docs checks。
