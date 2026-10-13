# Design

复用持有的 immutable admission core，将 shell lifecycle facts 与未消费的 shell 全态复制分离。

## Context

基线 HEAD 为 `08c9166b85152168ca27d45452a4174afed50e57`。原 shell 每轮调用 `snapshotSchedulerState` 后传入同轮 core；decision 从 core 重建 inspection，仅读 snapshot 的 abort/cancel 及取消 IDs。canonical candidates 已由 core 保证声明序和冻结。行为 owner 见 proposal，测量事实归[调查报告](../../docs/investigations/evaluate-run-projection-optimization.md)。

## Goals / Non-Goals

目标是消除已证明未消费的重复复制和等值候选重建，以默认 P=4 workload 验证收益。必要完整输出、策略、learned model、图准备、公共 API、依赖和默认 timeout 保持。

## Decisions

### Intended Change

1. shell 使用 core + lifecycle-only 入口。完整 snapshot helper 保留 standalone/forced-replay 消费者，两入口共用 cycle 决策，避免第二套调度策略。
2. shell pending 数组从 graph 声明序初始化，仅通过 `splice`/`shift` 删除，剩余成员相对顺序不变；core inspection 也按 graph 声明序过滤 pending。因此 shell 取消可使用 core pending 顺序。standalone 显式 supplied IDs 通过单独参数原样传递。
3. core candidates 的数组和每个 `{ canAdmit, task }` 元素已冻结，无额外字段或 accessor，task 引用相同；直接复用。公开 callback 仍由原 owner 投影 `{ canAdmit, taskId }`，不新增 core identity 承诺。

### Resulting Impacts

- 保持 cap/priority/scope ID/task ID 及同分声明序、callback 次数、hard guards、context/past-prefix 冻结、容量/资源、cancel/fault/drain、measurement 采样和全部终态。
- 既有取消测试分别验证 shell 的非字典序声明序及 standalone supplied 逆序，并断言完整 settlement 和冻结；保留原 Case 目的。
- 两份完整临时源码快照隔离在自有 `node_modules/{before,candidate}`，避免 Bun 测试发现重复注册；历史 manifest/raw 仍对应测量时身份。
- 格式化后的生产实现与已测候选以类型擦除后的 JS AST/叶 token 对照，分开保存当前字节与历史 hash。

## Risks / Trade-offs

每轮 core inspection、candidate 查询及诊断完整物化仍存在，本 Change 不承诺整体复杂度降阶。空 Check workload 的收益不能外推真实扫描、IO、长尾或 SLA；小样本仍受 JIT/GC/共享宿主影响。性能计数与计时分开执行，避免 instrumentation 污染。

## Open Questions

无未决设计问题。局部行为 61/61、完整 Case、工程/材料、独立审查及同 candidate required/complete Gate 已通过，详见报告。Plan 保留供交接；结项删除走独立授权与 `finalize` 流程。
