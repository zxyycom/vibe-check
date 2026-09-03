---
title: "Lizard 与 SCC 的 TypeScript 迁移优先级比较"
formedAt: "2026-09-01T05:50:33Z"
question: "在 Vibe Check 当前的产品契约、依赖分发与兼容范围下，Lizard 和 SCC 哪个更值得迁移为 Product-owned TypeScript backend，现有 Lizard Change 是否仍可实施？"
tags:
  - "dependency-policy"
  - "file-metrics"
  - "function-metrics"
  - "scanner-backends"
  - "typescript-migration"
relations: []
---

## 形成时背景

Vibe Check 的 `functionMetrics` 与 `fileMetrics` 分别通过 owner-local adapter 调用 Lizard 与 SCC；二者不是共享 scanner subsystem 中可互换的 backend。[scanner dependency owner](../scanner-dependencies.md) 要求每个 Check 自己拥有 command、availability、process、parser、measurement conversion 与 failure semantics，公共 exact-input capability 只承接真实共同不变量。

形成本报告时，仓库通过 [`mise.toml`](../../mise.toml) 锁定 `lizard@1.23.0` 与 `scc@3.7.0`。`functionMetrics` 接受 canonical `1.23.<patch>` Lizard，`fileMetrics` 只接受 SCC `3.7.0` version/CSV contract；两项 default Check 都要求 consumer runtime 另行提供 executable。当时的上游最新版本已分别是 Lizard `1.24.0` 与 SCC `v4.0.0`，因此安装 latest 不是任一当前 adapter 的兼容路径。

