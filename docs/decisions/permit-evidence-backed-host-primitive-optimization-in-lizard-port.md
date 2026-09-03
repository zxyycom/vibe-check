---
title: 允许 Lizard port 使用证据闭合的宿主原语优化
status: active
alignment: unaligned
createdAt: 2026-09-03T09:06:06Z
purpose: 将 source alignment 约束在可观察分析语义，而不把 JavaScript 内建原语误作不可替换的上游契约。
background: 真实 TypeScript 语料已将主要热点定位到 Bun 上的组合正则扫描，底层库可能在不改变 analyzer 语义时改善执行成本。
decision: 允许私有 Lizard port 以经过兼容性、parity、打包和性能验证的实现或依赖替换宿主原语，并将差异显式纳入 deviation evidence。
tags:
  - dependency-policy
  - performance
  - product-contract
  - workflow-policy
relations: []
---

## 目的

- 让 Lizard port 继续保持可同步、可审计的上游语义，同时允许针对 TypeScript/Bun host 的可证性能实现。
- 防止将“近一比一翻译”误读为必须永久使用 JavaScript 内建 `RegExp`、生成器或其他宿主原语。

### 读取与采用边界

- **此记录的 owner：**它只拥有未来在 private Lizard port 采用等价宿主原语的长期约束和验收门槛；它不拥有任何 benchmark 数字、当前实现状态或某个候选的兼容性结论。
- **证据读取顺序：**先读[宿主加速候选调查](../investigations/survey-lizard-host-acceleration-candidates.md)取得候选的形成时证据与下一轮实验；其直接前序[真实 TypeScript 慢路径诊断](../investigations/diagnose-lizard-real-typescript-analyzer-hot-path.md)拥有热点定位，并继续追溯其两份直接前序以恢复 workload 和 measurement layer。
- **不得从本 Decision 推断：**它没有性能数字可供横向比较、相减或换算为 Product 加速；raw-scan、analyzer-only 与完整 Product 的数字分别由其 Investigation 在限定 workload 和计时边界内拥有。
- **当前关闭状态：**当前用户决定停止本轮 Lizard 性能实现；Node runtime-support/migration 与 WASM/Oniguruma 都不是正在执行的候选，当前 built-in `RegExp` 基线保持不变。此状态由[最新综合调查](../investigations/compare-lizard-regex-backends-and-analyzer-cost-allocation.md)的“当前关闭状态”拥有，本 Decision 不把历史候选门槛变成当前授权。
- **重新开启时的门槛：**只有某候选先在独立 Investigation 闭合本记录要求的语义、资源、打包和同 workload 性能证据后，才可由独立 Decision/Change 请求实施；否则保持 built-in `RegExp` 基线。

### 适用范围与非授权边界

- 本 Decision 只定义**未来**在 private Lizard port 内评估和采用等价宿主原语的条件；当前 built-in `RegExp` 是已对齐基线。
- 它不直接授权安装依赖、修改 tokenizer、改变 Worker protocol、增加 Product 配置或公开 API。每个候选仍须有独立 Investigation、Decision 和 Change，并以该 Change 的验收证据决定是否采用。
- 它不改变 port façade / Product adapter 的责任边界，也不减损 source identity、oracle、deviation、extension lifecycle 或公开 surface 的既有 owner 和验证要求。
- “宿主原语”指实现正则、token scanning 或等价局部执行机制的项目代码或依赖；它不是把 Lizard analyzer 改造成通用 parser、plugin framework 或可切换 backend 产品功能的许可。为 differential test 临时加入的 seam 必须非导出、仅测试可达并在采用后移除，不能演化为持久的可配置 backend interface。

## 背景

- 当前 source-aligned port 已保持上游模块、reader、token stream、processor、状态机、函数信息和 extension lifecycle，并以 oracle、source identity 与 deviation evidence 验证。
- 真实 TypeScript analyzer-only 调查已排除当前 reader path matching，将主要热点定位到 source-aligned combined-regex tokenization 在 Bun/JavaScriptCore 上的重复扫描；仅缓存 `RegExp` 构造没有实质价值。
- 上游 Python 代码规定的是 tokenizer 产生的 token 和后续分析生命周期，不规定 TypeScript host 必须使用哪一个正则引擎或标准库实现。正则库、WASM、native addon 或等价扫描实现都可能继续表达同一分析语义，但会引入各自的语法、Unicode、资源、打包和供应链边界。

## 决策

### 保持不变的 source-alignment 契约

- 采用：source alignment 约束 analyzer 的可观察语义和可同步结构，包括 token stream、reader 选择、processor 顺序、状态机转换、函数边界与字段、extension lifecycle、错误和取消边界；它不要求 TypeScript 与 Python 使用相同语言原语、标准库或执行引擎。

### 允许的实现位置与禁止的扩张

- 采用：private port 可以使用项目实现或第三方依赖替换正则、token scanning 或其他宿主原语。具体替换必须留在 port 私有边界，不成为 Product 选项、public plugin API、backend abstraction、Python runtime、subprocess 或静默 fallback。
- 不采用：不以源码文本相似度否定已有 parity evidence 支持的优化，也不以输出样例相等代替完整 token stream、生命周期、资源和分发验证。

### 每个候选的采用门槛

- 采用：每个非机械优化必须在独立 Investigation/Decision/Change 中明确候选和回退边界，并进入 current deviation evidence。
- 采用：验收至少证明完整 token-stream differential、27-reader oracle、source identity、processor/extension protocol、真实目标 corpus before/after、typecheck/lint 和 required/full Gate；无法证明语义等价或稳定收益时不采用。
- 采用：引入库时同时验证所需 regex/Unicode/zero-width/capture/global-iteration 语义、Bun Worker 与取消/资源行为、package artifact 和支持平台装载、版本与完整性固定、license/security 以及无运行时下载或系统级隐式依赖。WASM、Node-API 或其他 native 载体不因“更快”自动获得例外。

### 当前基线与未预选的技术

- 采用：当前 built-in `RegExp` 实现继续是已对齐基线；本决策只建立允许评估和采用等价 host primitive 的未来方向，不预先选择 PCRE2、RE2、Oniguruma、WASM、native addon 或手写 scanner，也不把 profile 占比当成可回收承诺。
