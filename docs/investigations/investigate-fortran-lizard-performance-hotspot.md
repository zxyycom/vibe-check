---
title: "固定 Lizard 1.24 Fortran 语料性能热点轻量复核"
formedAt: "2026-09-03T07:59:46Z"
question: "在当前 TypeScript Lizard port 的固定 Fortran 1.24 语料中，剩余差距位于哪一层、是否有不触及 translated core 的修复点，以及是否值得现在实施？"
tags:
  - "fortran"
  - "function-metrics"
  - "lizard"
  - "performance"
  - "source-alignment"
relations:
  - type: "补充"
    target: "diagnose-lizard-typescript-port-performance-gap.md"
---

## 形成时背景

用户确认 ST 与 Ruby 暂不调查，并明确 Fortran 也不是主要优化目标；本轮因此不扩展 tokenizer、逐 regex 或反事实实现，只把已有性能调查中的 Fortran 观察收敛为一个可复核的轻量结论。调查形成时仓库为 `dd9635d05ddb`；没有修改 Product、port façade、reader registry、translated core/readers/shared 或测试。

## 调查目的

确定既有 fixed Lizard 1.24 Fortran family observation 的准确适用范围，判断热点是否落在可独立修改的 façade/adapter 层，以及在缺少真实 Fortran workload 或性能预算时是否应进入实施。

## 调查范围与依据

- 复核前序报告及其 `reader-family-medians.json` 资源。Fortran slice 是 Lizard `1.24.0` commit `308b1c3efd8c1c69bcc3eb82deeaec64fd3662ec` 的 `normal.f` 与 `edge.f70`，各复制 64 次：128 files、20,864 bytes。
- 该资源的方法是 **pre-resolved reader、direct in-memory core**，每 runtime/family 15 次顺序 warmed observation；Python 为 CPython 3.12.13/Lizard 1.24，TypeScript 为 Bun 1.3.14。它明确不是 cross-runtime ABBA，也不是正式 before/after。
- 读取当前 `readers/fortran.ts`、共享 `shared/code-reader.ts` 与上游 `lizard_languages/fortran.py`。FortranReader 每个输入会在 `generateTokens` 组装 Fortran-specific addition/endings；共享 tokenizer 再构造 token RegExp。其 token 经 Fortran preprocess、默认 processors 和 FortranStates 状态机惰性消费。现有采样 profile 只将 Fortran tokenizer 列为后续热点，未把 setup、tokenization、processors、状态机或对象分配量化分离。

## 调查结果与边界

**已确认事实。** 固定 corpus 中，Python median 为 10.760102 ms，TypeScript median 为 74.282220 ms，差为 63.522118 ms（约 6.90×）。这只证明该 Fortran slice 的 direct in-memory reader/core 差距；因 reader 已预解析，它**不包含** port façade 或 ordered registry dispatch，亦不包含文件读取、解码、Worker 和 Product settlement。

**已确认代码边界。** 当前 Fortran 路径没有独立于 analyzer port 的 façade/adapter 热路径：上述 scope 已绕过 reader selection；余下执行属于 `FortranReader`、`FortranStates`、共享 `CodeReader.generateTokens` 和 default processors。故任何试图降低该 observed cost 的实质候选，至少会修改 reader-local translated core 或 shared translated core；没有本轮可推荐的 façade-only 修复点。

**有限推断。** 动态 pattern/setup 与 shared tokenizer 是可信的后续检查顺序，原因是它们在每个 Fortran input 被执行且现有 sampling profile 点名 tokenizer；但现有材料**不能证明**它们各自占多少时间，也不能排除 state-machine dispatch、Set/string 操作、processor traversal 或运行时对象分配。不能把 63.5 ms gap 拆分或承诺可回收比例。

**建议（非实施授权）。** 现在不实施、不建 Change/Decision，也不扩展 core 调查。理由是：用户已把 Fortran 定位为少用语言；没有真实 consumer corpus、Fortran latency budget 或 Product-level regression；现有数字是小型固定 fixture 的非 ABBA hotspot ranking，而非 Product performance evidence。只有出现 Fortran-heavy consumer workload、明确 budget，或 source-alignment 边界另获授权时，才应以 token stream、metrics/output equality guard 和同一 fixed corpus 重开 scoped core investigation。

**不适用范围。** 本结论不评价 ST、Ruby 或其他 reader，不证明 Python 与 Bun 任一 runtime 更适合 Product，也不授权改变 Lizard 1.24 source alignment。

## 随附资源

- [固定 Fortran family 输入与既有观察摘录](./_resources/investigate-fortran-lizard-performance-hotspot/fortran-family-evidence.json)
