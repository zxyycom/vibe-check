# Design

在现有 Gate 性能评估与 transcript 边界完成阻断和现场留存，不改变 Product。

## Context

[Gate owner](../../docs/tooling/project-gate.md#性能预算与-check-耗时分布) 已有三个独立预算、同次 Run duration facts 与受限 passed→failed contributor。当前本机 required/all 总预算为 30000/90000ms，均值 2000ms、P95 5000ms；本轮仅更改超标的后果。

## Goals / Non-Goals

目标是及时阻断并让同次日志足以定位负载和准备状态。不清理测试、不改变选择或粒度、不优化运行成本，不新增测量系统或环境快照。

## Decisions

### Intended Change

- 三个预算各自使用严格大于比较；contributor 只将初步 passed 降为 failed，超标消息为 error。
- 在任一超标时追加一条 transcript-only 的 JSON 现场消息：使用已验证 Run facts 和受信 context，显式挑选 candidate、runtime、selection、timing、budget、duration 与证据路径字段。
- 沿用 gate.log 的写入和关闭失败边界；终端显示超标、最慢 Check 和日志目录，不复制全部现场内容。
- 输入身份使用已有 candidate inputFingerprint 与 Definition declarativeFingerprint；它们不是整个脏工作区的快照，不新增 Git 子进程或全仓哈希。

### Resulting Impacts

- 更新 Case 的测试实体名称和证明语义，覆盖独立超标、等值、退出、日志落盘及只执行一次。
- 更新内部 owner；package API、用户指南和 machine schema 无变化。
- 以真实后继修订旧告警决策，保留原预算、统计口径、完整验收和不学习预算的长期约束。

## Risks / Trade-offs

环境波动也可能阻断；按用户决定保留该后果，不以重跑取得绿色。现场描述同次事实，不自动推断冷热原因或性能根因。既有日志是本地诊断材料，不具备机密性或防篡改保证。

## Open Questions

无。测试清理由后续 owner 分批任务承接。
