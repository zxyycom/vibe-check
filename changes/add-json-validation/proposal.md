# Proposal

本 Proposal 是实现普通 JSON 严格验证 built-in Check 的临时计划，稳定产品事实仍由实施后同步的 owner 承接。

## Why

当前产品只在自己的配置、schema 和验证脚本边界解析特定 JSON 材料，尚不能把项目 manifest、配置和数据文件中的损坏 JSON 作为统一 Check/Record 结果报告。下游工具才暴露这些错误会延迟反馈，也迫使每个项目重复包装解析脚本。

## Outcome

Vibe Check 提供 stable `checkId = json-validation` 的 built-in Check，只处理 resolution 分配的普通 JSON exact inputs；它严格验证 UTF-8、JSON grammar、完整消费和重复 object key，使用独立 `recordTypeId` 发布安全、可定位且位置无关的 QualityRecords，并以 CheckResult 表达领域 verdict。Core 不解释 JSON，parser、资源限制、comparison 和 cache 都留在 JSON owner 的私有边界。

## Scope

### Intended Change

纳入：

- 普通 `.json` 输入的严格 UTF-8 / JSON grammar、leading BOM、任意合法 root value、完整消费和 decoded duplicate-key 检查。
- Project Definition 中的 built-in reference、JSON owner 验证的 `maximumBytes` 政策，以及文件政策对 JSON 输入资格和该上限的声明式覆盖。
- `json-syntax`、`json-duplicate-key`、`json-unsupported-input` 三个 record type 的目录、identity、位置、排序、comparison、cache、输出和测试接线。
- current 与调用者显式提供的 named reference 使用同一冻结政策，并由 JSON Check 自己产生匹配关系。

不纳入：JSONC、JSON5、formatting、key ordering、canonicalization、自动修复、JSON Schema、Project Definition 自身加载，以及让通用 Core 理解 JSON 领域规则。

### Resulting Impacts

上述 JSON Check 方案要求 exact-input ownership、strict document defects、稳定 records、comparison/cache 与 CheckRun/CheckResult 的失败边界保持一致。

## Success Criteria

- Omitted check、无合格输入、领域缺陷和执行失败分别表现为 skipped、completed/not-applicable、completed/failed result 和 failed CheckRun，不能互相伪装。
- 合法 object、array、string、number、boolean 与 null 均通过；非法 UTF-8、BOM、comments、trailing comma、非法 token、尾随非空白内容、重复 decoded key 和超限输入产生对应的 catalog-valid records。
- Adapter 不遍历 project root、不扩大 normalized inventory；JSONC 和被 JSON Schema binding 接管的路径不会被普通 JSON Check 重复报告。
- Record identity 不使用 line、column、byte offset、message 或 parser wording；输出不包含绝对路径、原始内容或 backend-private 数据。
- 显式 reference matching、单文件 cache、neutral definition、Project Definition authoring、owner 文档、测试证据及 workspace required verification 全部同步并通过。

## Affected Owners

- `docs/architecture.md`：Check/Record 接入方向、Core 与私有 parser boundary。
- `docs/configuration.md`：Project Definition、neutral definition、built-in reference 与 JSON policy authoring。
- `docs/scan-scope.md`：普通 JSON 分类、exact inputs 与 secondary ownership arbitration。
- `docs/output.md`：Check/Record catalog、QualityRecord 投影和安全输出。
- `docs/testing.md` 与 `docs/testing/cases/`：parser、identity、comparison、cache、入口与 contract 证明责任。
- `src/product/**`：唯一产品 runtime 实现 owner。
