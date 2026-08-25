# Proposal

本 Change 定义 `jsonSchemaValidation` 的首版交付：它复用已完成并归档的
`add-json-validation` 所落地的 package-private strict JSON document boundary，作为独立、显式的
JSON Schema 2020-12 default Check 进入首次公开 package。默认不联网；项目可以在该 Check 的闭合
options 中显式 allowlist HTTPS schema source，并使用 package 内置的已知 schema catalog。

## Why

语法有效的 JSON 仍可能违反项目约定的数据结构。项目可以直接调用 Ajv 等工具，但会重复处理
schema/instance 绑定、exact-input scope、strict document、受控 `$ref`、safe output、四态结果和
package authoring。首版不应恢复已退出的 TaskPlan、shared policy、comparison/cache 或复杂 Record
catalog；这些能力不是交付此 Check 的前提。

## Outcome

Package 公开 ordinary value `jsonSchemaValidation`（`checkId = "json-schema-validation"`）。调用方通过
closed options 显式注册 schema 文件并把 instance 文件绑定到已声明 schema；Check 只读取本次
invocation 的 resolved global scope 内这些 exact paths，以 JSON Schema 2020-12 验证，并以 safe
Check-local Records 与 final counts 表达 document、schema、reference 与 instance 缺陷。

## Scope

### Intended Change

- `JsonSchemaValidationOptions` 首版接受 `maximumBytes`、Check-level `schemaIdentity`、
  `referenceResolution`、`schemas: [{ id, path }]` 与
  `bindings: [{ id, instancePath, schemaId }]`。所有 arrays 都 dense/closed；ID、path、source、binding
  和 schema reference 的 grammar、唯一性与失败分类在本 Change 中固定。
- `schemaIdentity.mode` 为 `require-match`、`configuration-authoritative` 或
  `document-authoritative`，默认 `require-match`，且不得按单个 schema 混用：
  - `require-match` 要求根 `$id` 存在并与 `schemas[].id` 相等；
  - `configuration-authoritative` 以 `schemas[].id` 作为 engine root identity；object root 在私有 compile
    copy 覆盖 document `$id`，boolean root 直接使用 configured ID；
  - `document-authoritative` 要求根 `$id` 存在并作为 engine identity，`schemas[].id` 仍是唯一、安全的
    public authoring label。
- `referenceResolution` 默认 `{ mode: "offline" }`，只允许 local registry 与 package 固化的 known
  catalog；`{ mode: "allowlisted", sources }` 才允许额外 HTTPS source。source 必须精确声明安全 source
  ID、HTTPS origin 与 path prefix；不支持 userinfo/query、headers/credentials、redirect、环境注册表、
  任意 callback loader、持久 cache 或自动 schema discovery。
- `schemas[].path` 与 `bindings[].instancePath` 只能是 normalized project-relative `.json` paths，且必须
  精确属于本次 invocation 的 resolved global scope；Check 不因 options 中出现一个 path 而自行发现、遍历
  或读取它。
- Check 复用 `json-validation` 的 package-private strict JSON document boundary；valid branch 直接返回
  私有 JSON value，供 schema adapter 消费。两个 Checks 不读取彼此的 final data，也不共享运行结果。
- schema document、schema compile/reference、instance document 与 keyword violation 分别映射为 closed
  safe issues；Ajv/native error text、raw `$id`/`$ref`、response bytes 或 transport details 不得进入 public
  facts。
- 正常结算时，final data 固定表达 schema/binding/valid/invalid/blocked/issue/report count。每次 Check
  invocation 最多公开 100 个 issues/Records，仍完整处理可处理 bindings；截断只影响显示，`issueCount`
  保持真实总数、`reportedIssueCount` 与 `issuesTruncated` 如实说明，且任一领域 issue 仍为 `failed`。
- 同步 public value/options、runtime validation、README/API example、package runtime dependency/license、
  owner docs、语义 Cases、Gate 与 exact candidate。
- 不包含 YAML、JSONC、自动 schema discovery、任意远端 URL、download/cache、named reference comparison、
  shared file policy、generic validator registry 或 public Ajv API。

### Resulting Impacts

- 当前 `jsonValidation` 已提供并测试 strict JSON document boundary；本 Change 复用其
  bytes/grammar/duplicate-key semantics 与 private parsed value，但不建立 Check runtime dependency。
- Ajv adapter、显式 registry/bindings、identity policy、controlled resolver 与 safe error normalization 必须
  作为一个边界交付。
- 受控网络方向由
  [`allow-controlled-json-schema-reference-sources.md`](../../docs/decisions/allow-controlled-json-schema-reference-sources.md)
  固定；它取代已归档的纯离线首发判断。

## Success Criteria

- 合法 2020-12 schema 与实例通过；invalid schema/instance JSON、duplicate key、compile failure、
  missing/unapproved ref、allowlisted transport failure、keyword violation、重复 ID/路径、未知 schema
  binding 与 scope escape 都有确定、可定位且不泄露敏感内容的结果。
- 默认 Runtime 不调用 DNS/HTTP；only package-known catalog 与显式 allowlisted HTTPS source 可参与
  resolution。redirect、credentials、未授权 host/path、相对 external ref、`$dynamicRef`/`$recursiveRef` 与 Ajv `$async`
  schema 安全失败。
- Records 只含 authoring ID、normalized path、safe pointer、known keyword 和 closed reason；不含原始
  URI/userinfo/query、schema/instance bytes、absolute path 或 engine-native stack/message。
- Check 不重复实现 JSON grammar、不自行收集项目文件，也不改变 `jsonValidation` verdict；两项 Checks
  可独立组合。
- Public/package/docs/Case 证据、最窄 tests、typecheck、lint、required/full Gate 与 exact candidate
  preparation 全部通过。

## Affected Owners

- [`changes/archive/add-json-validation/`](../archive/add-json-validation/)：已完成 strict document
  boundary 的实施与验证证据；它不是本 Check 的 runtime dependency。
- `docs/configuration.md`：default value、explicit registry/binding/identity/reference options 和
  Definition validation。
- `docs/scan-scope.md`：registered schema/instance paths 必须属于 resolved global scope 的 exact-input
  boundary。
- `docs/quality-metrics.md`：schema final data、Records、cap 与 status folding。
- `docs/output.md`：safe generic v4 projection 与敏感 URI boundary。
- `src/checks/**`、`src/definition/**`、`src/index.ts` 与 package artifact/dependency owners：engine adapter、
  public surface 与 installed runtime。
- `docs/testing/cases/**`：document/compile/reference/keyword/scope/truncation/redaction/public-consumer
  evidence。
