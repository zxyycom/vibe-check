# Design

以阶段计时区分热点中的必要工作、重复工作与等待，按证据逐项采用优化。

## Context

形成时基线为 main / HEAD `34c58409`，起点 Test Evidence 为 766 entities / 190 Cases。前序 `reduce-gate-test-work` 的改动同时存在于前后测量；独立 Markdown consumer 调查属于另一会话，不参与本轮负载。

## Goals / Non-Goals

目标为三个热点的成本分解与可验证削减。保留 analyzer 来源核心、完整扫描、取消检查、consumer 隔离与物理安装，以及既有预算和调度。后续授权包含文档/代码审阅与 Git 提交，Change 目录保留。

## Decisions

### Intended Change

正式计时使用未插桩 public path 与实际测试/consumer preparation；阶段插桩仅用于归因，嵌套与重叠时间不相加。必要时冻结 function-metrics 的输入字节与清单以避免自身源码变化改变负载。测量 driver 与 raw 结果只存本 Change，临时构建、fixture 和 profiles 使用 .cache/.log 或 test-local root，并按自己拥有的精确对象清理。

### Resulting Impacts

每项采用前重读 owner、Case 和断言；当前没有跨 owner 写入冲突。新增实现边界或证明目的时同步测试/Case；内部职责变化由非实施代理只读反查公开/内部文档影响。完整 Gate 只经 bun run check 入口。

## Risks / Trade-offs

机器共享争用可能放大或掩盖收益；采用 warmup、多样本和范围。缓存、模块静态 import 或 timer 改动不得把未执行的安装、分析或安全核对当成已验收。无法在此边界安全缩减的真实分析成本保留并说明。

## Open Questions

本轮没有待用户决定的实施问题；function-metrics 的主要成本留给后续 source-aligned CPU 调查，不为使三项都改动而扩大架构或降低验收。

## Implementation Observations

已采用的操作、前后测量、验收和留存边界见 [实施与测量证据](evidence.md)。原始 JSON 保存形成时观察，稳定行为由相应 owner 文档与源码承接。

2026-10-22 的跨组文档/代码交付复核及完整 Gate 结果见 [交付复核](../reduce-gate-preparation-cost/evidence.md#交付复核2026-10-22)。
