# Tasks

任务先关闭 public defaults 与 parser/dialect/data-contract 的证据门，再以最小 private boundary 实现标题规则，最后同步 package、owners 和完整验证。

## Readiness

- [x] 0.1 已按当前 ordinary Check/options/Record/scope contract 重建范围，并将首版缩小为四项确定 heading rules。
- [x] 0.2 已用 Structure/Link 场景检验公约数：只共享 private parser implementation 与共同 fixtures，不共享 policy、Records、final data、verdict 或 runtime handoff。
- [ ] 0.3 在修改测试前运行 `bun run test-evidence -- check --root .`；用一个不进入产品的 fixture spike 比较 parser candidates 的 Bun compatibility、license、CommonMark/GFM behavior、front matter、UTF-8 decoding、source ranges 和 installed-runtime conditions，并形成可审阅 selection matrix。
- [ ] 0.4 关闭 Design D1–D4：确认 public defaults；选择并记录 parser/dialect/shared-model/data/limit contract；同步 proposal/design/tasks。若选择形成跨 Change 的长期方向，先按 `decision-records` 流程建立或演进对应 Decision；未关闭的 public question 不进入 Implementation。

## Implementation

- [ ] 1.1 在 D2/D3 关闭后，新增共同 dialect/source-range fixtures，并实现 bounded `bytes -> normalized Markdown document` private boundary；只输出 v1 已确认的 facts，封装 dependency AST，不建立 cache 或 cross-Check handoff。
- [ ] 1.2 在 D1/D4 关闭后，新增 `markdownStructureValidation` value、closed options/runtime validation、global exact-input filtering、四项 heading rules、safe Records、final counts、limit handling 和四态 result。
- [ ] 1.3 同步 public exports/contract、Configuration/Scan Scope/Quality/Output、README/JSDoc/examples、production dependency/license 和 isolated installed-Bun consumer。
- [ ] 1.4 新增或更新 Structure semantic Cases；保留 Link 将来扩展相同 private parser module 的路径与共同 fixtures，但不实现任何 Link public behavior。

## Verification

- [ ] 2.1 运行 dialect/front matter/UTF-8/code/Unicode/rule/default/options/scope/limit/failure 最窄 tests，并在测试改变前后完成 Test Evidence closure。
- [ ] 2.2 运行 product typecheck、lint、目标 tests、docs/package candidate、dependency/license audit 与 installed Bun acceptance。
- [ ] 2.3 运行 required/full Gate；复核没有 prose measurement catalog、第二 parser、未确认的 shared facts、scope expansion、cross-Check handoff、cache 或未声明 public surface。
