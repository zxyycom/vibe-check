# Design

以实际输入证明 required 选择，再分层测量跨组重复成本。

## Context

本轮形成时，前序包测试减重与 Markdown/consumer 局部优化已在工作区生效，并同时进入前后测量。Gate/Case owner 在 main 串行修改，其它会话的 Investigation 独立保留。

## Goals / Non-Goals

按真实消费者收窄 required 选择，保留完整验收、独立 runner 与既有并发/预算。跨 Run 缓存留在本轮范围外；后续授权包含文档/代码审阅与 Git 提交，Change 目录保留。

## Decisions

### Intended Change

已采用：packageSupporting、scriptsProject、scriptsAdmissionWorkbench、scriptsTooling 的 required region 消费 Product 实现、helper、fixture 和未知路径；已知 owner 的 `*.test.ts` 正文由 owning lane 承接。导入闭包与直接读取审计支持该边界；共同目录表由 Product region owner 维护，各 region 保留自身其它输入。

### Resulting Impacts

所有脚本 lane 自身触发矩阵覆盖实际 lane 文件；layout/quality/Test Evidence 继续真实全树扫描。固定路径 benchmark 使用同 candidate、静态 admission 和不变资源约束；不能称为正式 root E2E。跨组测量区分模块注册与执行正文，不将重叠计时相加。

## Risks / Trade-offs

文件清单也是非 import 输入，需核实启动分区校验与 Test Evidence 继续覆盖重命名/增删；未知 owner 不排除。计时受缓存/机器负载影响，多次报告中位数与范围。

## Open Questions

无。tooling 指纹测试的两次重复 hash 已移除；其它候选及形成时取舍见 [实施证据](evidence.md)。

## Implementation Observations

直接输入审计、固定路径前后测量、10 lane 加载/正文分层、准备诊断及采用/拒绝理由见 [evidence](evidence.md)。公开 Product 行为/材料不变，仅仓库 Gate 和测试重复工作变化；内部 owner 与 Case 已同步，非实施代理独立审查通过。

2026-10-22 的跨组文档/代码交付复核及完整 Gate 结果见 [交付复核](../reduce-gate-preparation-cost/evidence.md#交付复核2026-10-22)。
