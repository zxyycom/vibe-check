# Proposal

本 Change 减少 Scheduler 图验证、pending 移除与分类计数的重复工作。

## Why

图验证对同 scope 重走 reachability，Shell 按 ID 删除 pending 时搜索并移动数组后缀；measurement 分类也存在重复遍历。
2026-10-15 普查及同输入操作量证据支持局部消重，完成顺序和精确累计规则继续保留。

## Outcome

在保持 Scheduler 精确行为、immutable forks 与错误优先级的前提下，消除 graph validation 与 Shell pending 的重复工作。

## Scope

### Intended Change

R04 每 scope 一次 reachability 和 direct overlap Set；Shell 使用 declaration-order pending Map；
R05 复用未变 active roots，R09 合并分类计数。completion race、动态 blocked-prefix 和逐 Task delay 累加保持。

### Resulting Impacts

同步内部成本 owner、相邻行为测试与有界操作量证明，不改变公开契约、机器输出、安全边界、调度层/比较器/wait/backfill/公平策略；未成立候选记录不采用理由。

## Success Criteria

采用候选具有相同工作负载的操作量依据；窄功能测试通过；每个候选均有采用/不采用说明；独立 reviewer 审查精确语义。

## Affected Owners

docs/development/scheduler.md、docs/guides/scheduling.md、docs/guides/simulating-admission.md；docs/testing/strategy.md 与 docs/testing/case-maintenance.md。
