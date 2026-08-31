---
title: 在稳定承诺前让 package 保持 0.0.x 版本线
status: active
alignment: aligned
createdAt: 2026-08-12T09:27:03Z
purpose: 让 `0.0.x` patch 递增不被误解为已经提供 package-level 兼容承诺。
background: Public package API、公共声明、名称与运行行为仍在形成，相邻预稳定 package versions 可能包含破坏式变化。
decision: 稳定承诺前，产品 package version 保持 `0.0.x`；跨 patch 不承诺包级兼容，进入非零 minor 版本线须由产品 owner 明确确认。
tags:
  - product-contract
relations:
  - type: 修订
    target: keep-prestable-releases-on-0-0-x.md
---

## 目的
- 让 package version 诚实表达 public package API、公共声明、名称和运行行为仍处于可以频繁调整的产品形成阶段。
- 把开始提供稳定版本与兼容承诺保留为一次显式产品决定，而不是由发布次数、功能数量、当前 manifest 或 Change 完成度自动触发。

## 背景
- 版本化 npm package 将共同承接 public package API、TypeScript declarations、built-in identities 与明确承诺的 package materials，其中多数公共 shape、名称和访问方式尚未完成首轮稳定化。
- 当前阶段需要允许相邻 package versions 包含破坏式 API、声明、名称、package material 或运行行为更新；非零 minor 版本线应只在产品 owner 明确开始稳定承诺后使用。
- 个别 surface 可以由自己的 identity、schema version 或兼容决策提供更强承诺；package-level 预稳定策略不应静默撤销这些具体契约。

## 决策
- 采用: 在产品 owner 明确确认开始提供稳定版本前，所有正式 product package versions 保持为 `0.0.<patch>`；每次发布只推进唯一且递增的 patch 值。
- 采用: 任意两个 `0.0.x` package versions 之间都可能包含破坏式变化，patch 增长本身不构成 public package API、公共名称、声明文件、明确承诺的 package materials 或运行行为兼容承诺。发布材料和安装建议必须诚实表达该风险，消费者应精确锁定所使用的版本。
- 采用: 破坏式更新仍须按对应 owner 同步代码、runtime validators、声明、schema、文档、examples、migration diagnostics 与验证材料；预稳定版本线只移除默认的跨版本兼容推断，不豁免具体 contract 和变更治理。
- 采用: 已由独立决策或 public identity 明确提供更强稳定保证的 surface 继续遵守其自身规则；本决策只定义没有更具体 surface contract 时的 package-level 默认。
- 采用: 首次进入 `0.y.z` 且 `y > 0` 的版本线必须由产品 owner 明确确认，不得由 agent、自动化、功能完成、Change 归档或实现成熟度推断。该确认需要同时说明开始稳定的 surface、兼容范围、破坏式更新规则和发布验收。
- 不采用: 在尚未确认稳定范围时使用 `0.1.0` 或更高 minor 表示普通开发里程碑。
- 不采用: 因版本仍为 `0.0.x` 就忽略已经单独建立的名称、schema、identity、安全或迁移约束。
