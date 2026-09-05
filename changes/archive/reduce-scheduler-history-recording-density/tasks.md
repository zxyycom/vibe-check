# Tasks

任务按范围确认、最小拆分和定向验证排序；完成事实与未运行边界由 `design.md` 的 Implementation Observations 统一记录。

## Readiness

- [x] 0.1 读取 AGENTS、导航、编码规范、architecture/API mechanics duration owner、recording 实现与相邻 duration-model tests，确认本 Change 不跨越 provider、preparation、Scheduler 或 admission owner。
- [x] 0.2 记录 focused quality 基线：`recordSchedulerHistory` 的 function-code-density 为 68（阈值 50）。

## Implementation

- [x] 1.1 提取按已验证 admission 合并 identity history 的具名私有阶段，使其返回实际更新后的 series、sequence 与 accepted count，同时保持公开 timing guard 和最终 history/observation projection。
- [x] 1.2 审阅局部 diff，逐项核对 timing unavailable、采样 eligibility、32/4096 边界、sequence 饱和、排序、digest-only storage 和 freeze 行为未改变。

## Verification

- [x] 2.1 运行现有 `scheduler-duration-model.test.ts`，取得 recording 路径的定向回归证据。
- [x] 2.2 运行产品 typecheck、产品 lint 和 formatter check。
- [x] 2.3 运行 focused `--quality` Gate 并比较 function-code-density Records：目标项移除，未新增 Record。
- [x] 2.4 运行单项 Change Plan check；交接状态与未运行范围记录在 `design.md`。
