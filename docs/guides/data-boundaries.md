# 安全 materialize JSON 与闭合数据快照

当项目需要从已解析但不可信的配置、缓存或外部数据形成稳定 identity、evidence 或严格字段 grammar 时，可直接使用
package root 的数据边界 helper。它们不依赖 Check、Project Definition 或 Run，也不替代调用方的领域字段验证或提供
通用安全沙箱。

选择边界时，`canonicalizeJsonValue` / `canonicalizeJsonObject` 用于 detached、deep-frozen 的 canonical JSON；
`snapshotExactClosedRecord` / `snapshotClosedArray` 只关闭外层 shape，返回 shallow-frozen container。前者的失败返回
`undefined`，`canonicalJsonText` / `canonicalJsonBytes` 对无法 materialize 的输入抛出 `TypeError`；不要用 snapshot 代替
深层可信数据或稳定序列化。

## 最小用法

```ts
import {
  canonicalizeJsonObject,
  canonicalizeJsonValue,
  canonicalJsonBytes,
  canonicalJsonText,
  snapshotClosedArray,
  snapshotExactClosedRecord,
  type CanonicalJsonObject,
  type CanonicalJsonPrimitive,
  type CanonicalJsonValue
} from "@zxyycom/vibe-check";

const parsedHeader: unknown = { kind: "bundle", version: 1 };
const header = snapshotExactClosedRecord(parsedHeader, ["kind", "version"] as const);
if (header === undefined || typeof header.kind !== "string" || typeof header.version !== "number") {
  throw new TypeError("Expected a closed bundle header.");
}

const parsedFiles: unknown = ["src/index.ts", "src/cli.ts"];
const files = snapshotClosedArray(parsedFiles);
if (files === undefined || !files.every((file) => typeof file === "string")) {
  throw new TypeError("Expected a dense list of file paths.");
}

const version: CanonicalJsonPrimitive = header.version;
const identity = canonicalizeJsonObject({ files, kind: header.kind, version });
if (identity === undefined) throw new TypeError("Expected canonical object identity.");
const objectIdentity: CanonicalJsonObject = identity;
const evidence: CanonicalJsonValue | undefined = canonicalizeJsonValue({ objectIdentity });
if (evidence === undefined) throw new TypeError("Expected canonical JSON evidence.");

const identityText = canonicalJsonText(evidence);
const identityBytes = canonicalJsonBytes(evidence);
if (
  identityText !==
    '{"objectIdentity":{"files":["src/index.ts","src/cli.ts"],"kind":"bundle","version":1}}' ||
  new TextDecoder().decode(identityBytes) !== identityText ||
  !Object.isFrozen(evidence)
) {
  throw new Error("Expected one frozen deterministic identity.");
}
```

## Canonical JSON

`canonicalizeJsonValue(value)` 将输入 materialize 为 detached、deep-frozen `CanonicalJsonValue`；`canonicalizeJsonObject(value)` 额外要求顶层是 object，并返回 `CanonicalJsonObject`。二者失败返回 `undefined`，适合由调用方决定错误消息或降级路径。

`canonicalJsonText(value)` 和 `canonicalJsonBytes(value)` 对相同边界执行 materialization 后分别返回无空白 text 与 UTF-8 bytes；无效输入抛出 `TypeError`。object key 按当前实现的 lexical `<` 顺序输出，`-0` 被 materialize 为 `0`。这是本 package 的稳定 identity 格式，不是外部 canonical-JSON 标准、Unicode normalization、认证或 secret protection 承诺。

canonical input 只接受 null、boolean、string、有限 number、标准 dense array，以及 `Object.prototype` 或 null-prototype object。它拒绝 `undefined`、非有限 number、function、symbol、bigint、cycle、accessor、non-enumerable own property、sparse array、额外 array own key 与不支持的 prototype。helper 不调用 getter 或 `toJSON`；但反射 Proxy 可能执行其 trap，trap 的副作用不属于本 API 的隔离保证，反射失败只会使 materialization 失败。

`CanonicalJsonPrimitive`、`CanonicalJsonValue` 与 `CanonicalJsonObject` 是返回值的 supporting types。它们是 structural types：把任意值标注为这些类型不等同于已经过 runtime materialization。

## 闭合快照

`snapshotExactClosedRecord(value, keys)` 只接受 key 集合恰好等于 caller 提供稳定 string list 的 non-array plain/null-prototype record；所有 own property 都必须是 enumerable data property。缺 key、多 key、accessor、non-enumerable property 或反射失败时返回 `undefined`。用它先关闭外层 grammar，再逐字段检查类型、范围与跨字段规则。

`snapshotClosedArray(value)` 只接受使用 `Array.prototype` 的 dense array，拒绝 sparse hole、额外 own key 与 accessor；失败返回 `undefined`。用它取得外层 list 后，仍由调用方检查每一个 item。

两个 snapshot 的返回 container 都只是 frozen **浅** snapshot：嵌套 object/array 不会被复制、deep-freeze 或 canonicalize，`-0` 也不会被规范化。需要 detached evidence 或稳定序列化时，应在领域验证后调用 canonical helper，而非把 snapshot 当作可信深层数据。

## 适用边界

这些 helper 不解析 JSON text、不定义 schema、不选择错误模型，也不提供 signing、authenticity、remote sharing、secret storage 或 filesystem containment。调用方先选择自己的 JSON parser、字段 grammar 与失败处理；本 API 只提供 materialization 和外层 shape 的明确边界。
