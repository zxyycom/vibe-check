本 proposal 仅为离线 Markdown 链接分类和本地验证锚定临时变更范围，尚未完成实现前审计或获准实现。

## Why

本临时 change artifact 的目标是让产品离线、确定性地分类并验证 Markdown 链接中的本地目标与锚点，而不是把现有脚本 regex 规则误作产品能力。网络可达性、重试和 HTTP 结果属于独立 change，不能混入本次行为。

## What Changes

- 新增解析 inline、reference 与 image links 的产品能力，并对同文档锚点、项目内目标和跨文件锚点进行本地验证。
- 定义 external URL、mailto、其它 scheme、绝对/越出项目根路径的离线分类和可观察 finding，且不发出网络请求。
- 定义链接目标的 URL 解码、query/fragment 拆分、slug 方言、symlink 与 root escape 的确定性处理。
- 为三个stable checks固定finding codes与closed typed evidence；local/anchor findings以source和实际target组成causal path set，任一命中changed scope即可进入changed。
- 向`add-network-link-validation`交付精确只含sourcePath/linkKind/classification/safe scheme-host-port-path-query-key shape/ordinal/semantic identity的external candidates；location与raw/full URL分别只留在identity-keyed bounded ephemeral lookups，且不进入candidate、log、cache、artifact或public DTO。
- 本 feature 自行注册 stable capability/check IDs、optional complete `checks.markdownLinks` config-v2 fragment、neutral contribution、profile/request semantics 与 overrideable leaves；依赖 `standardize-quality-capability-contract` 的 registry/finding/output 挂点和 `add-file-policy-overrides` 的 typed patch/resolution，且不依赖 `add-markdown-structure-validation` 的阈值语义。

## Capabilities

### New Capabilities
- `markdown-link-validation`: 对受批准 Markdown 输入执行离线链接分类、本地目标验证与锚点验证。

### Modified Capabilities

- `scan-configuration`: 组合 optional complete `checks.markdownLinks` section、neutral contribution、稳定 check IDs 与 override metadata，而不修改 required core sections。

## Impact

- 预期实现归属为 `src/product/**` 的 Core/Scanner、Config 与 Output 接点，以及对应产品测试、schema/example 与文档 owner。
- 需要 Markdown AST/parser 边界和 project-root-aware 的本地路径解析；不得把 `scripts/**` 的现有正则 validator 升格为实现。
- 不包含任何网络访问、HTTP 状态、缓存或外链可达性判断。
- `add-network-link-validation`只消费本change的sanitized external-candidate identity与bounded transient request material，不反向修改离线finding。
