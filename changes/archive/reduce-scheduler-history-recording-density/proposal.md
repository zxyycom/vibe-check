# Proposal

本 Change 已以一个小型私有阶段拆分降低 scheduler history recording 的函数密度；它仍是未归档的 active Plan。

## Why

当前 `recordSchedulerHistory` 同时负责 timing 不可用边界、已验证 admission 的采样合并、identity 窗口更新和最终 history/observation 投影，因此产生一条超过 repository function-code-density 阈值的 Finding。

## Outcome

`recordSchedulerHistory` 不再产生该 function-code-density Finding；定向行为测试和质量记录为既有 recording 行为与不可变输出提供证据。

## Scope

### Intended Change

在 `src/project-run/scheduler-duration-model/recording.ts` 中提取一个具名的私有阶段。该阶段实际按 admission 顺序将已经验证的 samples 合并到 identity history，并将该合并结果交还给公共 recording 函数完成 retention、freeze 和 observation 投影。

### Resulting Impacts

- 公共边界继续处理 timing unavailable 或缺少 timing facts：返回原 history 引用、零 accepted samples 与 `timing-unavailable`。
- 私有阶段保持 admission eligibility 与顺序、same-identity append、每 series 32 项窗口和 observation sequence 饱和；调用方保持最多 4096 个 identity 的 retention、排序、digest-only storage 及最终 freeze/observation 投影。
- 范围不涉及 learned admission algorithm、provider/preparation、Scheduler concurrency 或测试源文件；不新增测试节点，使用现有 duration-model 测试作为回归证据。

## Success Criteria

1. focused quality 记录中不再有 `recordSchedulerHistory` 的 function-code-density Record，且 Record 集合相对基线只少这一条。
2. 已记录的定向 duration-model 测试、产品 typecheck、产品 lint 与 formatter check 均通过；其命令、结果和未运行边界见 `design.md`。
3. Change Plan 单项 check 通过，8 个任务均标记为完成；本任务不归档、提交或推送。

## Affected Owners

- `docs/architecture.md` 与 `docs/api-mechanics.md`：private learned duration-model lifecycle 和 local history contract。
- `src/project-run/scheduler-duration-model/recording.ts`：本 Change 唯一的产品实现 owner。
- `scripts/project/gate/checks/repository-quality.ts`：function-code-density 的 focused quality 验证入口，仅运行不修改。
