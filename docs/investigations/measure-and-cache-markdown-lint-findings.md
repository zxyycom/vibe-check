---
title: "量化并缓存 Markdown lint 逐文件结果"
id: "260924-measure-and-cache-markdown-lint-findings"
formedAt: "2026-09-24T10:28:18Z"
question: "不缩小完整 corpus 的前提下，逐文件 findings 缓存能否降低热运行开销？"
tags:
  - "cache-design"
  - "markdown-lint"
  - "performance"
  - "project-gate"
relations:
  - type: "补充"
    target: "260924-review-local-head-gate-selection-and-document-inputs"
    summary: "在默认选择收窄后量化 Markdown lint 缓存边界"
---

## 形成时背景

前序[本地 Gate 选择复核](./review-local-head-gate-selection-and-document-inputs.md)把默认比较基准改为最近一次本地提交，收窄 package/Case 文档输入；当时一次 required 日志中的 Markdown lint 对完整 corpus 执行约 3.9 秒。用户指出它可考虑缓存，并授权本轮调整。本轮不改变 Markdown lint 的 required/forced 选择、non-blocking policy 或完整 corpus；此前的候选编译缓存与选择调整不计入本轮缓存收益。

## 调查目的

1. 判断未变化的逐文件 lint 结果能否复用，同时每次仍取得当前 source 与现有 Check 结算证据。
2. 量化同一 corpus 的冷写入、热命中与关闭缓存成本，并验证内容/规则失效、缓存故障、取消和既有输出边界。
3. 维持本机 required 20 秒、`--all` 60 秒手工硬阈值，不用加并行或删除检查换取速度。

## 调查范围与依据

代码依据为 `src/package-checks/markdown-lint/{execution,adapter,options*,findings-cache}.ts`、共享 `cacheJsonByKey`、Markdown Link 缓存选项语法与 Project Gate `repository-quality.ts`。Markdown lint 原来按排序后的所选路径逐一做 root containment、bounded read、UTF-8 decode、`markdownlint` backend 调用，然后才发布完整 traversal 的 Records、消息和 data；原 Product 选项无缓存。它的规则按文件求值，可在不缓存 Check outcome 的前提下缓存成功的逐文件 findings。Generic `cacheJsonByKey` 提供 hashed key、closed payload parser、损坏回退和原子文件写入，本轮复用它，不建立第二种持久化协议。

在 Linux/x64、mise-bound Bun 1.3.14、本工作树当前 509 份 `docs/**/*.md` / `changes/**/*.md` 上，先用不改仓库的 Bun 原型顺序执行逐文件 cache：冷写约 **1,763ms**、热命中约 **144ms**、直接 adapter lint 约 **1,063ms**；它未包含 Product Check 的 source discovery/probe/Records，故只用于确认方向。实际 Check 层以 `executeMarkdownLint`、同一完整 corpus、同一进程和当前规则做交错顺序：缓存 **1,263ms**、关闭缓存 **2,332ms**、关闭缓存 **2,217ms**、缓存 **1,261ms**；四次均 `passed`、509 sources、0 findings、0 Records。另在一次可删除 `/tmp` 目录测得首次 cache 写入 **2,957ms**、随后的热运行 **1,227ms**；临时目录在 `finally` 清理。这些是顺序小样本、OS/依赖缓存未清，不是 p50/p95 或完整 Gate 严格配对。

实现使用可选且默认关闭的 `cache` policy；Gate 显式指定仓库根下、忽略 Git 的 `.cache/vibe-check/markdown-lint-findings/`。每次仍完整读取并验证当前 bytes；key 包含 source path、内容 SHA-256、规则列表、实际安装的 backend 版本和内部缓存契约版本。只有成功 lint 的 findings 进入 cache；payload 再按当前 source 行数、rule 和 range 校验。Record 排序、maxFindings、policy、messages 与 outcome 每次实时结算。坏 cache、不可写目录或 backend 版本不可得退回 fresh lint；后续编码审查还区分了预期的 backend 不可用与意外内部异常，后者不再被宽泛 catch 隐藏。一次 Gate 缓存占约 **2.1 MB / 509 个文件**；调用方须自行控制长期容量，它没有自动清理、防篡改或机密性保证。

## 调查结果与边界

本轮结论是：逐文件 findings 缓存降低了热态 Markdown lint 的 Check 耗时，但首次建缓存有额外成本；最终工作树的一次失效候选 required 运行仍超过 20 秒硬阈值。

