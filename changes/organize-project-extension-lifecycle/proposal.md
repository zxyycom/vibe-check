# Proposal

本 Draft 先核对 Product 到 Project Gate 的正式扩展生命周期，再统一角色、阶段语义和 effect 边界。

## Why

当前公开能力包含 Check `preflight` / `execution`、admission strategy、terminal `measurementHooks`、prepared `complete`、progress formatter 和项目私有 `afterGate`。这些 callback 的输入、控制权、顺序和失败语义不同，现有私有 progress lifecycle 还混合了 invocation-wide barrier 与逐 Check transition。

生命周期盘点会直接决定后续命名、职责调整和 Check observation 接入，因此它是同一 Change 的 Readiness，而不是完成后可能与实现分离的独立成果。planned project-input preparation 与配置组合也需要复用这套统一模型。

## Outcome

Product 与 Project Gate 形成一套可恢复的扩展生命周期：Current 时间线和角色分类有唯一 owner；measurement facts 与 consuming effects 清楚分离；Scheduler 和 Check 的开始、结束及观察边界明确；配置组合依赖稳定槽位。具体 API、迁移和失败语义在 Draft 进入 Plan 前确定，本轮不实施 runtime。
