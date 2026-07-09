# Scanner 依赖选择

本文是 Vibe Check scanner 依赖选择的 owner 文档。它维护默认依赖基线，约束每个依赖的实现归属、adapter 边界、替换条件和验收要求。

本文只回答“scanner 默认使用哪些 Rust 可导入依赖，以及如何隔离它们”。指标语义、warning、gate、schema、示例和输出字段仍由各自 owner 定义。

## 目标与范围

依赖基线必须满足三项要求：

1. 以 Rust crate 或 Rust 可导入库为默认集成方式。
2. 面向主流代码库，当前首批支持覆盖 TypeScript `.ts`、Go `.go`、Rust `.rs` 和 Python `.py`；JavaScript / JSX / TSX 属于后续支持范围。
3. 支持 scanner adapter 输出 Vibe Check 自己的归一化模型，而不是把第三方结构作为 public contract。

本文适用于新增、替换、降级或重新评估 scanner 依赖。实现某个具体指标、warning、gate、输出字段或 schema 时，进入对应 owner 文档。

## 默认基线

Scanner 默认使用以下依赖：

1. `ignore`：文件收集和 scan scope 基础能力。
2. `ast-grep-core` + `ast-grep-language`：多语言结构扫描基座。
3. `tokei`：LOC、注释行、空行和语言统计 adapter。
4. `jscpd` v5 Rust engine：重复代码检测 adapter 候选。

实现 scanner 时以这些依赖作为基线。新增 feature 不重新发散依赖选择；如果编译、许可证、性能、API 稳定性或 fixture 证明某个依赖不可用，按“替换流程”处理。

## 依赖基线

| 依赖 | 实现归属 | 采用规则 |
| --- | --- | --- |
| `ignore` | 文件收集 / scan scope | 默认核心依赖 |
| `ast-grep-core` + `ast-grep-language` | Scanner adapter / structural scan | 默认结构扫描基座 |
| `tokei` | LOC metrics adapter | 默认 LOC adapter |
| `jscpd` v5 Rust engine | Duplicate scanner adapter | 默认 duplicate scanner 候选，接入前必须完成 API / 输出验证 |

使用约束：

1. `ignore` 负责递归遍历、`.gitignore`、include / exclude、hidden file 和路径过滤。不可读路径、walk error 和 ignore 解析错误必须映射为 Vibe Check 诊断。
2. `ast-grep-core` + `ast-grep-language` 负责多语言 AST / CST pattern、语言识别和 parser 接线。它不拥有质量指标、warning、gate 或输出字段语义。
3. `tokei` 负责文件数、代码行、注释行、空行和语言统计。`tokei` 的语言 taxonomy 和报告结构只作为 adapter 输入，不成为 machine output 契约。
4. `jscpd` v5 Rust engine 负责重复片段和重复率输入。Rust API 和输出稳定性通过 fixture 后才能作为默认 duplicate scanner 接入；未通过验证时 duplicate scanner 保持 unsupported diagnostic，默认检测路径只使用 Rust 可导入依赖。

## Adapter 边界

Scanner adapter 必须把第三方结果归一化为 Vibe Check 模型。允许跨 adapter 边界传递的模型包括：

- `FileMetrics`：文件路径、语言、lines、code、comments、blanks 和来源信息。
- `FunctionMetrics`：函数 / 方法位置、长度、参数数量、复杂度类指标和来源信息。
- `DuplicateFinding`：重复组、片段位置、行数、token / byte 范围、相似度或匹配类型。
- `ScannerDiagnostic`：scanner identity、版本、输入范围、跳过原因、部分失败、fatal 失败和原始摘要位置。

第三方 AST、语言枚举、原始 JSON、私有错误类型和内部配置只允许停留在 adapter 内部。Core、Output、schema 和测试 fixture 只依赖 Vibe Check 类型、稳定字段和明确错误分类。

## 替换流程

满足任一条件时，可以替换或降级依赖：

1. 依赖无法在目标平台或发布链路可靠编译。
2. 许可证、MSRV、native build、依赖体积或安全审计风险不可接受。
3. API 或输出在小版本内频繁破坏，导致 adapter 维护成本过高。
4. fixture 证明其语言覆盖、位置映射、指标语义或重复检测结果不满足 Vibe Check 契约。
5. 出现更小、更稳定或更适合多语言质量扫描的 Rust 可导入替代库。

替换必须按以下顺序执行：

1. 记录触发原因、影响范围、候选替代方案和保留现状的风险。
2. 证明新方案能保持 adapter contract，或明确需要同步哪些 Vibe Check 模型。
3. 更新本文档、adapter tests、schema examples 和 release notes。
4. 在最终说明中列出验证命令、fixture 覆盖和残余风险。

## 验证要求

首次接入或替换这些依赖时，最低验证包括：

1. 覆盖首批 supported source set：TypeScript `.ts`、Go `.go`、Rust `.rs` 和 Python `.py` 的 fixture；JavaScript / JSX / TSX fixture 只在后续支持 change 中作为 supported dependency coverage 引入。
2. 文件收集 fixture：include / exclude、`.gitignore`、hidden file、generated / vendor path。
3. LOC fixture：code、comments、blanks、empty file、mixed newline 和 unsupported file。
4. 结构扫描 fixture：函数 / 方法定位、嵌套结构、语法错误文件、UTF-8 路径。
5. 重复检测 fixture：跨文件重复、同文件重复、阈值过滤、generated / vendor 排除。
6. 诊断 fixture：工具跳过、部分失败、解析失败、fatal 失败和 raw summary 位置。
