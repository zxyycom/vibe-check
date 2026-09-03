---
title: "复测 reader fast path 的完整 functionMetrics Product 路径"
formedAt: "2026-09-03T08:10:08Z"
question: "在同一真实仓库 Product 源 corpus、同一主机和 warmed operation 条件下，reader-resolution fast path 提交 dd9635d 相对其直接父提交 e2bad65 的完整 functionMetrics Product 路径是否保持输出等价，并呈现可区分的 wall-time 变化？"
tags:
  - "function-metrics"
  - "lizard"
  - "performance"
  - "product-runtime"
  - "verification"
relations:
  - type: "复查"
    target: "verify-lizard-reader-resolution-fast-path.md"
---

## 形成时背景

此前 [reader fast path 验收](verify-lizard-reader-resolution-fast-path.md) 在 fixed Lizard 1.24 **synthetic representative** batch 上重建原 façade，对当前 `analyzeLizardSource` 作同进程 warmed-operation 对照，确认该层有明显收益；其报告明确不覆盖 Product 调度、文件读取、解码、Worker、adapter 或 settlement。本轮遵照该边界，以直接相邻 revisions 复测完整 Product-owned `functionMetrics` 调用链，且不把旧有 analyzer-only B scope 当作本轮的替代。

被比较的 before 是 `e2bad655dde89d07c48413fae4c6167746e10708`；after 是其直接子提交 `dd9635d05ddbeb7b0c821ded527b43e298648a38`。该实现变化只在 hand-written `analyzer/port-facade.ts` 引入安全 filename 的 reader-resolution fast path；本轮未修改 Product runtime、未切换工作区 revision，也未修改任何 analyzer core/readers/shared/protocol。

## 调查目的

1. 在 fixed、可核验输入上确认 before/after 的完整 Product snapshot 没有漂移。
2. 测量从 public `src/index.ts` API 发起的完整 `functionMetrics` path，而不是 direct analyzer harness。
3. 保留交替 block 的所有样本和环境/revision identity，评估该 Product scope 中可确认的 wall-time 变化，并明确不可外推范围。

## 调查范围与依据

**Corpus 不是 synthetic representative fixture。** 输入是 `e2bad65` 中 254 个已跟踪、非测试、非 fixture、非 test-support 的 `src/**/*.ts` **真实 Product runtime source files**，总计 1,138,778 bytes；它排除 `src/package-checks/function-metrics/analyzer/port-facade.ts`，因为该文件正是 before/after 的唯一 Product-source corpus drift。两个临时 detached worktree 对每个选中 path 做 byte-for-byte 比对后才开始；完整 entries、bytes 和 manifest digest 见 [corpus-manifest.json](./_resources/remeasure-function-metrics-product-reader-fast-path/corpus-manifest.json)。这是一份真实仓库源的固定 corpus，但它只有 TypeScript 文件，不代表 27 个 reader family、任意 consumer repository、malformed input 或长期 session。

每个 fresh Bun target dynamic-import 自己 revision 的 `src/index.ts`，但二者均以 before worktree 作为同一 immutable `projectRoot`；这使 explicit input paths、读入 bytes、输出 Record identity 保持固定，而被测 Product implementation 和 Worker 相对模块来自各自 revision。调用为 `defineConfig` + `functionMetrics` + `run`；`files.include` 传入全部 254 条 exact paths，non-blocking 低阈值确保 finding Records 和 Check settlement 都实际执行。该路径覆盖 explicit selection/admission、bounded file read、UTF-8 decode、Worker transport、Product adapter、port façade/analysis、finding Record creation 与 final snapshot settlement；它不含 machine publication、diagnostic/progress rendering、Project Gate 或 process cold-start import。

先分别运行 complete Product preflight；两边都是 1 Check、3,686 Records，snapshot JSON SHA-256 均为 `12bd0612ebf16a9ee7f24f1e13af229be676db1ab3f1e448484306aeb264fccc`。随后每个 target 先运行一次未计时的完整 Product warmup；`operationWallMs` 只包围第二次完整 Product run。15 个 block 以奇数 ABBA、偶数 BAAB 交替，各 condition 30 个计数样本；每个样本重新检查同一 snapshot digest，保留 IQR 标记但不删除样本。运行时是 Bun 1.3.14、Linux x64、AMD Ryzen AI 7 H 450（详情、driver SHA-256、tree/revision identity、顺序和 raw samples 见 [evidence.json](./_resources/remeasure-function-metrics-product-reader-fast-path/evidence.json)）。

## 调查结果与边界

**已证实（仅此 host、此 corpus、此 warmed-operation protocol）。** 所有 60 个计数样本均通过完整 snapshot equality guard；没有发现 output drift。计时统计如下，所有样本均保留：

| 指标 | before：e2bad65 原 façade | after：dd9635d fast path |
| --- | ---: | ---: |
| 30 个 operation samples median | 4,799.25 ms | 4,636.53 ms |
| 30 个 operation samples p90 | 7,660.07 ms | 5,532.27 ms |
| IQR 标记样本数 | 7 | 4 |

after 的 unpaired median 低 **3.39%**。按 15 个 ABBA/BAAB block 中每侧两个 sample 的 geometric mean 配对，before/after median ratio 为 **1.0286**，median delta 为 **133.75 ms**，15 个 block 中 10 个为正。raw 样本中有多段同时影响两侧的明显 host slowdown（例如 before 9,210.97 ms、after 8,568.57 ms），故 p90 差异不能单独解释为实现收益。

**推断。** 在这份真实 Product runtime corpus 中，测量与小幅 after 下降方向一致，但幅度接近本轮配对噪声：5/15 block 方向相反，且没有为本轮定义或计算稳定性 CI。因此本轮**不能证明** reader fast path 对完整 Product path 有可区分、可推广的稳定加速；更不能以 fixed analyzer batch 的约 45% operation 降幅外推完整 Product latency。完整路径中的 read/decode、Worker 生命周期、Record/settlement 和 host load 均会稀释或掩盖 façade-only 成本。

**边界与未获授权项。** 这不是 cold-start、long-lived session、CPU/RSS、consumer workload、跨主机/运行时或多语言 reader corpus 测量，也没有 isolate 各 Product stage 的因果占比。相同 snapshot 只证明本 corpus 和该公开配置的输出等价，不能替代 filename differential/oracle。该调查不授权进一步优化 translated core、reader、tokenizer、Worker、I/O 或 Product settlement；若需要作性能决策，应在明确 consumer corpus、稳定 host 条件和预定义统计阈值下重新调查。

## 随附资源

- [corpus-manifest.json](./_resources/remeasure-function-metrics-product-reader-fast-path/corpus-manifest.json)
- [evidence.json](./_resources/remeasure-function-metrics-product-reader-fast-path/evidence.json)
- [product-driver.ts](./_resources/remeasure-function-metrics-product-reader-fast-path/product-driver.ts)
- [run-benchmark.py](./_resources/remeasure-function-metrics-product-reader-fast-path/run-benchmark.py)
- [summary.json](./_resources/remeasure-function-metrics-product-reader-fast-path/summary.json)
