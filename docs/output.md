# 输出模式

本文是 Vibe Check 输出模式的主规范，固定 report data 如何渲染为人读文本和机器 JSON。

## 输出层边界

Output 只选择已产生的 report data 或 primary diagnostic 如何序列化、组织和写入通道，不改变扫描、聚合、warning 或 gate 结果。

实现应先产出 report data 或 primary diagnostic，再按 output mode 渲染。Output 不重新计算 metric、warning 或 gate，不直接暴露 scanner 原始输出。

`human` 和 `json` 共享业务语义，但不共享包装、schema 或可解析性承诺。

## `json`

用途：固定机器格式、脚本、CI、agent、调试和稳定接口校验；不以阅读体验为目标。

```text
vibe-check scan --format json
```

`json` 输出是 stdout 的唯一 JSON object。MVP envelope 包含以下顶层字段：

- `schema_version`
- `tool`
- `run`
- `scope`
- `summary`
- `metrics`
- `warnings`
- `gate`
- `diagnostics`

字段类型、必填性和枚举由 JSON schema 定义；本文只固定当前 MVP JSON 格式标识与 schema 校验边界。`metrics`、`warnings` 和 `gate` 的业务语义由 [Quality Metrics](quality-metrics.md) 定义；Output 只投影 Core report data。Schema 和 examples 首次实现时进入 `docs/schemas/` 与 `docs/examples/`，并回写本文导航。

Scanner raw output 不进入稳定 JSON envelope。需要暴露 adapter 诊断时，必须先归一化为 `diagnostics`；第三方原生 report structure 或未进入 schema 的 adapter 私有引用不属于当前 MVP JSON 合同。

格式标识与校验：

1. MVP JSON 输出的 `schema_version` 固定为 `vibe-check.report.v1`，输出必须通过该版本 owner schema 校验。
2. 当前 JSON 输出不得包含未在 schema 中声明的字段。
3. 需要改变 envelope 字段集合、必填性、字段含义、合法枚举，或暴露新的 scanner/adapter 私有引用时，必须作为后续 change 同步更新 `schema_version`、owner schema、examples、本文和测试。
4. `schema_version` 仅用于标识当前格式和选择 schema 校验材料。

验证材料：

- [JSON schema](schemas/vibe-check-report.schema.json)
- [JSON examples](examples/json/)

## `human`

用途：默认阅读输出。面向本地定位、审查和快速判断。

```text
vibe-check scan
vibe-check scan --format human
```

`human` 输出从同一份 report data 派生，至少呈现：

- summary
- metrics summary，包括 measured supported file count、aggregate line totals 和 per-language summaries
- gate result
- warning findings
- accepted 或 suppressed warnings，如果 report data 中存在
- scanner diagnostics，如果 report data 中存在

`human` 不是脚本解析接口。实现可以调整文案和排版，但不能表达与 `json` 不同的业务结论。

## Empty state

以下状态必须显式输出，而不是静默省略：

- scan scope 文件数为零。
- warnings 为零。
- metrics measured supported file count 为零。
- diagnostics 为空。

`json` 使用结构化字段表达空集合和计数；`human` 使用明确文本表达。

## 通道

- `human` scan report 写 stdout。
- `json` scan report 写 stdout，且 stdout 只包含一个 JSON object。
- Usage error、输入/config error、scanner fatal、output failure 和 report envelope 之外的顶层诊断写 stderr。
- 输入错误不向 stdout 写 scan report。

MVP 不定义独立 `ci` 输出模式。CI 默认消费 `json` 输出；未来 CI summary 或 annotation 只能从同一 report data 派生。
