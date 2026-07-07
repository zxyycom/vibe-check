本 change 定义 MVP CLI 与输出契约，并把可观察规则落到长期 owner 文档、schema、examples 和后续实现验证中。

## Why

Vibe Check 目前已经有架构、编码规范和 scanner 依赖 owner 文档，`docs/navigation.md` 也引用了 CLI 与 Output 主规范，但仓库还没有对应 owner 文件、可观察 CLI surface、退出码映射、机器输出 envelope 或报告输出契约。先定义这些契约，可以避免初始 Rust crate、scanner 接入和示例材料把猜测行为写死。

## What Changes

- 定义 MVP `vibe-check` CLI 契约，包括命令形态、路径处理、输出模式选择、配置入口、错误分类、stdout/stderr 归属和退出码映射。
- 定义 MVP 输出契约，包括 human output section、JSON envelope、schema/example owner、CI 消费边界、empty state 和格式校验边界。
- 明确 CLI 与 Output 长期 owner 文档落点，并让 `docs/navigation.md` 指向这些 owner，而不是让 OpenSpec delta 或测试 fixture 长期承接规则解释。
- 建立第一段可执行实现的最低实现与验证路径：Cargo workspace、CLI stub、输出模型、schema/example 校验和集成测试。
- 记录 scanner 具体行为不在本 change 范围内；本 change 只要求有足够归一化数据与诊断来证明 CLI/output 契约。
- 增加阻塞级实现前审计任务，确保 proposal、design、specs、tasks、开放问题和验证路径审计完成前，本 change 只是临时计划。

## Capabilities

### New Capabilities

- `cli-contract`：覆盖 `vibe-check` CLI 的稳定命令行 surface、路径/config 归一化入口、错误分类、stdout/stderr 边界和退出码映射。
- `output-contract`：覆盖扫描报告的 human output、JSON output、CI 消费边界、schema/example owner、格式校验边界和 empty-state 行为。

### Modified Capabilities

- 无。

## Impact

- 后续 Rust 实现需要建立 Cargo workspace 和 `vibe-check` CLI 入口，并遵守这里定义的契约。
- 后续 docs 改动需要新增或更新 CLI 与 Output owner 文档，并同步 `docs/navigation.md`。
- 后续测试需要覆盖 CLI 参数解析、退出码、stdout/stderr 归属、输出模式、schema/example 一致性和 empty-state 行为。
- 后续 schema 与 example 文件需要落在 `docs/schemas/`、`docs/examples/` 或明确记录的等价位置。
- 本 change apply 后会修改 docs owner 文件、导航、schema/example 和实现；proposal 只记录目标与影响边界。