**有条件收益，不是整段墙钟节省。** 实际 Check 的本轮热样本比同轮关闭缓存低约 0.96–1.07 秒；冷建缓存反而比关闭缓存高约 0.6–0.7 秒。本机 Gate 的热 `--quality` 两次 Markdown lint 为约 **1.5 / 1.4 秒**，早先未配对的无缓存 `--quality` 为 **3.9 秒**；前后 candidate、系统负载和源码不同，不能把 2.5 秒直接归因或外推到 Gate 墙钟。热 required 为 **34 passed / 9 N/A、18.5 秒**，`--all` 为 **43/43 passed、27.9 秒**；日志位于 `.log/project-gate/2026-09-24T10-26-57.644Z-2459267-f01e3de3-29f9-482b-933e-20d231c25f6b/` 与 `.log/project-gate/2026-09-24T10-27-17.180Z-2461242-b845efef-7998-4487-a282-c0acf406dee0/`。本轮较多 Product 源码变化选择了 34 项 required Checks，不代表普通文档工作量。

**完整性保持。** 新的 `findings-cache.test.ts` 把完整 Check outcome/Records 一致性、内容/规则失效，以及损坏/不可用缓存与取消拆成三项测试。相邻 Markdown lint 与 Link 测试通过；共用的本地缓存选项闭合语法提取到 `src/package-checks/local-cache-options.ts`，两者现有行为未改。Test Evidence 为 **655/655 entities、158 Cases**，文档验证、Product/scripts typecheck 与 lint、format 均通过。首轮 focused quality 因重复代码与过深 range 校验失败，后通过共享语法与复用 adapter range validator 修正，最终 focused quality、required 与 `--all` 均通过；没有质量豁免。初次 required 在 34 项 Checks 全过后因声明指纹不匹配按规则失败，本机只**手工**更新该指纹，20/60 秒阈值未改变；随后两条标准入口通过。

**第一次完整工作树复测发现硬阈值风险。** 拆分测试并发布本报告后，同一 candidate 的首次 `bun run check` 虽然 34 项全部通过，仍以 **29,216.9ms** 超出 20,000ms：candidate preparation **7,996.8ms**，adapter/setup **412.0ms**，Product Run **20,808.1ms**；当次 Markdown lint **2.2 秒**。日志为 `.log/project-gate/2026-09-24T10-32-59.905Z-2467050-28809923-55f8-4a61-b904-7b989731e96d/`。随后 `--all` 的 43 项通过、门禁计时 **27,675.8ms / 60 秒**；同 candidate 的再次 required 34 项通过、门禁计时 **18,770.9ms / 20 秒**，其中 candidate preparation 仅 **118.6ms**，日志分别为 `.log/project-gate/2026-09-24T10-33-34.881Z-2473641-843b7b07-ff48-4fb0-b99b-43228fbc4dea/` 与 `.log/project-gate/2026-09-24T10-34-05.534Z-2476048-853a97cc-6635-48cc-84ee-eacf9cdc2473/`。这三次的候选准备成本差异可观察，但不能仅凭它断言编译、打包或系统负载各占多少。硬阈值包含准备和 Run；执行摘要里的 18–20 秒不是同一计时口径。

**编码与文档审查后的再次复测。** 本轮修正意外异常映射、改用具名缓存输入、把 Gate 缓存目录锚定仓库根并整理文档后，失效候选的 required 再次 **34 项 Check 全过、门禁失败**：总计 **34,785.7ms / 20,000ms**，其中 candidate preparation **9,996.7ms**、adapter/setup **463.0ms**、Product Run **24,326.0ms**；Markdown lint 当次 **5.4 秒**。同 candidate 的 `--all` **43/43 通过、28,795.1ms / 60,000ms**，随后 required **34 项通过、19,863.3ms / 20,000ms**；两次的 Markdown lint 分别 **1.6 / 1.3 秒**。日志分别为 `.log/project-gate/2026-09-24T11-57-11.118Z-2506648-8aa4f6ea-6402-4b4e-9dd1-294f36137f5f/`、`.log/project-gate/2026-09-24T11-57-49.362Z-2512958-8ce66b4e-351d-4fb6-927b-50362366f0a9/`、`.log/project-gate/2026-09-24T11-58-23.137Z-2515320-574fb9bf-2c73-4bfa-b29e-1573327239bc/`。这仍是顺序观察而非负载控制实验；缓存收益不是所有运行下的墙钟保证。

**剩余边界。** 缓存目录容量与删除归 Gate/调用方管理，source 衍生的本地文件不适合机密文档或不可信共享目录。更新 adapter 配置或 finding 解释而 backend 版本未变时，维护者必须提升内部缓存契约版本；仅靠内容和依赖版本不能识别任意代码语义变化。本轮没有清除 OS page cache 或依赖安装缓存；两次失效候选 required 已实际超限，不能把热运行通过视为冷态硬阈值达成。进一步优化应分别量化 candidate preparation 和 34 项 required 的关键路径，而非把 Markdown lint 单项收益等同于总墙钟收益。
