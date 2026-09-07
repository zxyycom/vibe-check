# Tasks

本 Plan 先确认共同契约边界，再实施最小文档收敛并以 package docs 和 Change Plan 检查结束。

## Readiness
- [x] 0.1 对四个 Check 的 files、waiver 与 parser 场景完成义务矩阵，确认仅 selector/waiver core 有稳定共性。
- [x] 0.2 确认 README 与 finding-waivers 是现有 published common owner，且 current authorization 不包含 public file tool、runtime、tests 或 inventory。

## Implementation
- [x] 1.1 在 README 写入 shared files selector core，并将四个 Check guide 的重复 selector grammar 收敛为链接和 local exceptions。
- [x] 1.2 在 finding-waivers guide 明确 shared authoring/reconciliation/audit core，并将四个 Check guide 的重复 waiver lifecycle 收敛为链接和 local identity/effect。
- [x] 1.3 在 Change artifacts 记录 parser 保持 local 的结论、范围与 non-goals。

## Verification
- [x] 2.1 审阅局部 diff，确认 default、identity、scope、rejection、安全与 parser/failure 语义仍有 owner，且无 new guide/inventory/public tool。
- [x] 2.2 运行 `bun run validate -- docs`。
- [x] 2.3 运行 `bun run change-plan -- check changes/refine-check-guide-shared-contracts`。
- [x] 2.4 独立正确性与最终 AI-ready 审查确认 shared selector/waiver 文本只承接四项 Check 的真实共同契约；四份随包指南仍各自说明 defaults、identity、scope、failure 与安全边界，未发现需进一步改写的语义障碍。
- [x] 2.5 在 cold candidate 串行阶段结束后的稳定 combined 工作树运行 `bun run check`：31 passed、5 not applicable、0 failed/unavailable；该共享集成证据不替代本 Change 的独立归档与提交。
