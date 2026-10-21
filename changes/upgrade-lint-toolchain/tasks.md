# Tasks

按本组行为 owner 实施并共享最终验收；本轮已获准保存 Git 完成态、运行提交 hook 并正常结项。

## Readiness

- [x] 0.1 核对用户批准范围、相关 owner/Decision、现有改动和全树 Case 起点（759 entities / 188 Cases）。

## Implementation

- [x] 1.1 统一依赖 owner 完成本组版本声明、lockfile、实际安装及发布清单同步。
- [x] 1.2 验证两工具 peer 满足并解释诊断净变化，必要代码修复服从本源 owner，不扩大规则集合。
- [x] 1.3 同步稳定说明、必要 Case 和实施差异；由非实施代理反查文档影响。

## Verification

- [x] 2.1 旧版两个 scope baseline 已冻结；新版运行公开 Product/scripts lint 和相关 Gate diagnostic/tests，逐项审阅净诊断差异。
- [x] 2.2 完成范围对应 typecheck/lint、材料、Case、Change 检查及实际 diff 审查。
- [x] 2.3 在四组实现稳定后，通过共享完整 Gate/installed consumer 验收并记录未覆盖边界。
- [x] 2.4 提交前按 ai-ready-docs 与完整编码规范复审、优化本组文档和代码，重验受影响边界及完整 Gate。

最终证据见[四组升级验收](../migrate-stable-typescript-toolchain/evidence/final-verification.md)。验收后保存完成态并按授权结项。
