---
title: 保留主 Run failure 高于 measurement Hook output
status: active
alignment: aligned
createdAt: 2026-09-02T01:50:13Z
purpose: 让 measurement Hook 副作用可见而不掩盖已形成的主 Run failure。
background: Hook failure 已有 output status，但 cancellation 和 admission-policy failure 需要保留其主语义。
decision: 只让正常完成升级为 Hook output failure，主 execution failure 保持原 result。
tags:
  - product-contract
  - workflow-policy
relations:
  - type: 修订
    target: expose-invocation-local-scheduler-measurement-hooks.md
---

## 目的

- 让 Scheduler measurement Hook 的 terminal side-effect failure 始终可观察，同时保留 cancellation、admission-policy fault 和其它主 execution failure 的结果语义与诊断。

## 背景

- `expose-invocation-local-scheduler-measurement-hooks.md` 将 caller Hook failure 交给 Run output status，但其“通过 output result 保留 facts”的表述没有区分正常 completion 与已经形成的主 failure。
- Hook 只消费 Scheduler 已结束的测量事实，不能把次级副作用故障提升为对主 execution 结论的替代。

## 决策

- 采用: 任一 configured caller Hook throw/rejection 继续给剩余 Hook 调用机会，并将 `outputs.measurementHooks.status` 标为 `failed`；只有所有 configured caller Hook 成功 settlement 后才标为 `succeeded`。
- 采用: 正常完成的 invocation 遇到 measurement Hook failure 时，既有 `kind: "output"` / `scheduler-measurement-hooks-failed` 保留完整 settled facts。
- 采用: 已形成 cancellation、admission-policy fault 或其它 primary execution failure 时，保留该 primary `kind` 与 diagnostic；measurement Hook failure 仅通过 output status 可见，不重写为 output result。
