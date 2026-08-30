---
title: "采用 neverthrow 与项目自有 Option"
formedAt: "2026-08-11T07:54:34Z"
question: "Vibe Check 应如何分别表达值缺失与可预期失败，并用最少的第三方依赖保持同步和异步组合能力？"
tags:
  - "implementation-libraries"
relations: []
---

## 形成时背景

Vibe Check 是使用 Bun、strict TypeScript 和 NodeNext module resolution 的私有 CLI 工作区。
编码规范需要分别表达“值存在或缺失”和“成功或带原因失败”，并避免多个 Result、Either、Maybe
实现同时进入代码。项目还需要让常用能力在实现前已经可用，避免每次遇到相同问题重新选库。

## 调查目的

本轮需要回答三个问题：

1. 哪个 Result 候选能以较小安装和概念成本支持同步与异步失败组合。
2. 项目是否应拥有一个窄 `Option` 原语，以及它与 Result 的职责如何衔接。
3. 采用后应固定哪些使用边界、验证义务和重新调查条件。

## 调查范围与依据

候选比较覆盖 `neverthrow`、`true-myth`、`purify-ts`、`oxide.ts`，并以较宽的 `fp-ts` 作为
对照。外部指标观测于 2026-08-07：版本、生产依赖、文件数、unpacked size、license、Node
engine 和发布时间来自 [npm registry](https://registry.npmjs.org/)；下载量使用 2026-07-08 至
2026-08-06 共 30 个完整 UTC 日的 [npm downloads API](https://github.com/npm/registry/blob/main/docs/download-counts.md)；
stars、默认分支活动和归档状态来自候选的官方 GitHub 仓库。下载量和 stars 只表示采用信号，
不证明正确性、安全性或项目适配。

本地核对覆盖根 `package.json`、lockfile、TypeScript 配置、
`src/product/foundation/src/option.ts`、公共导出和相邻单元测试。代表性 `Result`、
`ResultAsync`、`Some`、`None`、nullable 转换与 `toResult` 样例已在 Bun 1.3.14 和当前
TypeScript native preview 下运行。未执行供应链审计、bundle 测量，也未在项目声明的 Node 24
二进制下单独运行；当前安装环境为 Node 26。

## 调查结果与边界

Vibe Check 采用一个第三方 Result 实现和一个项目自有 Option：

- 根 `devDependencies` 精确锁定 `neverthrow@8.2.0`。它负责需要跨步骤组合的同步或异步
  可预期失败。
- `src/product/foundation/src/option.ts` 单点拥有项目自有 `Option`。它负责值存在或缺失，
  并通过 `toResult` 在需要失败原因的边界转为 `neverthrow.Result`。
- 不安装其他 Result、Either 或 Maybe 库。同一边界只使用一种失败协议；简单局部失败继续使用
  调用链已有的 typed error 或显式 result union。

| 候选 | 安装面快照 | 采用与维护快照 | 项目判断 |
| --- | --- | --- | --- |
| [`neverthrow@8.2.0`](https://registry.npmjs.org/neverthrow/8.2.0) | 约 110 KiB、6 files、0 常规生产依赖，Node `>=18` | [30 日 8,990,996 次下载](https://api.npmjs.org/downloads/point/2026-07-08:2026-08-06/neverthrow)；7,661 stars；npm 发布于 2025-02-21，默认分支 2026-02-14 仍有提交 | **采用**：TypeScript 原生 `Result`、`ResultAsync` 和组合 API；发布节奏与维护者集中度在升级时复核 |
| [`true-myth@9.4.0`](https://registry.npmjs.org/true-myth/9.4.0) | 约 857 KiB、76 files、0 生产依赖 | [30 日 2,986,305 次下载](https://api.npmjs.org/downloads/point/2026-07-08:2026-08-06/true-myth)；1,354 stars；近 12 个月 5 个版本 | **不采用**：Maybe、Result、Task 与本地 Option/neverthrow 重叠，且官方 TypeScript 支持范围未覆盖当前 preview |
| [`purify-ts@2.1.4`](https://registry.npmjs.org/purify-ts/2.1.4) | 约 196 KiB、44 files；1 个生产依赖 | [30 日 504,554 次下载](https://api.npmjs.org/downloads/point/2026-07-08:2026-08-06/purify-ts)；1,602 stars；近 12 个月 2 个版本 | **不采用**：Maybe、Either、异步类型和 Codec 的概念面超出当前窄能力，并与现有 Schema/Result/Option 交叉 |
| [`oxide.ts@1.1.0`](https://registry.npmjs.org/oxide.ts/1.1.0) | 约 98 KiB、15 files、0 生产依赖 | [30 日 177,506 次下载](https://api.npmjs.org/downloads/point/2026-07-08:2026-08-06/oxide.ts)；593 stars；发布和默认分支提交停在 2022-10-25 | **不采用**：长期无发布和默认分支活动 |
| [`fp-ts@2.16.11`](https://registry.npmjs.org/fp-ts/2.16.11) | 约 4.52 MiB、619 files、0 生产依赖 | [30 日 17,149,557 次下载](https://api.npmjs.org/downloads/point/2026-07-08:2026-08-06/fp-ts)；11,532 stars | **不进入当前排序**：完整 typed-FP 体系的概念和维护面明显超出当前 Result/Option 目标 |

项目自有 `Option` 的公开语义固定为：`some(value)` 明确创建存在值，`none` 是共享缺失值，
`fromNullable` 只把 `null` 与 `undefined` 转成缺失；`map`、`andThen`、`match`、`filter` 和
fallback 方法负责局部组合。`toResult` 的错误类型当前固定为字符串；需要泛型错误或惰性错误
工厂时，应由出现该需求的行为 owner 重新评估 API，而不是扩张基础原语。

采用验证包括冻结 lockfile 安装、产品 typecheck、产品 lint、3 条 Option 单元测试、189 条
产品测试和 required 工作区验证。Node 26 与项目声明的 Node 24 engine 不一致，因此 Node 24
仍是未单独覆盖的环境边界。候选主版本、维护状态、TypeScript 兼容性、安全状态或错误模型需求
发生实质变化时，重新调查本主题。
