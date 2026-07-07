本 tasks 清单把 `add-scan-scope-file-collection` 拆成可执行实现步骤；目标是在不实现具体质量指标的前提下，让 `vibe-check scan` 基于真实项目文件集合生成 scan scope report。

## 1. Owner 文档与导航

- [x] 1.1 新增或更新 scan scope owner 文档，记录 Core 文件收集职责、默认排除、supported file 分类、ignore 规则处理、generated/vendor/cache 路径边界、recoverable diagnostic 与 fatal failure 规则。
- [x] 1.2 更新 `docs/navigation.md`，让文件收集、scan scope 和 scope 验证入口指向 scan scope owner 文档。
- [x] 1.3 检查 `docs/architecture.md` 和 `docs/scanner-dependencies.md` 是否需要只读引用或摘要同步；如需要，保持 owner 边界不重复定义规则。
- [x] 1.4 用 `docnav outline` 或等价方式检查新增/更新文档结构，并用局部 diff 确认只改目标范围。

## 2. Scope 模型与依赖

- [x] 2.1 添加 `ignore` workspace dependency，并保持 Rust dependency 边界与 `docs/scanner-dependencies.md` 一致。
- [x] 2.2 定义 Core 内部 scan scope 模型，至少表达 collected ordinary files、supported files、unsupported files 和 collection diagnostics。
- [x] 2.3 定义 MVP supported file classifier，覆盖 `.rs`、`.ts`、`.tsx`、`.js`、`.jsx`、`.py` 和 `.go`，并避免把 unsupported file 当作 diagnostic。
- [x] 2.4 定义默认排除目录基线，至少覆盖 `.git`、`target`、`node_modules`、`.venv`、`dist`、`build`、`vendor`、`generated`、`.cache` 和 `cache` 路径组件。

## 3. 文件收集实现

- [x] 3.1 用 `ignore` 实现 project root 递归文件收集，并只向 Core 模型输出 Vibe Check 自己的归一化路径和诊断。
- [x] 3.2 实现默认排除和 supported file classification，确保 excluded files 不进入 `scope.file_count` 或 `scope.supported_file_count`。
- [x] 3.3 实现 `.gitignore` 或支持的 VCS ignore 规则处理，并用 fixture 证明 ignored files 不计入 scope。
- [x] 3.4 实现 recoverable collection diagnostics，使可恢复 walk/ignore 问题生成 `partial` report、diagnostic record 和 diagnostic count。
- [x] 3.5 实现 fatal collection failure 映射，使已归一化且已接受的 project root 上无法初始化 collector 或无法产生 report data 的 collection failure 返回 scanner fatal error，且不写 stdout report。

## 4. Report 集成

- [x] 4.1 将默认 scan execution 从 fixture-only report 接入真实 scan scope report，并让默认 CLI 输出 `run.mode = scanner`。
- [x] 4.2 用真实 scope counts 填充 `scope.file_count` 和 `scope.supported_file_count`，保持 `metrics.supported_scanner_findings = 0` 直到后续 scanner adapter change。
- [x] 4.3 保持 warning list 为空、gate passed、退出码 `0`，除非发生 scanner fatal 或 output failure。
- [x] 4.4 保留测试用 fixture/runtime seam，避免 CLI/output contract 测试必须依赖真实文件系统之外的 scanner adapter。
- [x] 4.5 确认 human output 和 JSON output 仍从同一 report data 投影，且不新增 schema 字段。

## 5. 测试与验证

- [x] 5.1 新增 unit 或 integration fixture 覆盖普通文件计数、supported file count、unsupported files、默认排除目录、generated/vendor/cache 路径和 `.gitignore`。
- [x] 5.2 新增 diagnostic fixture 覆盖 recoverable collection diagnostic 和 fatal collection failure；必要时使用 collector seam 避免依赖平台权限差异。
- [x] 5.3 更新 CLI contract tests，使默认 scan 不再断言 `Mode: fixture` 或 `file_count = 0`，而是断言 scanner-backed scope report。
- [x] 5.4 运行 `cargo fmt`、`cargo clippy --all-targets --all-features` 和 `cargo test --all`。
- [x] 5.5 运行 `openspec validate add-scan-scope-file-collection --type change --strict --no-interactive`，并在涉及 docs 时运行对应 `docnav outline` 验证。
- [x] 5.6 用局部 diff 确认实现只改 scan scope 文件收集相关 docs、spec、代码和测试范围。
