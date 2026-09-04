# Proposal

本 Change 要让 Project Gate 的 native validation failure 发布 owner-owned 详细 Record；默认终端只显示同一事实集合的有界预览。首要场景是可直接定位的 Markdown 本地链接错误。

## Why

在本 Change 的起点，`Documentation path existence validation` 发现坏链接后，Gate 只保留 `docs-links-validator-invalid`、数量和重跑命令。`validateDocs` 已发现具体链接，但 native docs adapter 丢弃了它们。四个 docs validator、Decision Records 与 semantic Test Evidence 也有同样的 aggregate loss；ast-grep version mismatch 则没有 Record。开发者不能从这次 `RunResult`、machine evidence 或默认 progress 取得可修复的具体项，只能另行读取 stderr 或私有文件。

## Outcome

验收后，四个 native docs Checks、Decision Records、semantic Test Evidence 和 ast-grep version mismatch 会把每条 owner 批准的安全诊断发布为一个 Check-local Record。Record 是完整事实；默认终端只按 owner 提供的顺序预览前十条安全文本。单条过长会标记 `truncated`，余项会给出准确的 omitted count；预览不会截断 Record。docs links 为每个缺失本地链接发布 typed diagnostic，至少包含 repo-relative source/target、line、column 与 occurrence。既有 failed/unavailable/aggregate 语义、normal quality Finding Records，以及 external-command transcript/private-output policy 不变。

## Scope

### Intended Change

- 将 private `scripts/project/gate/checks/process/native-operation.ts` 的失败输入改为 owner 提供的、已排序的安全 diagnostics（stable local ID、object data、presentation text）。adapter 为每项报告一个 Record，并从同一集合生成有界终端预览。
- 让 `docs-json-validator`、`docs-schema-validator`、`docs-example-validator` 与 `docs-links-validator` 消费该输入。docs workflow 对可预期的 validation failure 返回 typed diagnostic collection；links 在一次扫描中收集每个 missing local-link occurrence 及其定位事实。
- 为 Decision Records、semantic Test Evidence 与 ast-grep version mismatch 分别建立 owner-local safe projection。generic adapter 不推断其 Check-local ID、data、排序或 presentation。Test Evidence 的 process-derived 或 untrusted text 只能使用安全投影；无法安全投影时结算 unavailable。
- 补齐 workspace/CLI、Gate Check、machine Record/readback 和 progress-preview 测试与 Case evidence，并同步受影响的 stable owner 文档。

### Resulting Impacts

- `scripts/validation/documentation/**` 的 task result、CLI reporting contract、links provider 及直接相关测试改为 typed safe diagnostics。unexpected 或 unsafe fault 仍 fail closed，不能伪装为普通 failed diagnostic。
- `scripts/project/gate/checks/**`、`definition.test.ts` 与 ast-grep/Test Evidence adapter tests 证明：Record data 完整且 Check-local；preview 有界且不影响 aggregate/status；native operation 不创建 transcript。
- `docs/script-tooling.md`、`docs/testing/cases/repository-tooling.md` 及受影响的 Test Evidence Case mappings 只记录当前实现已经证明的 native diagnostic evidence。测试正文或 Case 文字变化时，按 `test-evidence-review` 维护闭合。
- machine v4 schema、generic Record contract、package public API、process transcript contract、repository-quality Finding behavior 和 `package-api-documentation` task 不属于本 Change；独立的 progress duration display 也不属于本 Change。

## Success Criteria

1. 多个坏 link 的 docs fixture 使 `docs-links-validator` 为每个 occurrence 发布唯一 Check-local Record。每个 Record data 都有 repo-relative source/target、line、column 与 occurrence；machine output 读取同一完整集合。
2. 四个 docs validator、Decision Records、semantic Test Evidence 和 ast-grep version mismatch 各有可验证的 failure path，不再只发布 `{ code, count }` aggregate。普通 nonzero external-command Check 仍只引用私有 transcript，不含 raw stdout/stderr。
3. Records 保留完整安全事实。terminal preview 与 optional progress tee 只显示 owner 排序的前十条安全 diagnostics；第十一条及以后产生准确 omitted count，过长单条明确 `truncated`。preview 不改变 failed/unavailable、Check final data、effective aggregate 或 machine ordering。
4. docs direct validation CLI 对 typed expected diagnostics 默认将可定位的安全文本写到 stderr 并以非零退出。in-process Gate docs validation 不直接写 console，不能在 Product-owned TTY running region 混入未登记输出。
5. targeted tests、`bun run test-evidence -- check --root .`、docs validation、typecheck/lint、`bun run check` 以及 Change/Decision checks 均通过；stable owner docs 与 Case evidence 同实现一致。

## Affected Owners

- `docs/script-tooling.md#documentation-validation-and-package-material`：documentation workflow、root validate CLI、native docs Gate checks 与 process-evidence boundary。
- `docs/quality-metrics.md#check-and-record-facts`、`docs/output.md`：既有 Check-local Record/machine readback invariants 的依赖边界；generic shape 不变。
- `docs/testing.md`、`docs/testing/case-maintenance.md` 与 `docs/testing/cases/repository-tooling.md`：changed tests、semantic Cases 和 closure evidence。
- `docs/decisions/`：本 Change 的长期 Decision、派生索引，以及 alignment review 所需的实现与验证证据。
