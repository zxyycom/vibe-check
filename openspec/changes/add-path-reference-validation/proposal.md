> **核心句：**本 change 仅保留“检查项目文本中的 project-local path references”的未来产品方向；精确语法、规则和数据契约必须在排期实施前重新收敛。

## Why

Vibe coding 经常在说明、注释或其它文本中生成指向项目文件和目录的引用；文件移动或生成内容失真后，这些引用容易变得无效。Vibe Check 应能发现这类项目内路径问题，并以安全的 project-relative 结果帮助定位，而不是把它扩大为依赖图分析。

当前能力尚未排期，也从未实施。现阶段只需要固定产品问题、owner 和扫描边界，不应提前冻结 path grammar、allowlist、record fields、配置结构或匹配算法。

## What Changes

- 新增一个未来的内置 path reference check，检查获准文本中意图指向项目内文件或目录的引用。
- 结果只使用安全、规范化的 project-relative 信息；runner 不扫描 resolved global scope 之外的文件。
- CheckRunner 通过 `quality-records` 发布最终领域 records；`quality-checks` 管理运行与结果，Core 不解析文本路径或重判 record 语义。
- Project Definition 负责 check 的项目 authoring；具体支持的文本类型、引用语法、规则和 record contract 留待实施前重新基线。

## Capabilities

### New Capabilities

- `path-reference-validation`: 检查获准文本中的项目本地路径引用，并以安全的 project-relative 结果报告问题。

### Modified Capabilities

无。本 change 不推测性修改共享主 spec。

## Impact

- 直接依赖 `establish-check-record-core` 的 `quality-checks` 与 `quality-records` 契约，以及 `adopt-typescript-project-definition` 的 `project-definition` authoring/resolution 边界。
- 未来实现应位于 `src/product/**`，作为内置 CheckRunner 接入；支持的文本范围、引用语义、规则和测试矩阵均留待实现前审计。
- 本 change 当前只是方向性 artifact，不能据此开始实现。
