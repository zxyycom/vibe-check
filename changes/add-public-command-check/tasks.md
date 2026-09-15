# Tasks

按 private process lifecycle、public command Check、package delivery 和完整验收的依赖顺序实施；只有全部验证闭合后才进入 Change complete 审查。

## Readiness

- [x] 0.1 审计 active Decision、ordinary Check owner、Product/Gate process owners 与当前 async runner，固定 public fields、environment/output policy、terminal mapping、敏感材料边界和非目标。
- [x] 0.2 在修改测试前运行 `bun run test-evidence -- check --root .`，确认 current Case baseline 闭合。

## Implementation

- [x] 1.1 扩展 Product-private process contract、normalization 与 async runner，转发 Check cancellation signal 并保留 startup、exit、signal、timeout、max-buffer 与 cancellation discriminants；保持 sync runner 及既有 Git、jscpd、SCC semantics。
- [x] 1.2 在相邻 command Check owner 中实现 public types、closed constructor snapshot、preparation revalidation、working-directory/environment resolution 和 ordinary authoring fields passthrough。
- [x] 1.3 实现 command execution、fixed terminal mapping、discard policy 和固定 `process.log` 的 running/final atomic transcript lifecycle，封闭 artifact 与 write failures。
- [x] 1.4 从 `src/index.ts` 导出规定的 operation/types，并同步 public API inventory、declaration/JSDoc expectations 与 package artifact audit。
- [x] 1.5 新增 packaged command guide 和 registry-managed executable example，同步 README、navigation、package documents、changelog 与 example projections。
- [x] 1.6 扩展 installed-consumer type/runtime/documentation acceptance，证明 ordinary composition、pass/fail、cancellation/limit、artifact 和默认 public-surface canary isolation。
- [x] 1.7 新增或调整相邻 tests，并按行为 owner 更新 `docs/testing/cases/**` 的 Case Owner / Proves。

## Verification

- [x] 2.1 运行最窄 process 与 command Check tests，覆盖 hostile input、全部 terminal branches、cancellation race、transcript lifecycle、existing consumer regression 和 leak canary。
- [x] 2.2 运行 `bun run test-evidence -- check --root .`，证明修改后的 test entities 与 Case ledger 闭合。
- [x] 2.3 运行 `bun run docs:api:write` 后确认无 projection drift，并运行 `bun run typecheck`、`bun run lint` 与 `bun run validate`。
- [x] 2.4 由非实施代理基于实际 diff 审阅公开说明与内部 owner，确认用户路径、职责和安全边界与实现一致。
- [x] 2.5 运行 `bun run check -- --all`，证明 package artifact、candidate 与 installed-consumer 完整验收。
- [x] 2.6 对照 Success Criteria 复核事实，完成后将 Decision `260909-provide-public-command-check` 标记 aligned，并运行 `bun run decisions -- check`。
