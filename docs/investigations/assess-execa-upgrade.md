---
title: "Execa 9.6.1 至 10.2.0 升级价值与边界"
id: "261021-assess-execa-upgrade"
formedAt: "2026-10-21T03:24:10Z"
question: "Execa 10.2.0 是否值得替换本项目 9.6.1，以及它能解决哪些输出超限缺口？"
tags:
  - "dependency-upgrades"
  - "execa"
  - "process-boundaries"
relations:
  - type: "补充"
    target: "261020-verify-command-output-limit-lifecycle"
    summary: "补充上游超限回收修复候选与升级验证边界"
---

## 形成时背景

调查时，根 devDependency 声明 `^9.6.1`，锁定与实际安装均为 `9.6.1`；[发布 manifest](../../scripts/package/artifact/release-manifest.json)另以精确版本将它作为 Product runtime dependency。
[前序调查](./verify-command-output-limit-lifecycle.md)在该版本确认超限后不主动终止、非零退出丢失完整性标记与字符/字节计量偏差。本轮新增的问题是：已有上游新版是否提供值得采用的修复，而非重写旧复现或决定新公开契约。

## 调查目的

评估 Node 24 下的升级价值、major 迁移和剩余 Product 责任；只调查，不安装、升级或更改输出限额契约。

## 调查范围与依据

截至 2026-10-21 UTC，读取 [npm latest](https://registry.npmjs.org/execa/latest)、官方 [v10.0.0](https://github.com/sindresorhus/execa/releases/tag/v10.0.0)、[v10.1.0](https://github.com/sindresorhus/execa/releases/tag/v10.1.0)、[v10.2.0](https://github.com/sindresorhus/execa/releases/tag/v10.2.0) 与 [10.2.0 wait-subprocess 源码](https://github.com/sindresorhus/execa/blob/v10.2.0/lib/resolve/wait-subprocess.js)。latest 稳定版为 `10.2.0`；9.x 的现有 `9.6.1` 未发现更高稳定补丁，10.x 不在根声明范围内。

实际消费位置是 [Product runner](../../src/package-checks/host-environment/process/runner.ts)、[scripts runner](../../scripts/process-execution/runner.ts)与 [Git change reader](../../src/project-run/changes/git.ts)。Product 使用 Promise `.then()`、`execaSync`、`reject:false`、`cancelSignal`、`maxBuffer`，不直接依赖 ChildProcess 事件接口。

## 调查结果与边界

**建议：优先进入受控升级验证，目标 10.2.0；不是仅改版本就宣称缺陷闭合。**

- **确证收益**：10.2.0 明确修复异步 `maxBuffer` 超限后进程不退出、Promise 悬挂；源码在捕获 `MaxBufferError` 后调用 `kill()`。这直接对应前序的持续运行反例。另修复同步 `maxBuffer:0`、无效 FD 导致宿主崩溃；后两项尚未确认本项目实际触发。
- **迁移风险**：10.0 要求 Node `>=22`，与当前 Node 24 范围相容；返回对象由 augmented ChildProcess 改为普通 Promise，Node 专属接口移至 `nodeChildProcess`，并移除 `execaCommand*`。已读主消费路径未使用被移除接口，但类型、同步选项和错误形状仍须验收。10.1 还改变 `extendEnv:false` 无 env、Windows batch 参数及若干同步行为，不能只复查 maxBuffer。
- **不随依赖自动解决**：Product `result.ts` 的完整性标记归一化仍由本项目负责；上游主动 kill 也不证明所有“超限＋非零退出”竞争都不会进入完成回调。字符串计量与严格 UTF-8 字节契约的差别也不能据此宣布修复。用户只需大致限额的取舍应由另行授权的契约工作处理，本报告不建议顺带引入精确字节捕获层。
- **验收重点**：stdout/stderr 超限且持续运行、超限后非零退出、正常非零退出、取消/超时竞争、SIGTERM 不响应、后代持管道，以及同步调用；在 Node 24 与实际 Bun 工具入口验证 callback 隔离、进程回收和错误标记。升级根依赖、lockfile、发布 manifest 后还需 exact candidate/installed-consumer 与 Gate 验收。

本轮仅核对材料与当前源码，未安装或执行 10.2.0，不能证明回收时限、跨平台或 Product 最终结果已正确。与前序使用“补充”关系，是保留其 9.6.1 现场并补充上游修复路径，不把文档调查冒充新版本运行复查。
