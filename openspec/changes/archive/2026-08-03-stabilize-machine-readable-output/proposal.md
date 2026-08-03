## Why

产品已经写出 `metrics.json` 与 warning NDJSON，但这些 TypeScript artifacts 没有
current-product schemas、稳定 transport identities 或统一 acceptance predicate。仓库现有
report schema 与 examples 属于已退役 Rust 产品。当前 `quality:annotate` parser 只验证
render 所需字段、跳过 malformed records，并可能把部分有效 prefix 当作成功结果输出。

因此 automation 无法可靠区分完整 current artifact set 与 schema drift、truncated output、
mismatched warning stream 或宽松接受的 partial input。Scan completeness 与 quality gate
semantics 已由归档 changes 和主规范拥有；本 change 只稳定其 machine projection，不把这些
业务语义的 owner 移到 Output。

产品处于早期开发阶段，没有需要保留的 legacy machine consumer 或历史 artifact reader。
本 change 因此建立唯一正确的当前 contract，让 producer、schemas、examples、validators、
direct consumer、tests 与 owner docs 同时 hard cut，不提供 legacy parsing、dual write 或
migration window。

## What Changes

- Output 把 final `QualityMetrics` / `WarningRecord` 显式映射为 output-owned
  `MachineMetricsV1` / `MachineWarningV1`。显式 mapping 防止 private core fields 因
  object spread 意外公开。
- V1 field scope 以实现前的 current serialized projection semantic audit 为输入，而不是
  兼容义务；不预先采用 external-config、scanner backend port 或其它相邻 changes 拟议的
  metadata。
- Canonical filenames 保持 `metrics.json`、`warnings.ndjson`、
  `warnings-all.ndjson`。Metrics identity 为 `vibe-check.metrics.v1`；每个 embedded 或
  streamed warning identity 为 `vibe-check.warning.v1`。
- Product runtime schema definitions 统一拥有 public field constraints 与 semantic
  descriptions；DTO types、published JSON Schemas、validators 与 generated examples 都可
  追溯到该 owner。
- Machine conformance 由 strict UTF-8 decoding、positive JSON/NDJSON grammar、canonical
  schemas、warning-channel relationships、cross-artifact equality、completeness reduction
  与 `GateResult` invariants 共同定义。
- Product 通过 shallow product-owned import boundary 暴露 artifact-set validator 与
  warning-stream validator；两者共享 warning decoding、framing、schema 与 diagnostics。
- Producer 在 canonical publication 前验证 candidate bytes。Handled cleanup/write failure
  best-effort 移除 current machine set，并映射为 Product CLI exit `2`。
- `quality:annotate` 在 render 前验证完整 byte input。Valid non-empty / zero-byte streams
  退出 `0`；argument、read、decoding、framing 或 schema failure 不输出 annotation 并退出
  `2`。
- `docs/examples/artifacts/` 提供五组 deterministic、完整的 current-v1 sets 及明确的
  scenario/outcome matrix。Required validation 证明 schema/example drift、代表性失败以及
  正式 producer-to-consumer 行为。

## 产品与开发结果

- 调用方持有三个 files 与 producing invocation outcome 时，无需检查 core implementation
  details 即可判断它们是否构成 current-run evidence。
- Contract-valid set 可以表达 complete、legitimate empty、gate-failed 或
  scan-incomplete 语义；contract failure 与这些 domain outcomes 保持区分。
- Producer、published schemas、examples 与 direct annotation consumer 使用同一 warning
  shape 和 byte grammar。
- Explicit DTO projection 不变时，core fields 与 human output 可以演进而不触发 machine
  contract 变化。
- 未来真正的 machine change 执行新的显式 version cut，不通过 core refactor 意外泄漏。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `output-contract`：把当前 TypeScript machine artifacts 提升为 single-active、
  schema-validated、byte-defined、cross-artifact-consistent 的产品 contract。
- `test-fixtures`：增加 canonical current-product examples、focused contract proofs 与
  required producer-to-consumer acceptance。

## 范围与影响

受影响 owner 包括 Product Output DTO/serialization/validation、schema generation、docs
validation、`quality:annotate`、required workspace checks、tests、semantic Cases 与 owner
docs。`src/product/**` 保持唯一 runtime source owner；product runtime 不读取 `docs/**` 或
`scripts/**`。

Scanner algorithms、thresholds、warning generation、completeness、gate evaluation、config
selection、canonical filenames、Product CLI process-outcome kinds、console、`report.md` 与
raw scanner artifacts 保持既有 owner 和 semantics。

## 成功标准

- Runtime 与 independent docs validation 接受每个 canonical example set，并以 actionable
  location 拒绝 focused identity、schema、decoding、framing、channel、completeness 与 gate
  mutations。
- Product CLI 验证 final core data、只投影一个 DTO、验证全部 machine candidates，并仅在
  publication 成功后报告 canonical paths。
- `quality:annotate` 只在完整 input validation 后输出 annotations；infrastructure failure
  不输出 partial annotation，退出 `2`。
- Required workspace verification 执行 actual producer 与 direct consumer，不实现另一套
  parser 或 schema registry。
- Generated schemas/examples deterministic、checked in，并在 drift 时使 required validation
  失败。
- Owner docs 解释 public field semantics、path/order rules、identities、validator boundaries、
  set invariants、process outcomes 与 single-active version policy。
