---
title: 在稳定承诺前保持 0.0.x 版本线
status: active
alignment: unaligned
createdAt: 2026-08-06T03:03:02Z
purpose: 让 `0.0.x` patch 递增不被误解为已经提供 package-level 兼容承诺。
background: 产品的公共 API、声明文件与资源仍在形成，当前阶段的大多数相邻 package versions 可能包含破坏式更新。
decision: 稳定承诺前，Vibe Check package version 保持 `0.0.x`；跨 patch 不承诺包级兼容，进入非零 minor 版本线须由产品 owner 明确确认。
relations: []
---

## 目的
- 让 package version 诚实表达 Vibe Check 仍处于可以频繁调整公共边界的产品形成阶段。
- 把开始提供稳定版本与兼容承诺保留为一次显式产品决定，而不是由里程碑、功能数量或当前 manifest 自动触发。

## 背景
- npm package 发布单元将共同承接 CLI、TypeScript declarations、schemas、templates、built-in identities 与其它产品资源，其中多数公共 shape 和访问方式尚未完成首轮稳定化。
- 当前阶段需要允许相邻 package versions 包含破坏式 API、声明文件或资源调整；本项目将非零 minor 版本线保留为产品 owner 明确开始稳定承诺的信号。
- 个别 surface 可以由自己的 identity、schema version 或兼容决策提供更强承诺；包级预稳定策略不应静默撤销这些具体契约。

## 决策
- 采用: 在产品 owner 明确确认开始提供稳定版本前，所有 Vibe Check package versions 保持为 `0.0.<patch>`；每次发布只推进唯一且递增的 patch 值。
- 采用: 任意两个 `0.0.x` package versions 之间都可能包含破坏式变化，patch 增长本身不构成 package-level API、CLI、声明文件、schema、模板、资源路径或运行行为兼容承诺。发布材料和安装建议必须诚实表达该风险，消费者应精确锁定所使用的版本。
- 采用: 破坏式更新仍须按对应 owner 同步代码、声明、schema、文档、examples、migration diagnostic 与验证材料；预稳定版本线只移除默认的跨版本兼容推断，不豁免具体 contract 和变更治理。
- 采用: 已由独立决策或 public identity 明确提供更强稳定保证的 surface 继续遵守其自身规则；本决策只定义没有更具体 surface contract 时的 package-level 默认。
- 采用: 首次进入 `0.y.z` 且 `y > 0` 的版本线必须由产品 owner 明确确认，不得由 agent、自动化、功能完成、OpenSpec 归档或实现成熟度推断。该确认需要同时说明哪些 surface 开始稳定、兼容范围、破坏式更新规则和发布验收。
- 不采用: 在尚未确认稳定范围时使用 `0.1.0` 或更高 minor 表示普通开发里程碑。
- 不采用: 因版本仍为 `0.0.x` 就忽略已经单独建立的 schema、identity、安全或迁移约束。
