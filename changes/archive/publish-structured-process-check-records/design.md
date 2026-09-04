# Design

本设计只将已有稳定工具协议投影为 Project Gate 私有 Records，并继续由 Core 统一呈现 Records。

## Context

`scripts/project/gate/checks/process/**` 当前负责一次 child execution、启动与 settled transcript、four-state outcome 和通用 `command-failure`。`lint-product`、`lint-scripts` 与 `format-check` 通过同一通用入口执行。实测 oxlint 的 `--format=json` 提供 JSON diagnostics；oxfmt 的 `--list-different` 只输出待格式化路径。Bun test、tsgo、Git 与 ast-grep 没有本 Change 可直接使用的同等稳定结构化失败协议。`docs/script-tooling.md` 规定 raw child output 只能留在 Check-owned transcript，且 Core 负责 Record preview。

## Goals / Non-Goals

- Goal: 仅为 oxlint 与 oxfmt 创建 owner-specific、closed-parser failure projection，并保留一次 process execution 和现有 transcript 顺序。
- Goal: 在所有详细 Records 已完整构造且安全验证后才发布，任何不完整或不安全输入退回通用 failure。
- Goal: 用入口、adapter 与 regression tests 证明 Records、fallback、路径授权和无泄漏边界。
- Non-Goal: 消灭子进程、解析 Bun/tsgo/Git/ast-grep 人读文本、改变 timeout/cancel/unavailable、改变成功结果或把 child text 交给 Core。

## Decisions

### Intended Change

保留一个 shared process execution base，并新增两个 owner-local structured failure projector：

1. oxlint 使用 `--format=json`，只投影通过完整 JSON schema、workspace-contained canonical path、正位置与 closed severity/rule 验证的 diagnostics。
2. oxfmt 使用 `--list-different`，只投影属于 `workspaceFormatTargets` 的 canonical relative paths。

owner-published path 只允许 ASCII `[A-Za-z0-9._/-]+`；oxlint rule 只允许 lowercase identifier、最多一段 `/` 与一层 `(...)`。因此 `:`、`@`、`?`、`#`、`=` 不能进入 data 或 identity。2026-09-04 对安装的 oxlint 1.78 的 syntax-diagnostic probe 证明 label 可以只有 `{ span }`；`label` 因而可缺失或为 string，但从不投影；不能验证 rule 的 syntax output 继续 fallback。

每个 projector 都必须在 Record publication 前构造、排序、去重并验证**完整** safe 集合。只有这一步成功，才替换单条 generic failure Record；其余 nonzero 或 parser failure 仍由 base 生成 generic Record，全部工具文本只留在 settled `process.log`。Core 已拥有 default Record preview，adapter 不建立第二套 preview。

### Resulting Impacts

- `scripts/development/lint.ts` 与 `format.ts` 以 typed owner invocation metadata 公开 protocol selection 与 authorized inputs；generic process adapter 不得根据 command 或 args 猜测工具。
- `scripts/project/gate/checks/process/**` 在 settled transcript 成功之后、generic failure fallback 之前提供可组合的 nonzero-result hook；原有 success-data parser 与 unavailable mapping 保持独立。
- Gate definition/process entry 显式选择两个 owner adapter；其余 20 个直接或特殊 process Checks 的入口与行为不变。
- `docs/script-tooling.md`、测试 Case 与测试证据声明 fixed safe fields、禁止 raw message/help/child output，并证明 complete-or-fallback 原子性。
- `publish-owner-structured-process-check-records.md` 承接相关长期取舍；完成后核对它与 current fact 的 alignment。

## Risks / Trade-offs

工具版本升级可能改变 JSON 或 path-list shape。严格拒绝未知、混合或越界输入会损失本次详细定位，但保留已知可信的 generic failure、transcript 与失败 status，优先避免错误或敏感 Records。Record identity 不能使用原始工具消息；这降低文字细节，但与持久化安全边界一致。

## Open Questions

无。本 Change 的稳定协议、范围与安全边界已由当前任务确认；Bun JUnit 的 XML parser 是否值得引入留给独立后续 Change。
