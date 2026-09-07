# Tasks

按固定提交、隔离状态和正式入口依次形成调查证据；不把未运行或未到达语义断言的结果标为通过。

## Readiness
- [x] 0.1 核对获准提交、主工作区清洁状态、Package lifecycle、Project Gate、workspace/environment owner，以及 integration 的 outer/inner timeout。
- [x] 0.2 创建唯一 `/tmp` 隔离根并证明每个实验副本的 root development dependencies、candidate build/cache/private consumer 与主工作区相互隔离。
- [x] 0.3 记录根 development dependency 的本地复制/reflink 策略、容量和温态边界；不运行会预热 candidate 的环境 setup。

## Implementation
- [x] 1.1 在三个独立 candidate-cold 副本中执行正式 `bun run check -- --typecheck`，捕获 status 前后状态、stdout/stderr、exit、时序和 Gate evidence。
- [x] 1.2 在一个完成 cold case 的同一副本中以 fresh Bun process 重跑正式 typecheck Gate，作为 warm/reuse 对照。
- [x] 1.3 在独立副本中执行正式 `bun run package:candidate:integration`，保留 outer runner 与 inner node:test timeout 的结果，不把 runner timeout误记为 candidate 语义失败。
- [x] 1.4 仅在 primary Gate 指向 prepare 后的 load/identity 边界时，使用隔离副本的最小观测脚本区分 install/probe/load/run；不得修改被调查源码或生产契约。

## Verification
- [x] 2.1 复核每次 case 的 candidate 路径、receipt、resolved entry、日志和 command exit，明确可复现性与独立 cold 状态。
- [x] 2.2 基于实际 evidence 写入结论、未覆盖边界与是否需要用户审阅修复；如确认符合复杂/严重 Bug 标准，按治理流程创建并检查报告。
- [x] 2.3 运行 Change Plan check，核对主工作区实验写入边界；已确认报告形成失误意外运行三次主 typecheck Gate并至少一次 status，故不主张主 build/cache/private consumer 未被触及。实施阶段未归档或提交；最终验收后由协调 owner 按已授权路径处理。
- [x] 2.4 独立正确性与最终 AI-ready 审查复核隔离 raw evidence、前序关系与 main-workspace 失误边界；将外层 Node 采样与未单独采样的 Gate child Node 版本区分，并修正 mise/pnpm 与 raw-log 定位，不把 observer 或意外 main Gate 误报为根因或最终验收。
