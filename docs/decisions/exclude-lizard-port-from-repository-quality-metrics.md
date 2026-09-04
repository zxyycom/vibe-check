---
title: 将 Lizard 私有 port 整目录排除出仓库质量指标
status: active
alignment: aligned
createdAt: 2026-09-03T16:38:02Z
purpose: 让 Lizard source-aligned port 以专用一致性证据维护，而不接受会推动非忠实重构的通用仓库质量指标。
background: 精确 translated-path 例外仍让同一 upstream-sync 目录中的 façade、内部测试和支持文件产生普通复杂度与重复提示。
decision: 保持私有 port 边界，并将 analyzer 整目录排除出仓库 duplicate、file 与 function metrics，同时保留其它验证。
tags:
  - dependency-policy
  - product-contract
  - repository-automation
  - workflow-policy
relations:
  - type: 修订
    target: isolate-lizard-port-behind-check-private-interface.md
---

## 目的

- 让固定上游版本的 Lizard TypeScript port 以 source identity、oracle、deviation 和边界证据维护，不因通用复杂度、行数或重复提示产生非忠实重构压力。
- 保持 Function Metrics 的 Product policy、资源安全、Worker、Check 和公开契约位于 port 外，并继续接受普通项目质量审查。

## 背景

- `src/package-checks/function-metrics/analyzer/**` 是一个整体 upstream-sync owner：translated core/readers/shared/extensions、唯一私有 port façade、同目录 fidelity tests、oracle fixtures 和 development-only harness 共同维持该边界。
- 前序决策只允许按 provenance 精确排除 translated targets，并要求 façade、tests 和其它同目录文件继续进入 repository metrics。实际 Gate 因而持续对同一 source-aligned owner 产生 file/function/duplicate Finding；这些指标不能区分忠实翻译、独立语言 oracle、host seam 与普通 Product code。
- TypeScript parse/type/build、format/lint、source identity、oracle/parity、processor/extension lifecycle、deviation、provenance/license、import boundary 和行为测试已经提供更直接的可证伪证据。排除 repository metrics 不应删除或弱化这些验证。

## 决策

- 采用: `src/package-checks/function-metrics/analyzer/**` 继续是 Check-private 的 Lizard source-aligned port。port root 的 façade 是唯一目录外 production entry；目录外 Product adapter 是 façade 的唯一 production consumer。port 不拥有文件选择、资源限制、Worker、cancellation、Check settlement、Record、Finding、waiver 或 final data，也不成为 public API 或 plugin framework。
- 采用: repository Gate 的 `duplicateDetection`、`fileMetrics` 与 `functionMetrics` 对 `product-source` 统一排除 `src/package-checks/function-metrics/analyzer/**`。该排除覆盖 translated source、手写 façade、port-internal tests、development harness 和 fixtures；不再维护按 rule 或 translated target 枚举的例外清单，也不为被排除内容生成这些三项 Check 的 Finding 或 waiver。
- 采用: 该范围只属于本仓库 Gate 的质量 file selection，不改变三个 package Check 的公共默认值，也不排除 analyzer 目录的 format、lint、TypeScript parse/type/build、source identity、oracle/parity、processor/extension lifecycle、deviation mapping、provenance/license、private import boundary 或行为测试。
- 采用: `src/package-checks/function-metrics/analyzer-adapter.ts`、Worker、measurement、target selection、Check execution 和其它 port-root 外 Product source 继续接受普通 repository duplicate/file/function metrics。调查资源只按其既有 archive/resource 规则处理，不因本决策获得新的全局免检。
- 采用: 每次调整 Gate selection 时，repository-quality configuration test 必须证明三项 metric Check 使用同一个整目录 glob、目录内代表路径均不被选择、目录外 Product 边界仍被选择；专用 analyzer 验证继续独立证明 source-aligned 行为。
- 不采用: 从 provenance ledger 在运行时动态生成 Gate selection、为全部第三方或大型目录建立通用免检规则、用整目录排除绕过 package/public/import/license 验收，或把 port internals 移到目录外规避 source-alignment owner。
