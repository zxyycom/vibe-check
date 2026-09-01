# Design

本设计把缓存拆成 caller-owned semantic identity 和 Product-owned local JSON mechanics。公共 helper 不判断 key 是否正确，也不接管使用 cached value 的 Check 或项目代码。

## Context

现行 `src/package-checks/duplicate-detection/cache/**` 将 jscpd backend、exact input、scanner configuration 和 raw fragment parser 组合成 Check-local cache。该实现证明本地 JSON reuse 有价值，也证明失效规则和 payload 解释必须留在 consumer；它当前直接写目标文件，且不是 package-root public capability。

新 consumer 已把依赖/hash 产出明确放在项目侧。共同责任因此只剩：稳定定位 entry、验证 untrusted disk payload、miss 后执行 computation，以及不暴露 partial file 的 publication。Project Run 无需知道 cache key、命中状态或 payload。

数据流固定为：

```text
caller identity + parser + compute
              │
              ▼
       cacheJsonByKey
       ├─ validate input
       ├─ derive identity digest
       ├─ read + validate envelope + parse payload ── hit ──► typed value
       └─ miss/invalid/read-failed
                  └─ compute ── canonical snapshot ── parse ── atomic write
                                                        └────► typed value
```

## Goals / Non-Goals

**Goals**

- 让 caller 只需提供完整 key、payload parser 和 computation，即可获得跨 invocation 的本地 JSON reuse。
- 让 hit 和 computed 路径经过相同 payload grammar与 parser。
- 让 cache storage failure 可观察但不把成功 computation 改成业务失败。
- 保持 identity、payload domain、adoption policy 与 Check settlement 在 caller owner。

**Non-Goals**

- 不发现文件、AST、module graph、environment 或 tool dependencies。
- 不缓存整个 Check，不跳过 Check execution，不重放 Records/messages/outcome/duration/side effects。
- 不缓存 binary artifact、stream、class instance、function、symbol、BigInt 或 cyclic object。
- 不提供 default directory、ProjectDefinition/RunControls option、cache context capability 或 Product-wide manager。
- 不提供 TTL、LRU、quota、cleanup、remote backend、distributed consistency、lock 或 single-flight。
- 不把 SHA-256 digest 当作 secret protection 或 hostile shared-cache integrity proof。

## Decisions

### Intended Change

#### 1. Public contract

目标 TypeScript shape 为：

```ts
interface CacheJsonByKeyOptions<T extends object> {
  readonly compute: () => unknown | Promise<unknown>;
  readonly directory: string;
  readonly key: string;
  readonly namespace: string;
  readonly parse: (value: unknown) => T;
  readonly version: string;
}

type CacheJsonByKeyResult<T extends object> =
  | Readonly<{
      source: "cache";
      read: "hit";
      write: "not-attempted";
      value: T;
    }>
  | Readonly<{
      source: "computed";
      read: "miss" | "invalid" | "failed";
      write: "stored" | "failed";
      value: T;
    }>;

function cacheJsonByKey<T extends object>(
  options: CacheJsonByKeyOptions<T>
): Promise<CacheJsonByKeyResult<T>>;
```

Unknown option fields are rejected. `directory` must be absolute, non-empty and U+0000-free；`namespace`、`version`、`key` must be non-empty strings. Text is not trimmed or case-folded: author bytes are identity. Functions are trusted callbacks but helper only calls `parse` at the defined validation points and `compute` after a non-hit read.

`value` is exactly the parser result for a detached canonical payload snapshot；the result envelope is frozen. Parser ownership includes the returned domain type and any stronger readonly guarantee. `compute` returns unknown so runtime validation, rather than TypeScript assertion, owns cache safety.

#### 2. Identity and on-disk envelope

Identity uses a stable JSON object with fixed field names and order-independent canonical serialization:

```json
{
  "cacheApiVersion": "caller-keyed-json-v1",
  "namespace": "<caller namespace>",
  "payloadVersion": "<caller version>",
  "key": "<caller key>"
}
```

SHA-256 of those canonical bytes becomes a lowercase hex digest and the only caller-derived filename component: `<directory>/<digest>.json`. Stored JSON uses one closed envelope：

```json
{
  "cacheFormatVersion": "caller-keyed-json-v1",
  "identityDigest": "<lowercase sha256 hex>",
  "payload": {}
}
```

