---
title: 允许 Lizard port 使用证据闭合的宿主原语优化
id: 260903-permit-evidence-backed-host-primitive-optimization-in-lizard-port
status: active
alignment: unaligned
createdAt: 2026-09-03T09:06:06Z
purpose: 将 source alignment 约束在可观察分析语义，而不把 JavaScript 内建原语误作不可替换的上游契约。
background: 真实 TypeScript 语料已将主要热点定位到 Bun 上的组合正则扫描，底层库可能在不改变 analyzer 语义时改善执行成本。
decision: 允许私有 Lizard port 以经过兼容性、parity、打包和性能验证的实现或依赖替换宿主原语，并将差异显式纳入 deviation evidence。
tags:
  - dependency-policy
  - function-metrics
  - lizard
  - performance
  - product-contract
  - source-alignment
  - workflow-policy
relations: []
---

## 目的

让 Lizard port 保持可同步、可审计的上游分析语义，同时允许以完整证据采用更合适的 TypeScript 宿主原语；近一比一翻译不等于永久绑定 JavaScript 内建 `RegExp`、生成器或标准库实现。

## 背景

- 形成本判断时，source-aligned port 已保留上游模块、reader、token stream、processor、状态机、函数信息和 extension lifecycle，并由 oracle、source identity 与 deviation evidence 验证。
- 真实 TypeScript analyzer-only 调查排除了当时的 reader path matching，将主要热点定位到 Bun/JavaScriptCore 的 combined-regex 重复扫描；仅缓存 `RegExp` 构造没有实质价值。
- 上游 Python 定义 token 和后续生命周期，而非 TypeScript host 的实现引擎。正则库、WASM、native addon 或等价扫描可能保持同一语义，但各有语法、Unicode、资源、打包和供应链成本。

### 形成时证据的读取

[宿主加速候选调查](../investigations/survey-lizard-host-acceleration-candidates.md)保存候选证据与下一轮实验；
其直接前序[真实 TypeScript 慢路径诊断](../investigations/diagnose-lizard-real-typescript-analyzer-hot-path.md)拥有热点定位，继续追溯其两份直接前序可恢复 workload 与 measurement layer。
[综合调查](../investigations/compare-lizard-regex-backends-and-analyzer-cost-allocation.md)保存当轮停止事件，不拥有今天的持续状态。
raw-scan、analyzer-only 与完整 Product 数字分别由相应 Investigation 在限定输入和计时边界内解释，不能跨层相减或换算为 Product 加速。

## 决策

### 语义与私有边界

- 采用: source alignment 约束可观察分析语义及可同步结构：token stream、reader 选择、processor 顺序、状态转换、函数边界与字段、extension lifecycle、错误和取消边界。宿主原语可以不同；不以源码文本相似度否定已有 parity evidence 支持的优化，也不以少量输出样例相等代替完整 token stream、生命周期、资源和分发验证。
- private port 可使用项目实现或第三方依赖替换正则、token scanning 等局部机制。替换保持 port façade / Product adapter 分工及现有 source identity、oracle、deviation、生命周期和公开 surface 的验证要求。
- 替换不成为 Product 配置、public API、plugin framework、可切换 backend、Python runtime、subprocess 或静默 fallback。differential test 的临时 seam 必须非导出、仅测试可达并在采用后移除。

### 每个候选的采用门槛

1. 在独立 Investigation、Decision 和 Change 中明确候选与回退边界，并进入 current deviation evidence；独立 Investigation 先闭合语义、资源、打包与同 workload 性能证据，随后才请求实施。
2. 至少证明完整 token-stream differential、27-reader oracle、source identity、processor/extension protocol、真实目标 corpus before/after、typecheck/lint 和 required/complete `--all` Gate。语义等价或稳定收益无法证明时不采用。
3. 引入库还须验证所需 regex/Unicode/zero-width/capture/global-iteration 语义、supported Product Worker 的取消与资源行为、artifact 与支持平台装载、版本/完整性固定、license/security，以及无运行时下载或系统级隐式依赖。WASM、Node-API 等载体遵守同一门槛。

### 未来方向与实施授权

本记录只建立未来等价替换的条件，不拥有 benchmark 数字、当前实现状态或某个候选的兼容性结论。
形成时已对齐基线为 built-in `RegExp`，候选证据不足时保持该基线；未预选 PCRE2、RE2、Oniguruma、WASM、native addon 或手写 scanner，profiler 占比也不是可回收性能承诺。

今天是否开展工作由当前请求授权，由对应 Change 承接范围、实施与验收。本记录本身不启动性能工作，也不直接授权依赖安装、tokenizer 修改、Worker 协议、Product 配置或公开 API 变更。
