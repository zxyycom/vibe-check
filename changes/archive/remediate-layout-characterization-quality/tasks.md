# Tasks

按入口、三个 sibling owner 和分层验证顺序完成 layout characterization remediation；focused quality 已验收，默认 required Gate 仍单独待运行。

## Readiness
- [x] 0.1 核对 Change、脚本工具、编码规范、测试策略与现有 layout Case，记录 Test Evidence closure 和 45 条 focused quality 基线。

## Implementation
- [x] 1.1 将 TypeScript module-specifier parse、既有 diagnostics 与 specifier views 迁入 `module-specifier-analysis.ts`，保持结果语义。
- [x] 1.2 将 ordinary import-boundary rules、relative resolution 与 fixture exclusion 迁入 `import-boundaries.ts`，不改变 policy。
- [x] 1.3 将 function-metrics analyzer private-boundary rules 迁入 `function-metrics-analyzer-boundary.ts`，保持 private port 与 public-entry restrictions。
- [x] 1.4 保留入口的 validation 顺序和 aggregated error contract，并审阅 diff 与 Case mapping 连续性。
- [x] 1.5 为 required adapter consumer 保留独立 AST value-import predicate，避免 syntax-error analysis view 改变既有 boundary 结果。

## Verification
- [x] 2.1 运行 target layout characterization test 与 Test Evidence closure。
- [x] 2.2 运行 scripts typecheck、lint、format check 与本 Change 的机械 check。
- [x] 2.3 运行 focused quality，以完整 stable Record set 比较 45→41：四个目标 ID 消失、零新增，且没有 waiver、threshold 或 selection exclusion 变更。
- [x] 2.4 运行“有效 adapter value import 后接 syntax error”组合回归：保留 syntax diagnostic，且不出现 `function-metrics-required-adapter-import` false positive；随后重跑质量比较。
- [x] 2.5 运行默认 `bun run check`，记录 required Gate 的完整 status 分布；它不能由 focused quality 成功推断。
