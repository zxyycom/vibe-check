# Proposal

本 Draft 为随包 public-contract consumer 建立源码归属与依赖门禁。分类以消费契约和依赖权限为准，不以公开导出身份代替领域责任。

## Why

当前 `src/index.ts` 从 Product 核心、package-provided Checks、纯函数 helper、Scheduler 模拟和 learned strategy 等多个 owner 组合唯一 package root。它们都会随包交付，但“随包”“从 package root 公开”和“实现只能消费公开契约”是三个不同属性；仅凭当前目录位置无法直接识别或机械保证第三项。

新的 Scheduler 二阶性能投影需要像普通调用方一样只消费 `SchedulerMeasurementContext`，现有部分随包 helper 也可能承担相同责任。可验证的分类和依赖方向应保证这类能力只能取得普通调用方可用的契约，同时让拥有 private execution、scanner 或 settlement 职责的 package-provided Check 继续留在对应领域 owner。

## Outcome

仓库能够明确区分 Product facade、package-provided Check、public-contract consumer tool 与 repository development tool。符合 public-contract consumer 定义的随包能力位于可识别的领域 owner 中，并由静态 import boundary 证明它们只依赖获准的公共契约与稳定基础能力；公开导出 inventory 决定需要调整归属的集合，并以 package root、package artifact、外部 consumer 和产品行为保持闭合作为验收边界。
