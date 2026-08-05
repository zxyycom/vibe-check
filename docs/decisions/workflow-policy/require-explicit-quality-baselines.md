---
title: 质量比较只接受显式基线
status: archived
alignment: null
createdAt: 2026-08-04T07:18:16Z
purpose: 让质量比较和阻断结果始终绑定到调用者明确选择且可复现的代码基线。
background: 自动选择上一代码提交无法可靠表达分支或发布比较目标，并可能让同一最终提交因历史形状不同得到误导性门禁结果。
decision: 省略 baseline 的扫描只生成当前快照；只有显式 baseline 才启用比较，comparison gate 缺少它时在扫描工作前失败。
relations: []
---

## 目的
- 让 `changed`、`regressions` 和对应 gate 的比较对象由调用者明确拥有，避免产品从本地历史、远端名称或分支形状猜测验收基线。
- 让一次 invocation 使用并记录同一个不可变 baseline commit，保证报告、cache、artifact 和失败诊断可以复现。

## 背景
- 自动 previous-code baseline 只能描述相邻历史，不等价于分支目标、merge base 或发布基线；规范提交位于代码提交之后时，最终 gate 甚至可能不再评价该代码提交引入的回归。
- `origin/main`、upstream、默认分支和 merge base 在 fork、浅克隆、detached HEAD 与不同本地 Git 配置中都不可可靠推断。
- 非阻断 scan 的主要价值是当前质量观察；调用者没有选择比较对象时，生成全量当前快照比伪造 changed/regressions 语义更诚实。

## 决策
- 采用: 省略 baseline 的 quick、full 和 `all` gate 只扫描当前输入，不自动选择 previous-code、nearest-code、merge-base、upstream 或远端分支。
- 采用: 只有显式 `--baseline <revision>` 启用 baseline materialization、comparison、changed 和 regressions 语义；产品在扫描、cache 和 artifact work 前把 revision 解析一次为不可变 commit SHA，并在本次 invocation 中只使用该 SHA。
- 采用: `changed` 与 `regressions` gate 缺少显式 baseline 时作为 pre-work request error 失败；不得以 baseline unavailable、空 comparison 或自动推断继续评价。
- 采用: `quality:full-check` 保持非阻断当前快照；repository `quality:gate` 由调用者显式附加 baseline revision，wrapper 不拥有远端或分支推断逻辑。
- 不采用: 保留 `--with-baseline` 或在 comparison gate 中隐式启用 auto-detection。
- 不采用: 在 Product 或 dogfood wrapper 中硬编码 `origin/main`、默认分支、upstream 或 merge-base 规则。