仓库当时还有 active Plan `port-lizard-function-metrics-to-typescript`。该 Plan 在形成时的[原始 proposal 快照](https://github.com/zxyycom/vibe-check/blob/72722d6fea38fee64f3a88919d0f2e7000e30692/changes/port-lizard-function-metrics-to-typescript/proposal.md)只把 `.ts`、`.d.ts` 与 `.rs` 纳入迁移，明确排除 `.tsx`、`.js` 与 `.jsx`；它与 `HEAD 72722d6fea38fee64f3a88919d0f2e7000e30692` 已相距 83 个提交、Change 目录外累计变化 213,652 行。

2026-08-30 建立且已对齐的长期决定 [`align-function-metrics-inputs-with-lizard-supported-languages.md`](../decisions/archive/align-function-metrics-inputs-with-lizard-supported-languages.md) 已把 `functionMetrics` eligibility 扩展到 Lizard 1.23 官方 reader 范围。当前 [`target-files.ts`](../../src/package-checks/function-metrics/target-files.ts) 列出 55 个扩展名，default include 与 runtime predicate 共用该 registry。因此旧 Plan 的问题是直接语义漂移，不只是 Git 距离较大。

**使用约束。** 本报告保存形成时的比较证据、推断和建议，不是当前规范、长期 Decision 或实施授权。阅读者应以当前 owner 文档、aligned Decisions、产品代码与 active Change 为准；本报告只用于理解“为什么需要重新规划”和复核本轮结论。

## 调查目的

本轮要回答：

1. “Lizard 源码较小、更新不频繁、Python 分发不如 SCC 简单”分别是事实、相对判断还是错误前提？
2. 在“免手工安装”“统一 Bun runtime”“消除 subprocess/native backend”三个不同目标下，哪个依赖更值得优先迁移为 TypeScript？
3. 上游规模、覆盖面与活跃度是否足以支持 full-parity port，还是只支持更小的分发改进？
4. 旧 Lizard Change 是否仍与当前 owner 和长期决定一致；若不一致，恢复实施前缺少什么？
5. 哪些未知事实会改变结论？

## 调查范围与依据

**方法。** 三个只读子任务分别调查 Lizard、SCC 和比较性产品/架构判断，主线程再对照仓库 owner、active Decisions、Change Plan、官方 tag/release 与临时 source checkout 交叉核对。临时 clone 位于仓库外 `/tmp`，没有保存为长期资源；下文给出 tag、revision、计量口径和官方链接以便复核。没有安装依赖、修改 lockfile、运行远端写入或建立发布资产。

**仓库依据。** 主要读取了 [`functionMetrics` 指南](../checks/function-metrics.md)、[`fileMetrics` 指南](../checks/file-metrics.md)、[scanner dependency owner](../scanner-dependencies.md)、[`functionMetrics` target registry](../../src/package-checks/function-metrics/target-files.ts)、[`fileMetrics` measurement model](../../src/package-checks/file-metrics/measurement-model.ts)、[`SCC` parser](../../src/package-checks/file-metrics/scc/parser.ts)、[共享 file selection defaults](../../src/package-checks/project-files/configuration.ts)、上述语言范围 Decision、[Lizard 后置 Decision](../decisions/archive/defer-lizard-until-after-check-foundations.md) 与旧 Change 的 proposal/design/tasks。旧 Change 的 `stage=plan`、`2/9` 与机械有效性来自 `bun run change-plan -- show/check`；机械有效不证明内容仍可实施。

**Lizard 上游依据。** 当前产品 baseline 是官方 tag [`1.23.0`](https://github.com/terryyin/lizard/tree/1.23.0)、commit `06284ec87c1966fee4ddbf3f068ccf89b987b0f8`。对 `lizard.py`、`lizard_languages/*.py` 与 `lizard_ext/*.py` 的物理行计量得到 64 个 Python 文件、8,282 行；这包含空行/注释，不代表 semantic LOC、迁移工时或维护复杂度。1.23 registry 有 27 个 language readers，当前产品将其投影为 55 个 eligible extensions。

版本与上传历史来自 [PyPI JSON](https://pypi.org/pypi/lizard/json) 和 [GitHub releases](https://github.com/terryyin/lizard/releases)：2025 年有 19 个发布版本，2026-01-01 至 2026-08-19 有 12 个，最新 `1.24.0` 于 2026-08-19 发布。[`1.23.0...1.24.0`](https://github.com/terryyin/lizard/compare/1.23.0...1.24.0) 包含 34 个 commits、51 个 changed files，并含多个 reader 的语义修复。

Lizard 1.24.0 PyPI wheel 是跨平台 pure-Python artifact，但仍要求 Python，并声明 `pygments` 与 `pathspec` runtime dependencies；1.23 GitHub release 没有 SCC 同类的多平台 standalone binaries。顶层 [`LICENSE.txt`](https://github.com/terryyin/lizard/blob/1.23.0/LICENSE.txt) 与 setup metadata 标示 MIT，核心 [`lizard.py`](https://github.com/terryyin/lizard/blob/1.23.0/lizard.py) 文件头则标示 Apache-2.0。本报告不作法律判断；这一差异足以要求 direct translation 前先完成 file-level provenance、notice 与 package license 审计。

**SCC 上游依据。** 当前产品 baseline 是官方 tag [`v3.7.0`](https://github.com/boyter/scc/tree/v3.7.0)、commit `74d4df231aad307f24149456afb1bd420e0f71be`。排除 vendor、examples 与 tests 后，Go production 近似为 16 个文件、19,061 physical lines；[`languages.json`](https://github.com/boyter/scc/blob/v3.7.0/languages.json) 另有 8,578 行、358 个 top-level language definitions。机械检查还观察到 563 个 extensions、281 个带 complexity 配置的语言和 3,550 个 complexity patterns。这些数字只描述 3.7 data surface，不能直接换算 port 工时或永久 Product contract。

SCC 不只是按换行计数：[`workers.go`](https://github.com/boyter/scc/blob/v3.7.0/processor/workers.go) 与 [`detector.go`](https://github.com/boyter/scc/blob/v3.7.0/processor/detector.go) 处理 language detection、string/docstring、line/multiline/nested comments、escape、shebang、ambiguous extensions 与 complexity matching。Vibe Check 同时消费 CSV 的 `Code` 与 `Complexity`；后者决定 low-decision-token allowance，所以“只实现 LOC”不能保持当前 finding policy。

官方 [`v3.7.0 release`](https://github.com/boyter/scc/releases/tag/v3.7.0) 通过 GoReleaser 提供 Darwin/Linux/Windows 的 arm64/x86_64 等预编译 binary 与 checksums，压缩资产约 1.65–1.90 MB。形成时没有发现 boyter 官方 npm binary wrapper；若由 Vibe Check 随包分发，仍需设计 platform optional packages、checksum/license、package size、缺失平台与 custom executable fallback，不能表述为现成能力。上游 `v4.0.0` 已于 2026-08-24 发布，说明 SCC 的语言与 complexity 数据也在持续演进。

**未覆盖。** 本轮没有取得真实 consumer 的安装失败率，没有建立正式 process latency、memory、cold-start 或 package-size budget，没有完成法律意见、安全审计、全语言 differential corpus，也没有验证 platform optional package 与 candidate/install contract。两项工具解决的问题不同，因此本报告不以临时 wall-clock 对比推导 TypeScript port 的性能收益。

## 调查结果与边界

### 结论

**相对优先级：如果未来必须选择一个依赖迁移为 Product-owned TypeScript backend，应优先考虑 Lizard，而不是 SCC。** 最强依据是 Lizard 给 Bun/npm consumer 带来的 Python runtime 与 Python package 分发摩擦；其次才是本轮选择口径下较小的上游 source surface。SCC 已有多平台静态 binary，若目标只是免手工安装，先改进 binary distribution 比重写 counter 更小。

**绝对判断：这个相对优先级不等于“现在应立即移植 Lizard”。** 当前 `functionMetrics` 已承诺 Lizard 1.23 的 27 readers/55 extensions；full-parity port 是多语言 analyzer ownership，不是旧 Plan 所设想的 TypeScript/Rust 小范围替换。实现前仍需完整差分语料、性能/安装基线、license/provenance 路径与明确授权。

**旧 Change 不可直接恢复。** 它虽机械有效，却与当前 aligned language owner 冲突。若继续推进，应删除并以当前完整兼容面重新建 Change；不能静默收窄语言，也不应把 Lizard 与 SCC 合进同一 Change 或抽象成 generic scanner framework。

### 对原判断的校准

| 原判断 | 结论 | 依据与边界 |
| --- | --- | --- |
| Lizard 源码不算多 | **部分成立，仅能作相对判断** | 所选 Lizard surface 为 8,282 physical lines，低于 SCC engine + language data；但当前兼容成本由 27 readers 的 function/metric 语义决定，不能由行数直接推导 |
| Lizard 更新不勤快 | **不成立** | 2025 年 19 个版本，2026 年截至 8 月 19 日 12 个版本；1.23 到 1.24 也包含多项 reader 修复 |
| Python 分发远没有 SCC 简单 | **成立，是最强优先依据** | Lizard 需要 Python 与 Python dependencies；SCC 上游已有 checksummed 多平台 binary，但 Vibe Check 随包分发方案仍待设计和验证 |

### 已确认事实

| 维度 | Lizard | SCC | 对迁移判断的含义 |
| --- | --- | --- | --- |
| 当前 consumer 依赖 | 额外 Python/Lizard 环境；仓库用 uv + pipx | 额外 SCC executable | Lizard 的 runtime 统一收益更直接 |
| 当前产品兼容面 | 27 readers、55 extensions，以及 function boundary/NLOC/CCN/parameters/location/name | 默认 `**/*`；消费 `Code` 与 `Complexity` | 两者都不是少量 regex；Lizard 的旧小范围方案已失效，SCC full parity 更宽 |
| 指示性上游规模 | 64 个所选 Python 文件 / 8,282 physical lines | 16 个所选 Go 文件 / 19,061 physical lines，另有 358-entry language data | 仅支持“Lizard 相对较小”，不证明任何 port 较小 |
| 上游活动 | 近期发布频繁，1.24 已超过 baseline | 2026 年已发布 3.7 与 4.0 | port 会把持续 parser/data 修复责任转给 Product，而不是消除它 |
| 更小替代路径 | 无同等成熟的官方 standalone binary matrix | 官方预编译 assets 可作为 platform package 调查输入 | SCC rewrite 不是解决安装体验的最小动作 |
| provenance | 顶层 MIT 与核心文件 Apache-2.0 header 待审 | MIT；再分发仍需 notice 与供应链审计 | direct translation/copy 前都需审计 |

### 推断与建议

三个可能目标必须分开决策：

- **免 consumer 手工安装工具：** 优先调查 Lizard 的替换或自包含分发；SCC 先调查 checksum-pinned platform optional packages 与 custom executable fallback。
- **统一 Bun-only runtime：** Lizard port 的边际收益更大，但只移除 Lizard 仍不能使完整产品摆脱 SCC native backend。
- **零 subprocess、零 native/external backend：** 最终两者都需处理；这是新的产品责任，需要明确语言范围、性能和维护预算，不能从当前 Change 自动推导。

若重新规划 Lizard，建议保持当前 55-extension/27-reader observable compatibility，以 pinned Lizard 1.23 建立完整 differential oracle，并采用 hard cut；升级到 1.24 应作为独立结果。若要收窄语言支持，必须先修订或取代 aligned Decision，并提供 public migration，不能把它伪装成 private backend replacement。TS/Rust fast path + Lizard fallback 既不能删除依赖，也与既有 hard-cut 方向冲突。

对 SCC，建议继续保留 owner-local external backend。只有在目标环境禁止 native executable/subprocess、官方 assets 缺少目标平台、binary 再分发无法通过 package/security/license 门禁，或产品已明确收窄 `fileMetrics` 语言范围时，再评估 Product-owned TypeScript counter。

共享设计只应承接 approved exact paths、canonical ordering、cancellation 与 error mapping 等真实共同不变量。function analyzer 与 file line/complexity counter 没有稳定共享语义，不应借这轮迁移建立 generic parser/scanner framework。

### 未知、权威边界与重新调查条件

本结论适用于 2026-09-01 形成时的仓库 contract、Lizard 1.23/SCC 3.7 baselines 和上游发布状态。以下任一事实变化都应重新调查：

- 出现真实 consumer 安装失败率、目标平台不可用或企业禁止 Python/native subprocess 的证据；
- 建立正式 latency、memory、package-size 或 cold-start budget，并证明某 backend 是瓶颈；
- 安全、许可证或供应链审计要求退出某 dependency，或已明确一种可接受的 translation/provenance 路径；
- `functionMetrics`/`fileMetrics` 的支持语言或 unsupported-input policy 经长期决定改变；
- baseline 升级、上游 license/distribution 实质变化，或出现可在 Bun 内运行且能证明 owner-level parity 的新 backend；
- 产品明确采用“npm 安装后全部 package Checks 无外部 executable”或“零 subprocess”的长期结果。

本报告没有形成长期 Decision，也不证明 migration 的成本收益为正。当前事实由 owner 文档和代码维护，长期方向由 Decision owner 承接，实施范围与验收由 active Change 承接；若三者与本报告冲突，应以这些当前 owner 为准，并把本报告作为形成时依据重新审阅。
