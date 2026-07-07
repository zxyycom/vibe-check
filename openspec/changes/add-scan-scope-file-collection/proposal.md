本 proposal 定义 `add-scan-scope-file-collection` 的目标：在不实现具体质量指标的前提下，让 `vibe-check scan` 基于真实项目文件集合生成 scan scope report。

## Why

上一个 MVP CLI/output change 已经定义并实现了命令、退出码、stdout/stderr 和 report envelope，但当前 scan pipeline 仍由 fixture runtime 返回空 scope。下一步需要先建立真实文件收集和 scan scope 语义，作为后续 LOC、结构扫描、重复检测、warning 和 gate 的输入基座。

## What Changes

- 定义 scan scope 的长期能力边界，包括 project root 遍历、默认排除、supported file 识别、ignore 规则处理、generated/vendor/cache 路径边界和文件收集诊断。
- 使用 `ignore` 作为默认文件收集依赖，形成真实文件集合，并把可恢复的 walk error 或 ignore 解析问题映射为 Vibe Check diagnostics。
- 将默认 scan execution 从 fixture-only 空 report 推进为 scanner-backed scope report：`run.mode` 使用 `scanner`，`scope.file_count` 和 `scope.supported_file_count` 来自真实文件集合。
- 保持 output contract 不变：human/json 仍从同一 report data 投影，`schema_version` 和现有 JSON envelope 字段不因本 change 扩展。
- 暂不实现 LOC metrics、AST/structure scan、duplicate scan、warning policy、gate failure policy、配置发现或新的 JSON 字段。

## Capabilities

### New Capabilities

- `scan-scope`: 覆盖 Core 构造 scan scope、文件收集、文件分类、默认忽略、supported file 识别和文件收集诊断的长期契约。

### Modified Capabilities

- 无。

## Impact

- 后续实现会影响 `crates/vibe-check/src/runtime.rs`、scan pipeline、core/model 类型，以及新增的 files 或 scanner scope 模块。
- 后续实现需要新增 `ignore` workspace dependency，并用 fixture 覆盖 `.gitignore`、默认排除目录、generated/vendor/cache 路径、unsupported file 和 collection diagnostics。
- CLI surface、退出码分类和 JSON envelope 不在本 change 中改变；若实现发现需要新增输出字段，必须作为后续 output-contract change 处理。
- 本 change apply 后应新增或更新 `docs/` 下的 scan scope owner 文档，并让 `docs/navigation.md` 指向该 owner。
