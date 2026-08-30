---
title: "采用 ts-pattern，状态机保持按需调查"
formedAt: "2026-08-11T07:54:34Z"
question: "Vibe Check 应如何分别表达封闭分支与有限状态机，哪些能力应预置，哪些能力应等待真实工作负载？"
tags:
  - "implementation-libraries"
relations: []
---

## 形成时背景

Vibe Check 的编码规范把“结果只取决于当前值的封闭分支”和“行为由当前状态与事件共同决定的
合法转移”定义为两种问题形态。项目需要为非平凡穷尽匹配提供稳定能力，但不能把模式匹配库
误当作状态机解释器，也不能在没有真实状态机工作负载时预装完整框架。

## 调查目的

本轮需要回答三个问题：

1. 简单封闭分支、嵌套判别联合和深层模式匹配分别是否需要第三方能力。
2. 真正需要状态、事件和合法转移约束时，是否存在值得通用预装的轻量状态机库。
3. 当前采用范围、原生语言边界以及重新调查状态机的触发条件是什么。

## 调查范围与依据

外部指标快照为 2026-08-07。穷尽匹配候选包括 `ts-pattern`、`match-iz`、`assert-never`、
`@typemint/core` 和 `@praha/tagged`；状态机候选包括 `robot3`、`@xstate/fsm`、
`typescript-fsm` 和 `@zag-js/core`。版本、发布时间、解压尺寸、生产依赖和类型声明来自
[npm registry](https://github.com/npm/registry/blob/main/docs/REGISTRY-API.md)；下载量使用
2026-07-08 至 2026-08-06 共 30 个完整 UTC 日的
[npm downloads API](https://github.com/npm/registry/blob/main/docs/download-counts.md)；stars 和
默认分支活动来自官方 GitHub 仓库；gzip 体积来自 [Bundlephobia](https://bundlephobia.com/)。
这些指标用于横向比较，不等同于独立使用者数量、正确性或本项目 bundle 成本。

本地核对覆盖根依赖、TypeScript 配置和编码规范，并在 Bun 1.3.14 与当前 TypeScript native
preview 下运行 `ts-pattern@5.9.0` 的判别联合穷尽匹配运行时和类型样例。没有构造真实状态机
工作负载，也没有复测候选的 bundle、性能或供应链安全。

## 调查结果与边界

封闭分支与状态机使用不同判断标准：

- 结果只取决于当前值，需要类型收窄、映射或穷尽分支时，使用原生 `switch`/`never` 或
  `ts-pattern`。
- 行为同时取决于当前状态和事件，需要拒绝非法转移并维护转移表、上下文、guard、动作、
  异步调用或解释器生命周期时，才进入状态机选型。
- `ts-pattern` 可以匹配 `[state, event]`，但不提供机器解释器、转移图或生命周期语义。

根 `devDependencies` 精确锁定 `ts-pattern@5.9.0`，作为本类别唯一预装库。它用于非平凡封闭
分支、嵌套判别联合组合和需要表达式结果的穷尽映射。简单单值分支继续使用 TypeScript 原生
`switch` 与 `never`。状态机类别当前不预装。

## 穷尽匹配候选对照

| 候选 | 版本与最新发布 | gzip 体积 / npm 解压尺寸 | 生产依赖 | 30 日下载 | GitHub stars | 项目判断 |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| [`ts-pattern`](https://registry.npmjs.org/ts-pattern/5.9.0) | 5.9.0 / 2025-10-26 | [2,617 B](https://bundlephobia.com/package/ts-pattern@5.9.0) / 452,137 B | 0 | [23,420,635](https://api.npmjs.org/downloads/point/2026-07-08:2026-08-06/ts-pattern) | [15,113](https://github.com/gvergnaud/ts-pattern) | **采用**：TypeScript 穷尽检查、嵌套模式、元组、guard 和表达式结果完整；简单分支不使用 |
| [`match-iz`](https://registry.npmjs.org/match-iz/5.1.1) | 5.1.1 / 2026-07-21 | [2,747 B](https://bundlephobia.com/package/match-iz@5.1.1) / 184,862 B | 0 | [283,891](https://api.npmjs.org/downloads/point/2026-07-08:2026-08-06/match-iz) | [176](https://github.com/shuckster/match-iz) | **不采用**：官方说明 TypeScript 支持基础且不完整，不能兑现编译期穷尽价值 |
| [`assert-never`](https://registry.npmjs.org/assert-never/1.4.0) | 1.4.0 / 2024-12-17 | [311 B](https://bundlephobia.com/package/assert-never@1.4.0) / 5,775 B | 0 | [16,369,582](https://api.npmjs.org/downloads/point/2026-07-08:2026-08-06/assert-never) | [45](https://github.com/aikoven/assert-never) | **不采用**：只包装原生 `never` 检查，TypeScript 已能直接表达 |
| [`@typemint/core`](https://registry.npmjs.org/%40typemint%2Fcore/0.16.2) | 0.16.2 / 2026-06-26 | [1,442 B](https://bundlephobia.com/package/@typemint/core@0.16.2) / 285,664 B | 0 | [3,389](https://api.npmjs.org/downloads/point/2026-07-08:2026-08-06/@typemint/core) | [0](https://github.com/typemint-dev/typemint) | **不采用**：仍为 0.x，采用与维护证据不足以替代当前选择 |
| [`@praha/tagged`](https://registry.npmjs.org/%40praha%2Ftagged/1.0.0) | 1.0.0 / 2026-03-24 | [207 B](https://bundlephobia.com/package/@praha/tagged@1.0.0) / 17,808 B | 0 | [5,415](https://api.npmjs.org/downloads/point/2026-07-08:2026-08-06/@praha/tagged) | [1](https://github.com/praha-inc/tagged) | **不采用**：提供 tagged-union 构造与收窄，但不由库强制穷尽分支 |

## 轻量状态机候选对照

| 候选 | 版本与最新发布 | gzip 体积 / npm 解压尺寸 | 生产依赖 | 30 日下载 | GitHub stars | 项目判断 |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| [`robot3`](https://registry.npmjs.org/robot3/1.2.0) | 1.2.0 / 2025-09-20 | [1,270 B](https://bundlephobia.com/package/robot3@1.2.0) / 27,757 B | 0 | [5,150,903](https://api.npmjs.org/downloads/point/2026-07-08:2026-08-06/robot3) | [2,194](https://github.com/matthewp/robot) | **首要复查候选**：模型与体积合适，但声明文件仍含宽 `string`、`any` 和类型 FIXME，需要真实用例验证非法目标与事件载荷 |
| [`typescript-fsm`](https://registry.npmjs.org/typescript-fsm/1.6.0) | 1.6.0 / 2025-04-10 | [989 B](https://bundlephobia.com/package/typescript-fsm@1.6.0) / 31,068 B | 0 | [53,314](https://api.npmjs.org/downloads/point/2026-07-08:2026-08-06/typescript-fsm) | [301](https://github.com/WebLegions/typescript-fsm) | **次要复查候选**：适合扁平异步流程，但生态与模型覆盖较窄 |
| [`@xstate/fsm`](https://registry.npmjs.org/%40xstate%2Ffsm/2.1.0) | 2.1.0 / 2023-06-21 | [1,578 B](https://bundlephobia.com/package/@xstate/fsm@2.1.0) / 57,110 B | 0 | [20,762,014](https://api.npmjs.org/downloads/point/2026-07-08:2026-08-06/@xstate/fsm) | [29,977*](https://github.com/statelyai/xstate) | **排除**：官方已在 XState v5 中弃用，版本和包目录停留在 2023 年 |
| [`@zag-js/core`](https://registry.npmjs.org/%40zag-js%2Fcore/1.43.0) | 1.43.0 / 2026-07-29 | [2,621 B](https://bundlephobia.com/package/@zag-js/core@1.43.0) / 65,098 B | 2 | [5,339,254](https://api.npmjs.org/downloads/point/2026-07-08:2026-08-06/@zag-js/core) | [5,177*](https://github.com/chakra-ui/zag) | **不作为通用候选**：面向 UI component machine，执行还需要对应 adapter |

`*` 表示整个上游 monorepo 的 stars，不是候选包单独获得的 stars。

## 使用边界与复核条件

1. 简单单值分支使用原生 `switch` 与 `never`；非平凡封闭分支才使用 `ts-pattern`。
2. 使用 `ts-pattern` 时通过 `.exhaustive()` 证明封闭集合完整；若类型检查成本成为可测问题，
   再依据具体热点调整，而不是预先放弃穷尽性。
3. 出现真实的多状态、多事件、guard、上下文或异步转移需求时，以该工作负载重新调查状态机；
   首先验证非法目标、事件载荷、Bun/TypeScript 兼容性和测试表达。
4. 候选主版本、维护状态或项目运行边界发生实质变化时，重新调查本主题。
