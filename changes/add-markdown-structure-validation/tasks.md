# Tasks

任务先确认 parser与共同 document boundary，再实现标题规则、public surface和首版 candidate证据。

## Readiness

- [x] 0.1 已按当前 ordinary Check/options/Record/scope contract重建范围，并将首版缩小为四项确定 heading rules。
- [x] 0.2 已用 Structure/Link 场景检验公约数，只共享 private parser-neutral document facts，不共享 policy、Records或 verdict。
- [ ] 0.3 运行 Test Evidence起点检查并用 fixture spike审计 parser候选的 Bun、license、GFM/front matter/source-range/link extraction与 installed-runtime条件。

## Implementation

- [ ] 1.1 先新增共同 dialect/source-range fixtures，再实现 bounded bytes→normalized Markdown document boundary。
- [ ] 1.2 新增 `markdownStructureValidation` value、options/runtime validation、exact-input filtering、四项 heading rules、safe Records、final counts与四态结果。
- [ ] 1.3 同步 public exports/contract、Configuration/Scan Scope/Quality/Output、README/JSDoc/examples、dependency/license与 isolated consumer。
- [ ] 1.4 新增或更新 semantic Cases，并为 Link Change保留同一 private document implementation。

## Verification

- [ ] 2.1 运行 dialect/front matter/code/Unicode/rule/options/scope/limits/failure最窄 tests与 Test Evidence closure。
- [ ] 2.2 运行 product typecheck、lint、tests、docs/package candidate和 installed Bun acceptance。
- [ ] 2.3 运行 required/full Gate，复核没有 prose measurement catalog、第二 parser、越界 inputs或未声明 public surface。
