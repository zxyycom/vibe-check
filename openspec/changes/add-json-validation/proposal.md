本 proposal 为 Product-approved JSON exact inputs 增加严格内容校验；它是临时 change artifact，尚未表示方案已审计或获准实现。

## Why

Vibe Check 当前不会判断普通 JSON 文件能否被可靠解码与解析，损坏的配置、manifest 或数据只能在下游消费者失败后才暴露。共享 content-quality foundation 与 file-policy overrides 建立后，JSON 可以作为首个格式能力复用统一输入、finding、完成状态与 gate 语义，而不重新遍历项目或混入代码指标。

## What Changes

- 新增 strict JSON capability：对 Product-approved `.json` exact inputs 检查 fatal UTF-8、leading BOM、JSON byte grammar、语法、duplicate object keys 与任意合法 root value；primary path/location 使用finding common fields，JSON Pointer、first-definition secondary location与unsupported reason使用descriptor注册的typed evidence catalog。
- 将 ordinary strict JSON 与 Product 已知的 Vibe Check JSON/JSONC document 分类分开；后者继续由 Configuration 的 comments/trailing-comma grammar 与 runtime schema owner 处理，首版不把通用 JSONC 当作 strict JSON。
- 为 common config v2 check schema 增加 optional-but-complete、closed `checks.json` base/override policy，表达 `enabled` 与 `maximumBytes`；缺失或 disabled 时 capability 为 `skipped`，只有 full profile 请求已启用 section 且没有 exact input 时才是 `no-input`。
- 复用 foundation 的 current/baseline、changed/regressions、acceptance、cache 与 immutable machine v2 finding/evidence contract；JSON catalog 注册必须更新sorted public catalog的`semanticRegistryFingerprint`及examples/validator fixtures，但不得改变canonical v2 schema bytes，JSON exact inputs不自动进入code metrics exact inputs。
- 首版不做 formatting、key ordering、canonicalization 或自动修复；这些不是语法可靠性的必要条件。

## Capabilities

### New Capabilities

- `json-validation`: 定义 strict JSON 输入资格、解析与 duplicate-key findings、精确位置、结果状态、comparison 和 cache 语义。

### Modified Capabilities

- `scan-configuration`: 在依赖 change 建立的 complete/closed semantic config v2 与 common partial check patch 中加入 optional tool-neutral JSON policy；accepted check IDs 由 Product capability registry 承接。

## Impact

- 依赖 `standardize-quality-capability-contract` 与 `add-file-policy-overrides` 先完成其 apply 前审计和实现。
- 影响 Product Core capability registry/selector、JSON parser boundary、finding normalization、baseline comparison、cache identity、human/machine output 与对应测试/fixtures。
- Public config 只引用稳定的 JSON 产品语义与 semantic check ID；不得出现 parser/backend 名称。若依赖 change 未先建立兼容的 v2 complete/closed document，本能力不得向现有 v1 偷加字段；override不得重新纳入global generated/excluded scope。
