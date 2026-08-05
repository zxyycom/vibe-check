本 tasks artifact 仅规划 strict JSON capability 的后续实施；阻塞审计完成前不得执行任何实现任务。

## 1. 阻塞审计

- [ ] 1.1 **BLOCKING：实现前审计。** 在修改源码、tests、docs、schemas、examples、dependencies 或配置前，确认 `standardize-quality-capability-contract` 与 `add-file-policy-overrides` 已分别完成审计和实施；逐项核对本 change 的 proposal/design/specs/tasks 都围绕开头核心句，capability ID `json-validation` 与 modified `scan-configuration` 符合命名/owner 规则，exact-input、`FindingRecord`/generic `FindingEvidence`、final JSON check-specific key/kind/required/order/redaction catalog、sorted public catalog/`semanticRegistryFingerprint`、immutable machine v2 schema bytes、config v2 common check patch、`ResolvedFilePolicy`、`explain-config`、explicit-baseline-only与`regressions ⊆ changed`、cache hooks 对齐其最终 contract；确认 artifacts 没有把临时 change 表述为已批准/可直接实现、没有越过 change 目录预先修改长期 owner/其它 change、`## Open Questions` 无未回答项；审计 parser 候选的 strict JSON/duplicate-key/token span、Bun compatibility、license、维护与1..67108864 resource budget证据并记录选型。任何一项未闭合即修订/重审本 change，**本项完成前不得执行 2.1 及之后任何任务**。

## 2. 测试证据与配置契约

- [ ] 2.1 在改测试前按项目 `test-evidence-review` 流程运行 `bun run test-evidence:check` 并查询 scan-configuration、scan-scope、finding/output、scanner-adapter 相关 Cases；为 JSON config、parser、selector、comparison/cache 与 CLI acceptance 明确 Proves/Owner，先写最窄失败测试。
- [ ] 2.2 扩展 common semantic config v2 source：optional-but-complete `checks.json.{enabled,maximumBytes}`、`maximumBytes` inclusive 1..67108864、只能 patch 已声明 base section 的 closed partial override、neutral规范贡献`true/5242880`、registry-owned semantic check IDs、mapping与`explain-config` trace；用negative tests证明缺失不补默认、partial section/patch-without-base失败、v1 hard cut、unknown/backend fields、0/negative/non-integer/>64MiB失败且override不扩大global scope。
- [ ] 2.3 同步 Product-owned runtime/derived types、neutral default、init/editor projection、canonical config example、external fixture 与 configuration docs，并运行 generation/drift checks证明同一 source；不得建立 JSON-only merge/default/schema owner。

## 3. Strict JSON document boundary

- [ ] 3.1 实现 internal bytes-to-document boundary：fatal UTF-8、leading BOM rejection、RFC 8259 grammar、任意 root value、complete consumption 与 immutable parsed value/token-to-pointer location index；不暴露 parser-private AST/error。
- [ ] 3.2 实现每个object scope decoded-key duplicate detection与deterministic normalized findings；common primary location报告second key，`jsonPointer`与`firstDefinition:location`按catalog投影；覆盖escaped-equivalent keys、Unicode/multibyte、CRLF、nested scopes与deep input budget。
- [ ] 3.3 实现 binary/`maximumBytes` unsupported-input、read/execution/invalid-result failure分流与all-or-nothing per-capability normalization；用测试证明zero findings/parse findings为`succeeded`，read/internal failure为`failed`且partial findings不进入channels。

## 4. Capability planning, comparison and cache

- [ ] 4.1 注册 `json-validation` descriptor/semantic check IDs与request predicate；测试quick、section缺失、effective enabled全false均`skipped`，full下base或in-scope override有效启用才运行selector且空集`no-input`；selector只消费normalized inventory与`ResolvedFilePolicy`，排除Vibe Check JSONC、generic JSONC、global-excluded/generated paths，并证明JSON eligibility不扩大code-metric inputs或root traversal。
- [ ] 4.2 将current与explicit baseline接入同一rules/policy snapshot，定义content finding deterministic order、changed scope与regression fingerprint；覆盖line/offset movement、pointer/member identity、syntax bounded-context与omitted-baseline behavior。
- [ ] 4.3 实现single-file cache projection与payload validation，key包含rules/policy/content/internal implementation identity并排除report/artifact/sibling settings；证明trans-revision精确复用、relevant invalidation且execution failure不缓存。

## 5. Output, acceptance and owner synchronization

- [ ] 5.1 在descriptor注册三个JSON check及其typed evidence key/kind/required/order/redaction catalog，将common primary locations/evidence经foundation single mapper接入machine v2、human report、console、acceptance与gate；更新sorted public catalog expected `semanticRegistryFingerprint`、canonical examples、catalog/artifact validators与consumer fixtures，并以双向exact drift test证明fingerprint按预期改变而published/runtime canonical v2 schema bytes/URI不变，不创建JSON schema branch、second serializer或numeric pseudo-metric。
- [ ] 5.2 增加formal Product CLI acceptance：quick/missing/disabled skipped、enabled empty no-input、valid object/array/scalar、zero findings、syntax/BOM/UTF-8/duplicate/unsupported findings、execution failure、current/baseline与gate；确认stderr/stdout、trusted artifacts与process outcome符合shared contract。
- [ ] 5.3 更新 Architecture、Configuration、Scan Scope、Quality Metrics、Output与导航中唯一owner段落，明确strict JSON/Vibe Check JSONC/formatting exclusion、exact inputs、状态、comparison/cache和backend-neutral边界；同步测试Cases并运行完整`bun run test-evidence:check`。

## 6. Verification

- [ ] 6.1 依次运行最窄JSON/config/cache/output tests、product import boundary、typecheck、lint与product tests；再运行`bun run validate`和`bun run verify:vibe-check-workspace:required`，修复全部范围内失败。
- [ ] 6.2 用malformed/adversarial fixtures执行资源与位置复核，确认adapter没有root traversal、JSON path不自动进入code metrics、output不含absolute path/backend字段，并用局部diff与`git status --short`确认只改计划范围。
- [ ] 6.3 重新运行`openspec validate add-json-validation --type change --json --strict --no-interactive`，核对所有spec scenarios有执行证据、依赖/迁移文档完整；只有实现和验证均完成后才勾选本任务集并进入归档评估，未经明确要求不归档。
