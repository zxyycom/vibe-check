# Tasks

任务先固定跨 Check 不变量与长期决策，再完成三项局部采用、公共材料和完整验证。

## Readiness

- [x] 0.1 已盘点全部 package file collection consumers，确认 Product-owned eligibility filter 只存在于 function-metrics、JSON validation 与 Markdown Link；backend output omission 与 JSON Schema 授权范围不属于本 Change。
- [x] 0.2 已读取 Scan Scope、Quality Metrics、Configuration、Coding Style、相关 Decisions 与语义 Cases，并完成修改前 Test Evidence 281/281 闭合。
- [x] 0.3 已建立并激活 selected input reconciliation 长期 Decision，修订公共 baseline 被所有 Check 原样物化的旧判断。

## Implementation

- [x] 1.1 让 project-files resolution 支持 Check-owned precise default selection，同时保持公开 baseline、显式替换与冻结边界。
- [x] 1.2 在 functionMetrics 对账 selected/accepted/rejected paths，发布 area-aware non-blocking rejection Findings，并限制 Lizard handoff。
- [x] 1.3 在 jsonValidation 对账 selected/accepted/rejected paths，发布 rejection Findings，并更新 final counts、parser 与 messages。
- [x] 1.4 在 markdownLinkValidation 对账 selected/accepted/rejected paths，发布 rejection Findings，并更新 mixed settlement、final parser 与 messages。
- [x] 1.5 同步 public exports/inventory、repository Gate precise Markdown selection、owner 文档与 Decision alignment。

## Verification

- [x] 2.1 增补并运行三项 Check、project-files 与 Gate 目标测试，覆盖 default、explicit broad、mixed、all-rejected、zero selected、overlap、blocking 与 unavailable 边界；最终目标测试 26/26 通过。
- [x] 2.2 审阅并更新受影响语义 Cases；最终 Test Evidence 以 84 个 Cases 覆盖 286/286 tests，typecheck、lint、format、docs、Decision 与 Change 检查均通过。
- [x] 2.3 运行 required workspace verification 与 full Gate；最终 full Gate 36/36 Checks 通过，实际 Gate Records 没有默认范围引入的 `input-rejected` 噪声。
