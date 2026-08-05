本临时且未审计的 change proposal 目标是在所有批准文本输入中安全检测秘密，并以不含秘密原文的 finding 与 coverage evidence 参与质量观察和门禁。

## Why

现有 file、function、duplicate 指标无法发现误提交的凭据、令牌或私钥等高影响内容风险；如果直接复用现有数值 warning、缓存或 raw-output 路径，又可能让检测本身成为新的泄露渠道。

## What Changes

- 新增 tool-neutral 的 `secret-detection` capability，对 current 与显式 baseline 的全部批准文本 exact inputs 执行规则检测，而不是只扫描 Markdown。
- Secret finding 只公开稳定产品规则 ID、项目相对位置、完全不依赖 secret bytes 的稳定 occurrence 指纹和脱敏证据；同一 structural occurrence 的 secret rotation/line movement 不制造 regression，新 occurrence 才获得新 identity。检测到的秘密原文不得进入 fingerprint input、console、report、machine artifact、stream、raw artifact、cache、错误、trace 或日志。
- secret acceptance / allowlist 只按稳定指纹、项目相对路径或 glob、产品规则 ID 等安全身份匹配，并要求理由；不提供 secret value、substring、regex 或 message-text matcher。
- 明确 generated、vendor、binary、oversized、unreadable 与无效文本输入边界；`maximumFileBytes`固定为`1..67108864`且neutral为`1048576`。Oversized input只读取Product-owned 8192-byte classification prefix：prefix能证明NUL/invalid UTF-8时归non-text，否则保守产生可由安全allowlist处理且可阻断的`secret-scan-coverage` finding，绝不全读来证明suffix是text或交给detector。
- 三个disposition使用line-independent file subject与path/metric semantic order发布generic machine-v2 observations；coverage finding按closed typed catalog发布`actualBytes`/`maximumFileBytes`，secret security finding使用empty evidence。Message不承载必需机器语义，任何evidence都不含raw secret bytes。
- 将 secret finding 接入 current、显式 baseline、changed、regressions、gate 与 completeness；dependency、执行或 normalized-result 失败产生 incomplete evidence，不能发布“未发现秘密”的可信结论。
- **BREAKING**：依赖 `add-file-policy-overrides` 的 single-active public config v2 hard cut 增加 closed、tool-neutral 的 secret check 与安全 allowlist 字段；v1 file-backed input 在 scan work 前拒绝，不提供 dual reader、宽松吸收或 partial merge。
- 本 change 依赖 `standardize-quality-capability-contract` 提供通用 Finding/Observation/typed evidence、capability-specific exact inputs 及 completeness/gate/output 集成，并依赖 `add-file-policy-overrides` 提供 config v2 per-file patch；feature 只向 foundation catalog 注册 capability/check/metric/evidence semantics，使 expected `semanticRegistryFingerprint` 与 examples/validator fixtures更新，但不修改 immutable machine v2 schema bytes。

## Capabilities

### New Capabilities

- `secret-detection`：定义批准文本输入、secret rule/finding、脱敏、稳定身份、allowlist、comparison、gate、completeness 与失败语义。

### Modified Capabilities

- `scan-configuration`：在 config v2 中加入 closed、tool-neutral 的 secret check/allowlist 字段，并保持 neutral default、完整文档、selection、init 与 hard-cut 规则一致。
- `scanner-dependencies`：加入不向 public config 暴露实现名称或命令的 secret detector dependency slice、失败归一化和 cache/raw-material 安全边界。
- `test-fixtures`：增加只使用合成假秘密的 secret detection、脱敏、allowlist、scope、comparison、gate 与 dependency-failure 证明矩阵。

## Impact

- Product Config/runtime schema/editor projection/canonical example 将由依赖 change 建立的 v2 owner 扩展 secret-specific fields；v1 只作为 unsupported migration source，不继续成为 current reader。
- Product Core、scan scope 分类、secret detector adapter、dependency snapshot、finding comparison、gate、human/machine output 与 CI consumer 都需要在 foundation contract 上接入新 capability。
- 测试与 fixture 必须只使用明确标记的合成占位秘密，并审计limit endpoints、bounded prefix/full-read、observation order、typed evidence以及 stdout、stderr、artifacts、cache、raw material 与失败路径中不存在原文。
- 不新增 secret-specific CLI flag，不把 detector/library/executable 名称写入 public config，也不授权本 proposal 阶段修改源码、主 specs 或长期文档。
