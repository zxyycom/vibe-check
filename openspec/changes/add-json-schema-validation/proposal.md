> **核心句：**本 change 保留“通过显式 schema binding 离线校验 JSON Schema 与实例”的未来产品方向；具体 dialect、engine 与公共数据契约留待前置能力落地后的实现审计，当前不得实施。

## Why

合法 JSON 不等于满足项目的数据契约。项目需要明确说明哪些 schema 约束哪些实例，并在本地检查 schema、引用和实例问题，而不是依赖文件名猜测或运行时消费者失败后才发现问题。

## What Changes

- 新增 JSON Schema 领域 Check，只处理 Project Definition 中显式声明的 schema 与 instance bindings。
- 校验过程复用或对齐 `add-json-validation` 最终建立的严格 JSON 与位置能力，但 schema 语义仍由本 feature owner 负责，Core 不理解 JSON Schema。
- 引用解析必须保持 offline 与 local-safe，不因 `$ref`、dialect 元数据或缺失资源隐式访问网络，也不得越过批准的项目资源边界。
- dialect、compiler/validator dependency、binding declaration shape、record fields、解析算法、比较、缓存和测试矩阵推迟到实现前审计。

## Capabilities

### New Capabilities

- `json-schema-validation`: 对显式绑定的 JSON Schema 与实例提供本地、安全且可定位的契约校验。

## Impact

- 领域实现 owner 是 `src/product/**` 中的 JSON Schema Check、binding resolver 与私有 validator boundary。
- 直接依赖 `establish-check-record-core`、`adopt-typescript-project-definition` 与 `add-json-validation` 的已实施契约。
- 不修改共享配置、主 specs 或代码；`tasks.md` 1.1 完成前不得进入实现。
