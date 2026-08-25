# Design

本设计用显式 registry/binding、package-private strict JSON value 和受控 2020-12 resolver，把 JSON
Schema 保持为独立、确定的 default Check。默认离线，但不把常见已知 schema 或项目显式授权的 HTTPS
引用错误地等同于任意网络访问。

本文只保存本 Change 的实施交接；当前稳定规则分别由
[`Configuration`](../../docs/configuration.md)、[`Scan Scope`](../../docs/scan-scope.md)、
[`Quality Metrics`](../../docs/quality-metrics.md)、[`Output`](../../docs/output.md) 与受控引用 Decision
拥有。若本文件与这些 owner 冲突，以 owner 为准。

## Context

当前 source 有 `duplicateDetection`、`fileMetrics`、`functionMetrics` 和 `jsonValidation` 四个 default
values。`jsonValidation` 的 strict JSON helper 已落地在 `src/checks/json-validation/strict-document.ts`；
它在 valid branch 返回 private JSON value，且已完成 Change 与验证材料保存在
[`changes/archive/add-json-validation/`](../archive/add-json-validation/)。本 Change 只复用该 document
boundary，不读取 `jsonValidation` final data，也不建立 Check runtime dependency。

当前 Product 已支持 ordinary Check-owned options、Record reporter、four-state result、resolved global file
scope 和统一 scheduler；它没有 shared schema registry、network authorization、comparison/reference 或 private
cross-Check snapshot。`ajv@8.20.0` 已在仓库依赖树中，首版把它提升为 Product installed runtime dependency，
选择 `ajv/dist/2020.js` entry，并以 Bun consumer、license/material 和 resolver tests 证明闭包。

首发检查集合及本 Check 的受控网络边界由
[`allow-controlled-json-schema-reference-sources.md`](../../docs/decisions/allow-controlled-json-schema-reference-sources.md)
确认。

## Goals / Non-Goals

**Goals**

- 让 schema resources 和 instance bindings 完全显式、可验证、可复现。
- 复用同一 strict JSON document semantics，并隔离 engine-native API/errors。
- 以 Check-owned closed policy 控制 local、bundled 与 explicit allowlisted HTTPS resolution。
- 让 public identities、Records、final data 与日志始终不含 raw URI/credential/document material。

**Non-Goals**

- 不自动发现 schema、不从 `$schema`/filename 推断 binding。
- 不公开 Ajv、compiled validator、schema AST、resolver 或 generic validation service。
- 不支持 `$dynamicRef`/`$recursiveRef`、Ajv `$async` schema、相对 external reference、任意 loader callback、
  credentials/headers、redirect、私有 registry、持久 remote cache、自定义 format/plugin API、
  cache/comparison/reference 或 shared file overrides。

## Decisions

### Intended Change

1. 采用一个 ordinary `jsonSchemaValidation` Check，而不是把 schema validation 塞入 `jsonValidation` 或
   建立 shared validator service。两者只共享 strict document helper。
2. 采用 Check-level `schemaIdentity` 三选一配置，默认 `require-match`；不能按 schema 混合身份规则。
3. 采用默认离线、package-known catalog 和显式 allowlisted HTTPS 的分层 resolver；Check options 是唯一的
   网络授权者。
4. 采用 private fixed 100-Record display cap 与 truthful final-data metadata；截断不改写失败语义。
5. 采用 Ajv 2020-12 private adapter，移入 production dependency；native errors 只在 adapter 内存中存在。

#### Closed authoring shape

```ts
interface JsonSchemaValidationOptions {
  readonly maximumBytes: number;
  readonly schemaIdentity: { readonly mode: "require-match" | "configuration-authoritative" | "document-authoritative" };
  readonly referenceResolution:
    | { readonly mode: "offline" }
    | { readonly mode: "allowlisted"; readonly sources: readonly JsonSchemaReferenceSource[] };
  readonly schemas: readonly { readonly id: string; readonly path: string }[];
  readonly bindings: readonly { readonly id: string; readonly instancePath: string; readonly schemaId: string }[];
}

type JsonSchemaReferenceSource =
  | { readonly kind: "bundled"; readonly catalog: "json-schema-2020-12" }
  | { readonly kind: "https"; readonly id: string; readonly origin: string; readonly pathPrefix: string };
```

All records and arrays are exact/dense. `maximumBytes` is a positive safe integer. Authoring `schema.id` and
HTTPS source `id` are unique, safe absolute identifiers (`https:` or `urn:`; no fragment, query, userinfo or
credential); binding IDs are non-empty safe labels and unique. Paths are lowercase `.json`, normalized
project-relative paths without absolute, `.`/`..`, backslash or empty segments. Schema paths are unique;
bindings use declared schema IDs and may not duplicate an `(instancePath, schemaId)` pair.

`offline` has no `sources`; `allowlisted.sources` is a non-empty dense closed array. A bundled source names only
the fixed `json-schema-2020-12` catalog and appears at most once. An HTTPS source has a unique ID, exact
`https:` origin without userinfo/query/fragment, and a normalized absolute URL path prefix. The runtime never
fills omitted nested defaults or reads environment/Run Controls to alter this policy.

#### Exact inputs and document boundary

The callback derives only one immutable work plan from `collectScanFiles(root, project.files)`. Declared schema
and instance paths outside that resolved global scope become safe `out-of-scope` domain issues; they are never
read from disk. With zero bindings, no document is read and the Check is `not-applicable`. Otherwise every
declared schema and each binding instance is passed through `readStrictJsonDocument`; valid results supply the
private JSON value to the adapter. Unbound schemas may be registered and are still checked once work exists.

