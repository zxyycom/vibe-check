---
title: 将 jscpd 版本作为 adapter provenance 而非项目政策
status: active
alignment: aligned
createdAt: 2026-08-28T06:12:49Z
purpose: 让 duplicateDetection 保留可信 v5 CLI 边界，同时用有界依赖范围和实际执行证据支持启发式门禁演进。
background: 精确锁定 scanner 只能购买逐版本复现，却不能直接提升防止项目过度偏离的门禁可信度，并会放大升级成本。
decision: 仓库锁定测试基线，发布 package 接受从该基线开始的同 major v5；实际版本只承担 availability、cache provenance 与诊断。
tags:
  - configuration
  - dependency-policy
  - product-contract
relations:
  - type: 修订
    target: let-duplicate-detection-adapter-own-cli-protocol.md
---

## 目的

- 让 `duplicateDetection` 服务“无法可信扫描时不虚假通过、项目明显偏离时由门禁暴露”的结果，而不承诺启发式分析结果逐版本完全相同。
- 保留 jscpd v5 的现有 CLI integration，同时避免把 scanner 精确版本、参数和性能调优扩张成 consumer policy。
- 让 repository baseline、package compatibility、实际安装证据与 runtime provenance 分别由正确边界拥有。

## 背景

- `duplicateDetection(options?)` 已以带默认值的专用 constructor 暴露 area-owned files/thresholds，以及 `{ kind: "package" } | { kind: "custom", executable }` command；adapter 独占 version、config、output 与自动 worker protocol。
- jscpd v5 npm package 只提供 Rust binary wrapper 和 CLI，不提供 Node.js function API；当前任务确认继续使用 v5，而不是迁回 v4 programmatic API。
- Vibe Check 的目标是通过可信门禁防止项目整体过度偏离，不是提供逐版本完全一致的精密性能或静态分析结果。exact inputs、malformed/out-of-scope rejection、失败闭合和实际 consumer execution 比 scanner patch identity 更直接地支撑该目标。
- 仓库当前以 lockfile 解析 jscpd `5.0.11`，可提供开发和 candidate 测试基线；若发布 manifest 也永远精确锁定，所有兼容升级、安全修复与安装协调都必须等待新的 `@zxyycom/vibe-check` 发版。

## 决策

- 采用: `duplicateDetection(options?)` 继续只暴露 area policy 与 package/executable-only custom command；不公开 args、availability args、workers、version、version range 或 probe bypass。
- 采用: 保留 jscpd v5 CLI adapter。package command 继续从已安装 manifest 解析受控 bin target并由 active Bun 执行；custom executable 继续直接接收 adapter-owned version/config/output arguments；adapter 不传 `--workers`，沿用实际工具的自动 worker policy。
- 采用: repository dependency 与 lockfile 固定当前实际测试基线 `5.0.11`；发布 candidate 从该基线声明同 major v5 的有界 range `^5.0.11`。candidate installation 必须验证实际解析版本满足 range、bin 保持在已安装 package 内，external consumer 必须使用该实际安装完成 duplicate-detection Run。
- 采用: version probe 只确认 executable 可运行且提供可识别的 provenance。任何可识别实际版本都进入 raw-cache identity，不因偏离 repository baseline 而单独失败；无法识别版本时拒绝 availability，防止多个未知工具版本共享 cache identity。
- 采用: compatible-range 内的 finding 变化属于启发式 scanner 演进，由 area thresholds 与项目 Gate policy处理；process、config、report、parse 或 exact-input failure 继续 fail closed 为 `unavailable`，绝不伪装为成功空结果。
- 采用: jscpd 新 major 需要显式更新 package range、adapter 与实际 consumer evidence；安装失败不进入 runtime，candidate 或 external consumer 验证失败不接受该 package。工具支持的 flag 或 semver 本身不创建新的 public capability。
