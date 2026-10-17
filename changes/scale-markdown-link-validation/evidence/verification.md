# 最终实施与验收证据

## 当前结论

实现、文档与性能验收已完成；最终独立证据审计通过，两条后继 Decision 已按完整采用方向核对并通过 CLI 标为 active / aligned。
Plan 17/17 完成，长期判断与实测取舍已交接到现有 Decision / owner。
未 stage、commit、finalize 或 push；这些结项动作由主代理拥有。

- 最终源码的完整 exact-candidate Gate **43/43 passed**，含隔离 external-consumer types/docs/runtime、package artifact、
  Product/scripts tests、type/lint/import、file/function/duplicate quality、完整 corpus 与 Case 验证。
- 最终源码另运行 `mise exec -- bun run test -- product`：**579/579**，215 文件；`docs:api` 通过。
- Markdown Link 局部 **36/36**；Case **755 entities / 187 Cases**。代码、文档、拆分及优化影响经非实施代理独立复核。
- 最终正式计时 **324/324 rows**：27 组，每组各一次 warmup 与五对独立 Node 进程；交替 pair order 与每一行完整 facts 一致性校验通过。
  before/after bundle、冻结 fixture、最终全部源码及 lockfile identity 复核未漂移。
- 独立操作量 **59/59** 计数进程与硬断言通过：54 个矩阵版本/缓存组合，以及 5 个需求证明。
  计数在正式计时全部结束后执行，未与 Gate 或计时并发。
- 两项总量预算支持 false / 任意正安全整数，省略默认与单文件界不变；真实文件 fixture 的 **10,001** 条计费引用
  在 false 与显式 10,001 预算下成功，有限 10,000 仍 unavailable。该正确性执行不参与 before/after 计时收益。

## 命令与证据入口

- `mise exec -- bun run check -- --all`：最终 43/43，37.7s。原始 `final-gate-run.json`、`final-gate-records.ndjson`、
  `final-gate.log` 与 manifest 保存同一 source / exact candidate 验收；log directory 见 manifest。
- `mise exec -- bun run test -- product`、`bun run typecheck -- product`、`bun run lint -- product`、
  `bun run validate`、`bun run docs:api`、`bun run test-evidence -- check --root .`、`bun run decisions -- check`、
  目标 `change-plan check` 均已实际执行通过；完整 Gate 另实际执行 Product/scripts type/lint 与相关脚本测试。
- `mise exec -- node .../sample.mjs paired`：`paired.jsonl` / `summary.json` / `comparison.md`。
- `mise exec -- node .../operations.mjs`：`operations.jsonl` / `operations-summary.json` / `operations.md`。
- 所有重要输入的耗时/RSS取舍、局部回退与适用边界见 `interpretation.md`，没有用总平均掩盖独立场景。

最终 Gate 如实保留既有 warning-only 性能提醒：mean **2167.8ms > 2000ms**、p95 **5345.1ms > 5000ms**；
43 项通过。未改动任何阈值、warning policy、selection scope 或 Findings 解释。

## 阶段历史与明确排除的系列

- 原始 before 前置：27 组 / 96 raw rows（每组 warmup + 至少一条 before，早期组保留额外样本）。
  它证明运行时修改前的可运行基线，不替代最终五对对照。
- `superseded-baseline.jsonl`：56 条早期探索记录。其初始真实选择未加 Gate negative patterns、fixture 带不必要文件；
  修正发生在任何运行时改动前。该系列不参与正式比较。
- `pre-gate-paired.jsonl` / `after-pre-gate.mjs`：58 条不完整旧 after 记录。实际 Gate preflight 暴露集中 source traversal / resolver
  超过既有 blocking function/file metrics；修复按真实领域拆分，不压缩语法、不改 scope/waiver/阈值。
  这组已经过期，不进入最终 `paired.jsonl` 或 summary。
- 失败 preflight 为 41/43，结构修复后 43/43，末期优化后最终源码再次 43/43；各自机器证据独立保存，旧失败不是当前结果。
- 本次两个 Decision 归档后的相对链接已全部核查；修正一处历史调查路径并选择性同步索引。
  除授权的 archived 状态和移动路径修正外，前序方向与历史事实保持。

## 已知边界

- 计时只覆盖固定 Linux/WSL2 主机、Node 24.18.0 / Bun 1.3.14、锁定依赖与冻结 corpus；OS page cache 未清空，
  不保证任意用户 workload 都更快。RSS 是整个独立进程峰值，包含 fixture setup / hit prefill，而非仅 timed Run 的精确增量。
- 操作计数覆盖对应异步 JavaScript fs API，不等于所有 syscall，也不覆盖同步 source discovery；hit 进程计数包含两次 Run。
- 文件系统观察不是原子快照；hostile replacement isolation、同步解析内抢占、进程资源隔离不在已有保证内。
- 完整普通 Records 发布区间不让步；总量关闭后总体资源消耗由调用方承担，原单文件与安全边界仍生效。