The strict helper owns byte limit, BOM, fatal UTF-8, strict JSON grammar and duplicate-key semantics. It never
leaks source text, AST, parser diagnostics or absolute paths. Its `unavailable` result maps to Check
`unavailable`; its closed document issue maps to a failed domain issue.

#### Schema identity and references

`schemaIdentity` is chosen once per Check:

| Mode | Root requirement and engine identity |
| --- | --- |
| `require-match` (default) | Root `$id` must be a string equal to `schemas[].id`; that ID is the engine root. |
| `configuration-authoritative` | `schemas[].id` is the engine root; an object root gets a private compile copy with that `$id`, while a boolean root uses the configured identity directly. |
| `document-authoritative` | Root `$id` must be a string and is the engine root; `schemas[].id` remains the unique safe authoring label used for binding and public output. |

Schema identity failures are safe `schema-compile` issues. Public facts always use the authoring ID, never a raw
document `$id` or external URI. Local registered schemas may refer to one another through the selected engine
identities. `$dynamicRef`/`$recursiveRef`、Ajv `$async` schemas, and an external relative `$ref` are rejected before engine
compilation. The policy walks schema-bearing positions only: annotation payloads and data property names such as
`$ref` remain ordinary JSON data. `format` retains JSON Schema 2020-12 annotation behavior; the first release does
not install or load a format assertion plugin. A missing or unapproved reference is a safe compile issue rather
than an ambient lookup.

The package-fixed `json-schema-2020-12` catalog is available without a request. An explicit HTTPS source is
eligible only after local and bundled lookup fail and its full fetch URI has the configured exact origin and path
prefix. The private adapter uses `GET`, `credentials: "omit"`, `redirect: "manual"`, no custom headers, a fixed
timeout and response byte limit, one active fetch at a time, and invocation-local de-duplication. It accepts only
strict JSON schema documents. Authorization/resolution/document failures become safe schema failures; a timeout,
DNS/network error, 5xx or cancellation makes the owning Check `unavailable`. No tests contact a real remote host.

#### Issues, Records and settlement

The only domain issue kinds are `schema-document`, `schema-compile`, `instance-document` and
`keyword-violation`. Records contain only their applicable authoring schema ID, binding ID, normalized project
path, sanitized instance pointer, allowlisted keyword and closed reason. Engine messages, `schemaPath`, raw URI,
response/document bytes, absolute paths and stack traces are discarded.

Stable Record IDs derive from a normalized semantic key (kind, authoring IDs, safe path/pointer, keyword/reason
and ordinal), after authoring-order processing; native wording, line/column and engine error order do not
participate. The Check retains and reports at most **100** domain issues per invocation. It still validates every
processable binding and increments `issueCount` for every detected issue. `reportedIssueCount` is the number
published as Records, and `issuesTruncated` is true exactly when the cap omits at least one Record. Truncation is
display metadata only: it never changes final status or substitutes a synthetic issue.

Normal final data is:

```ts
{
  schemaCount,
  bindingCount,
  validBindingCount,
  invalidBindingCount,
  blockedBindingCount,
  issueCount,
  reportedIssueCount,
  issuesTruncated
}
```

`not-applicable` applies to zero bindings. A normally completed Check is `passed` iff `issueCount === 0`; otherwise
it is `failed`. A schema document/compile/scope issue blocks every dependent binding and contributes to the
appropriate counts without inventing keyword violations. Cancellation, local document I/O failure, engine protocol
failure or authorized-source transport failure is `unavailable` and does not publish partial final data.

### Resulting Impacts

- `json-validation` and this Check share a private document boundary, not Check results. Any helper change reruns
  both owner test suites.
- The selected Ajv entry and every engine upgrade must re-prove 2020-12 behavior, identity policy, no ambient
  network, redaction, Bun compatibility and package closure.
- Check-owned `referenceResolution` is the only authorizer of remote schema access; Product Core/Gates/Run
  Controls do not gain network power.

#### Implementation Entry

1. Extend the strict helper valid result with a private frozen JSON value and prove `jsonValidation` behavior stays
   unchanged.
2. Add exact Definition validation and immutable normalization for the authoring grammar.
3. Add a private async 2020-12 adapter/resolver, then the ordinary Check value and safe settlement layer.
4. Add fixtures/Cases and synchronize stable owners, public inventory, package/runtime dependency and isolated
   candidate consumer.
5. Run focused behavior/package tests, Test Evidence, Decision/Change checks and required/full workspace Gates.

## Risks / Trade-offs

- JSON Schema reference semantics are broad. Restricting dynamic and external-relative forms reduces compatibility,
  but keeps source authorization, identity and error redaction auditable in the first release.
- All-errors validation can discover many violations. The fixed cap prevents unbounded public output while the true
  count and failed status preserve the assessment result.
- Allowlisted HTTPS intentionally adds asynchronous work and transport availability states. Default offline projects
  retain deterministic no-network behavior, and tests use fakes rather than external hosts.
- A `configuration-authoritative` private compile copy avoids `$id` aliases but makes the configured root ID the
  base for relative local references; this is explicit authoring behavior rather than an engine accident.

## Open Questions

None block implementation. The remaining work is to prove the chosen grammar, resolver and settlement contract in
source tests, semantic Cases and the package candidate.