Envelope rejects unknown fields and does not store namespace、payload version or raw key；their identity is already committed by `identityDigest`. Raw-key absence is covered by a canary test.

Directory is an explicit trusted target, not a project-relative grammar or sandbox. The helper creates it when writing but does not clear it, enumerate unrelated entries or follow a project-root containment policy.

#### 3. Read and validation state machine

Read classification is closed：

| Observation | Condition | Next action |
| --- | --- | --- |
| `hit` | target is readable JSON, envelope matches identity, payload is canonical object, parser accepts | return parsed value；do not compute or write |
| `miss` | target does not exist | compute |
| `invalid` | malformed JSON, wrong/unknown envelope, identity mismatch, noncanonical payload or parser rejection | compute and replace if write succeeds |
| `failed` | target exists but another filesystem read failure occurs | compute；write may independently succeed or fail |

Parser exceptions during disk read are cache invalidation evidence and are not returned to the caller. The same parser exception after computation is a computation contract failure and is propagated；otherwise an invalid cached value could conceal an invalid current computation.

#### 4. Compute and publication state machine

After a non-hit read, call `compute` exactly once. A throw/rejection or cancellation propagates without publishing. A returned candidate is detached through the existing canonical JSON-object boundary, then passed to `parse`; only that accepted snapshot can become result value and cache payload.

Publication creates a unique temporary file in the target directory, writes the complete closed envelope, closes it, and atomically renames it to the digest target. Failure removes the temporary file best-effort and returns `write: "failed"` with the already accepted computed value. The utility does not log、throw or mutate Check facts solely because storage failed.

Concurrent callers do not coordinate computation. Each caller first attempts the same atomic rename. If rename fails because another writer has created the target, the current caller discards its temporary file only after re-reading the target through the complete envelope、identity、canonical-payload and parser boundary；valid target counts as `stored`, invalid/unreadable target counts as `failed`. Other rename failures also count as `failed`. A reader must never open a temporary name as the target.

#### 5. Ownership and security

Caller key correctness is a precondition, not a helper verdict. Documentation requires the key to change with every input that can change compute output, including caller implementation/version、options、toolchain and declared external state. Helper behavior remains correct as a key/value mechanism if the caller violates this rule, but the caller's cache result may be stale.

Cache bytes are untrusted until envelope and parser acceptance, while the directory itself is a trusted local state boundary. An attacker who can replace valid cache bytes can still supply any payload accepted by caller parser；the helper provides no authenticity. Raw secret、credential、token or low-entropy sensitive value must not be used as key because its digest remains observable and guessable.

#### 6. Existing cache and Product boundaries

`cacheJsonByKey` lives in a new independent `src/cache/**` owner and is exported only from the package root. It does not import Project Run、Definition、Check settlement、machine output or package-check owners.

Duplicate detection is not migrated in this Change. Its write failure currently participates in its Check-owned unavailable semantics, while the public helper deliberately preserves successful computation；forcing migration would conflate different failure policies. A later consumer may reuse mechanics only if it preserves its domain owner and observable behavior.

### Resulting Impacts

- Package documentation gains one focused custom-Check cache example; no new root docs owner is required.
- Internal filesystem helpers may be reused only when their error and atomicity contract matches this public boundary；direct non-atomic `writeJsonFile` is insufficient for publication.
- Machine schema and Check final data do not gain cache fields. Consumers that want a cache message or Record must derive it explicitly from the returned observation.

## Risks / Trade-offs

- Caller-provided keys maximize applicability but cannot prevent stale results from incomplete identities；the API makes ownership explicit instead of claiming automatic correctness.
- Always computing after a cache read failure preserves business availability but can hide degraded reuse unless callers inspect observations；closed `read`/`write` fields keep that degradation observable.
- No cleanup allows unbounded accumulation across changing keys；the directory is documented as disposable and caller-managed rather than adding an unevidenced eviction policy.
- No lock can duplicate expensive computation under concurrency；it keeps cancellation and cross-process state out of v1 while atomic publication preserves valid bytes.

## Open Questions

无。payload kind、input grammar、identity、observations、failure behavior、atomicity、security boundary and non-goals are fixed by the accepted direction.
