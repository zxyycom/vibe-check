# Proposal

本临时计划把 Project Gate 的三项现有性能预算升级为阻断，并保全同次失败现场。

## Why

仅告警容易把性能问题留到事后，届时难以恢复实际负载和准备状态。用户已明确要求现场阻断，沿用现有阈值，不重试、不放宽预算。

## Outcome

required / all 任一预算超标时 Gate 退出 1；同次日志可定位实际预算、耗时、候选包、准备动作与 Check 集合。

## Scope

### Intended Change

调整 Gate 私有 contributor 的判定与诊断，覆盖三个独立预算及适配器退出；同步当前 owner、Case 与旧告警决策的后继。

### Resulting Impacts

- 保留 Product facts、aggregate、machine publication 和完整验收选择。
- 沿用已有 gate.log 保存安全字段，不增加进程启动、自动重试、缓存或预算写入。
- 可能出现所有 Product Checks 通过而 Gate 因性能失败；交付须如实区分。

## Success Criteria

- 等于阈值通过；总耗时、均值或 P95 任一独立超标即 error / blocks / exit 1。
- 失败现场包含 profile/runtime、候选与输入指纹、准备动作、全部 Check duration facts 与日志定位。
- 本机预算文件逐字未变；focused、初步非 passed、无效配置/测量的原边界保持。
- 局部测试、Case、材料和独立 diff 审查完成，并经 required / all 正式入口各验收一次。

## Affected Owners

- [Project Gate](../../docs/tooling/project-gate.md#性能预算与-check-耗时分布)
- [Gate diagnostics](../../docs/tooling/gate-diagnostics.md#gate-terminal-and-transcript)
- [Repository tooling Cases](../../docs/testing/cases/repository-tooling.md)
- [Gate 预算阻断决策](../../docs/decisions/enforce-gate-performance-budgets.md)
