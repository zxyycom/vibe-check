# Proposal

本 Plan 在当前 ordinary Check contract 上交付严格、离线的 JSON validation default Check，并把它纳入首次公开 package。

## Why

项目中的 manifests、配置和数据文件经常因非法 UTF-8、JSON grammar 或重复 object keys 在下游才失败。当前 Vibe Check 只有代码度量 defaults，项目若要统一发现这类问题必须重复编写文件收集、解析、Record 和结果折叠逻辑。

## Outcome

Package 公开 ordinary value `jsonValidation`（`checkId = json-validation`）。它只处理当前 global scope 中的 `.json` 文件，在有界内存中严格验证 UTF-8、JSON grammar、完整消费和 decoded duplicate keys；正常完成时用 Check-local Records 报告缺陷，并以 final data 与 `passed | failed | not-applicable | unavailable` 表达完整结果。

## Scope

### Intended Change

- 新增 `JsonValidationOptions`，首版只包含 closed `maximumBytes`；`.json` eligibility固定由本 Check实现并且只能消费 global scope。
- 建立 package-private strict JSON document boundary：fatal UTF-8 decode、拒绝 BOM/comments/trailing comma/trailing content、接受任意合法 root value，并检测 decoded duplicate keys。
- 每个正常领域缺陷报告一个 stable local Record；Record data 只包含 normalized project-relative path、closed reason、JSON pointer/decoded key 与可选当前位置，不包含原始文档或 parser-native message。
- final data 固定提供 scanned/valid/invalid file counts 与 issue count；存在任一领域缺陷时 `failed`，全部有效时 `passed`，无 eligible input 时 `not-applicable`，read/decode/parser protocol failure 以受控 `unavailable` 结算。
- 公开 value/options、runtime validation、README/API example、package contract、owner docs 与语义 Cases。
- 不包含 JSONC/JSON5、formatting、canonicalization、自动修复、JSON Schema、comparison/reference、共享 policy resolver 或 Product-wide Record catalog。

### Resulting Impacts

严格 JSON document boundary 将成为后续 JSON Schema Check 的 package-private复用点；两项 Checks 仍分别拥有 options、Records、final data 和 verdict。

## Success Criteria

- 合法 object、array、string、number、boolean 与 null root 通过；非法 UTF-8、BOM、comments、trailing comma、trailing content、语法错误、超限和 decoded duplicate key 有确定结果。
- Check 只读取 global scope 中符合自身 eligibility 的 exact paths，按 lexical path 与文档顺序稳定处理，不自行遍历或恢复 excluded/generated/vendor 文件。
- Record identity 不依赖 line、column、parser wording 或原始 bytes；machine/progress/cache/log 不包含文档内容。
- Public value、options type、Definition validation、package declarations/README/isolated consumer 和 Project Gate 均包含并验证该 Check。
- 最窄 tests、Test Evidence closure、typecheck、lint、docs validation、required/full Gate 与 exact candidate preparation 全部通过。

## Affected Owners

- `docs/configuration.md`：default value、closed options 与 native composition。
- `docs/scan-scope.md`：`.json` eligibility 和 no-expansion exact-input boundary。
- `docs/quality-metrics.md`：JSON final data、Check-local Records 与 status folding。
- `docs/output.md`：通用 v4 projection 只承载 safe Check/Record data。
- `src/checks/**`、`src/definition/**`、`src/index.ts` 与 package contract/materials：实现、验证与公开 surface。
- `docs/testing/cases/**`：strict bytes/grammar/duplicates/scope/failure/public-consumer evidence。
