---
title: "验证 Lizard reader-resolution fast path 性能"
formedAt: "2026-09-03T07:34:42Z"
question: "当前手写 façade 的 reader-resolution fast path 在 fixed Lizard 1.24 representative request 上是否保持重建的原 façade 路径输出，并在同主机 warmed operation 中降低分析时间？"
tags:
  - "function-metrics"
  - "lizard"
  - "performance"
  - "source-alignment"
  - "verification"
relations:
  - type: "补充"
    target: "diagnose-lizard-typescript-port-performance-gap.md"
---

## 形成时背景

[TypeScript Lizard port 性能差距根因](diagnose-lizard-typescript-port-performance-gap.md)将 ordered reader dispatch 定位为 fixed representative batch 上的主要候选，并提出不触碰 source-aligned core 的 façade 层候选。本轮记录已实施的 private resolver 验收，而非重新解释前序 profile 或扩展优化范围。

被验收的实现变化只在手写 `src/package-checks/function-metrics/analyzer/port-facade.ts`：当前 façade 对已证明安全的完整 ASCII filename grammar 使用 canonical final-suffix index；不属于该 grammar 的输入仍经 `get_reader_for` fallback，grammar 内的 unknown suffix 直接保持 unsupported。before 与 after 都使用同一 `analyzeSourceCode` analyzer core；本报告不记录或授权 tokenizer、reader、shared/protocol 或 runtime 的修改。

## 调查目的

1. 以与原 façade 等价的完整输出 preflight，确认当前 façade 路径没有在该固定请求上产生结果漂移。
2. 在同一 Bun 进程内，对重建的 before façade 路径与当前 `analyzeLizardSource` after 路径作 15 个交替 block 的 warmed-operation 对照。
3. 保存可复算的脚本、请求/实现身份和所有 raw samples，并明确本轮不能证明的范围。

## 调查范围与依据

对象是 fixed Lizard 1.24 representative request 的 3,456-file batch。验收时的 `HEAD` 是 `e2bad655dde89d07c48413fae4c6167746e10708`；request SHA-256 是 `7b0c68abab42a12e1f6799d94f8e23f777600dcca1a8e484d18048b5c0bf68ff`，当前 façade SHA-256 是 `26e302c377b39cc68374404ebcdd539e84d6002bfa821231b92a98c1918b0c1b`。运行环境是 Bun 1.3.14、Linux x64、`dev-container`（AMD Ryzen AI 7 H 450 w/ Radeon 860M）。

**Before 重建。** 每次 before operation 严格执行 `get_reader_for -> analyzeSourceCode -> 原 port-facade 的 function_list map/Object.freeze -> performance-harness metric map/Object.freeze`；因此并未遗漏原 façade 的 function-list 映射和冻结。after operation 执行 `analyzeLizardSource -> performance-harness metric map/Object.freeze`。

**等价与计时方法。** 计时前，两个路径的 JSON 字节完全一致，并通过 `deepStrictEqual`；结果为 3,456 个 functions、716,763 JSON bytes，摘要 SHA-256 为 `7bdcbbcbc3ea4177f9a49f502d3f011c1ae0d29eea6a0da9cf7f30e9152f01b8`。每个计时 operation 都再次核对完整结果摘要。preflight 后每侧执行两次不计时的完整 operation；随后在同一进程做 15 个 block，奇数 block 为 ABBA、偶数 block 为 BAAB，各侧共 30 个 raw samples。`performance.now` 只包围所选 façade 路径及 benchmark metric mapping；request parse、import、preflight、warmup 和 digest calculation 不计入。

资源中的脚本 SHA-256 为 `8f6205c450a82c3f02b8790822ce83fe5c04f582d39f78559e672ac8d3eed3cb`；JSON 保存运行时、顺序、原始样本、所有摘要和 identity。

## 调查结果与边界

**已证事实（本请求、该工作树和该 host/process）。**

| 指标 | before：重建原 façade | after：当前 `analyzeLizardSource` |
| --- | ---: | ---: |
| 30 raw samples 的 median | 603.74 ms | 332.25 ms |
| 30 raw samples 的 p90 | 647.74 ms | 375.87 ms |

after 的 median 比 before 低 **44.97%**。配对 block 的 median delta 为 **266.48 ms**，median before/after ratio 为 **1.785**，15/15 block delta 均为正；30 个 sample pair 的 median delta 为 **272.95 ms**，median ratio 为 **1.812**，30/30 均为正。就已记录的同主机、同进程 warmed 测量而言，这支持当前 façade fast path 相对完整 before 重建路径的时间下降，且 preflight 与每次 operation digest 未发现该 request 的输出漂移。

**边界与未获授权项。** 这是同 host、同 process 的 warmed-operation 证据，不能作为跨主机 performance budget，也不是 long-lived Product session 的测量；计时也不涵盖 Product 调度、文件读取、解码、import 或前置请求构建。byte/deep parity 只覆盖此 fixed representative request，不替代任意 filename、reader fallback 或语言分布的完整 oracle。该结果不构成对 source-aligned core、tokenizer 或 runtime 优化的授权，也不改变前序报告关于其他候选需独立验证的结论。

## 随附资源

- [facade-acceptance.json](./_resources/verify-lizard-reader-resolution-fast-path/facade-acceptance.json)
- [facade-acceptance.ts](./_resources/verify-lizard-reader-resolution-fast-path/facade-acceptance.ts)
