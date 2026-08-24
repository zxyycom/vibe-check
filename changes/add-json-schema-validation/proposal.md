# Proposal

本 Plan 在严格 JSON boundary 之后交付显式、离线的 JSON Schema 2020-12 default Check，并把它纳入首次公开 package。

## Why

语法有效的 JSON 仍可能违反项目约定的数据结构。项目可以直接调用 Ajv 等工具，但会重复处理 schema/instance 绑定、scope、安全输出、四态结果和 package authoring。旧计划围绕已退出的 TaskPlan、shared policy、comparison/cache 与复杂 Record catalog 展开，规模远超首版真实需要。

## Outcome

Package 公开 ordinary value `jsonSchemaValidation`（`checkId = json-schema-validation`）。调用方通过 closed options 显式注册 schema 文件并绑定 instance 文件；Check 只读取 global scope 内的这些 paths，使用 JSON Schema 2020-12 离线验证，并以 safe Check-local Records 与 final counts 表达 schema/instance缺陷。

## Scope

### Intended Change

- `JsonSchemaValidationOptions` 首版固定 `schemas: [{ id, path }]` 与 `bindings: [{ id, instancePath, schemaId }]`；ID 使用 lower-kebab，paths 必须是 normalized project-relative `.json` 且属于 global scope。
- 复用 `json-validation` 的 package-private strict JSON document boundary，分别将 schema document、instance document、schema compile 与 instance keyword violation映射为 closed safe issues。
- 使用 JSON Schema 2020-12 engine；所有 schemas 在 work 前显式注册，禁止 remote loading、目录 discovery、ambient network、environment registry 或自动 schema inference。
- final data 提供 schema/binding/valid/invalid/issue counts；正常有任一领域 issue 为 `failed`，全部绑定有效为 `passed`，空 binding set或无 eligible work为 `not-applicable`，read/engine/protocol failure为 `unavailable`。
- 同步 public value/options、runtime validation、README/API example、package runtime dependency/license、owner docs、语义 Cases、Gate 与 exact candidate。
- 不包含 YAML、JSONC、自动 schema discovery、remote refs、download/cache、named reference comparison、shared file policy、generic validator registry或 public Ajv API。

### Resulting Impacts

JSON strict document owner、schema engine adapter、explicit registry/bindings 与 safe error normalization 必须作为一个离线边界交付；Ajv/native error text 或 raw `$id`/`$ref` 不得进入 public facts。

## Success Criteria

- 合法 2020-12 schema 与实例通过；invalid schema/instance JSON、duplicate key、compile failure、missing ref、keyword violation、重复 ID/路径、未知 schema binding与 scope escape有确定且可定位的结果。
- Runtime 不调用 DNS/HTTP，不接受 async loader；未注册 remote/local reference失败关闭，registered schema可离线互引。
- Records 只含 authoring ID、normalized path、instance pointer、keyword和closed reason；不含原始 URI/userinfo/query、schema/instance bytes、absolute path或 engine-native stack/message。
- Check 不重复实现 JSON grammar、不自行收集项目文件，也不改变 `json-validation` verdict；两项 Checks 可独立组合。
- Public/package/docs/Case证据、最窄 tests、typecheck、lint、required/full Gate与 exact candidate preparation 全部通过。

## Affected Owners

- `docs/configuration.md`：default value 与 explicit registry/binding options。
- `docs/scan-scope.md`：registered schema/instance path必须属于 global scope。
- `docs/quality-metrics.md`：schema final data、Records 与 status folding。
- `docs/output.md`：safe generic v4 projection 与敏感 URI边界。
- `src/checks/**`、`src/definition/**`、`src/index.ts`、package artifact/dependency owners：engine adapter、公开 surface 与 installed runtime。
- `docs/testing/cases/**`：document/compile/reference/keyword/scope/zero-network/public-consumer evidence。
