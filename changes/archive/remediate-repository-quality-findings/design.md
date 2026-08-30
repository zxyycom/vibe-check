# Design

本设计把数值 Finding 当作必须逐项处置的审查入口，同时只采用能恢复真实职责和可读性的最小整改。

## Context

- 本 Change 的历史 Gate observations 是：整改前有 28 条 file、134 条 function、2 条 Markdown link Finding（duplicate 为 0）；首轮整改后仅剩 1 条 file-metrics Finding；精确排除实施后的最终 full Gate 中，duplicate、file-metrics、function-metrics 与 Markdown link Records 均为 0，且 36 个 Checks 全部通过。
- 这些 observations 来自当时的 `.log/project-gate/**/records.ndjson`，该目录是短生命周期的本地诊断输出，不是稳定规则、持久证据入口或后续工作树的验证结论。当前扫描政策由 `scripts/project/gate/repository-quality-checks.ts` 和 `exclude-byte-preserved-historical-v2-schema-from-repository-file-metrics.md` 共同说明；后续变更必须重新运行正式 Gate。
- `require-known-repository-quality-remediation-before-public-release.md` 已确认发布前必须处置全部已知 Findings；开发期 non-blocking 不构成 release waiver。
- `choose-implementation-style-by-problem-shape.md` 和 `docs/coding-style.md` 禁止只按数值制造 wrapper 或预设抽象。两项要求共同意味着：每条超阈值 Finding 都要审查和处置，但整改仍须恢复真实语义边界；确有必要保留时必须逐项证明。
- 用户已授权先实施无需选择的小修和局部重构，并在首批证据后批准历史 v2 run schema 的精确 Gate 私有扫描例外；公共契约和运行模型变化不在本 Change 范围内。

## Goals / Non-Goals

目标是消除明确缺陷和无需决策的质量问题、缩小剩余决策集合，并产生足以逐项审核的最新 Gate 证据。非目标是改变 package API、Check 结果语义、Project Run 调度模型、质量 Check 的开发期 non-blocking 状态，或用统一阈值放宽代替实际整改。

## Decisions

### Intended Change

1. 先按稳定 owner 分片：文档与脚本、package Checks、Project Run 与核心 Check。
2. 每个分片从最小语义边界开始：命名复杂条件、分离纯判断与副作用、把稳定连续阶段提取为具名函数，再在单文件无法清楚表达 owner 时拆私有模块。
3. 参数数量超限默认改为具名输入对象，但只有当对象表达同一领域输入并减少调用方位置记忆时采用；否则由实现者说明更合适的直接整改。
4. 测试超限按行为场景、fixture 构造和断言责任整理，禁止只把同一匿名回调机械搬到无意义 helper。
5. 首批不修改扫描范围、阈值、公共声明、Record/final-data shape、错误代码和调度语义。触发这些边界的候选停止在报告中，由主代理整合后交用户决定。

### Resulting Impacts

- 并行分片拥有互斥写入范围；主代理拥有 Change artifacts、跨分片整合与最终 Gate。
- package Check 分片需要保持 Check-specific parsers、final data、Records 和 unavailable/failure 映射，并运行相邻目标测试。
- Project Run 分片需要保持任务 admission、取消、settlement、progress 和 diagnostic output，修改测试时执行 Test Evidence closure。
- 文档与脚本分片需要保持 package documentation projection、candidate/Gate process protocol 和入口行为，并运行对应脚本测试与文档验证。
- 首批完成后以新 Records 与基线逐项求差；仍存在的 Finding 不自动视为失败，也不自动豁免，而是进入明确的整改或决策清单。

### Implementation Evidence

- 文档链接、脚本工具、package Checks、Project Run、Check settlement、调度、日志、进度输出和相邻测试中的 163 条 Findings 已通过 owner-local 重构消除；包括仅超出 1 至 4 行或参数 6/5 的记录，均未按“轻微超限”保留。
- 本 Change 收尾时，测试按行为场景与 fixture/断言责任拆分；当时的 `bun run test-evidence -- check --root .` 报告 272 个 Bun test entities 全部映射到 81 个语义 Cases，Case Owner 与 Proves 闭合。
- 本 Change 最终验证的 full profile 已覆盖 exact candidate、package artifact、ancestry-external consumer 的 type/runtime/documentation acceptance，以及 Product、Project tooling、质量、文档、决策和 Test Evidence Checks。
- 未调整 repository-quality 阈值、开发期 non-blocking 语义、Gate aggregate、公共 package API、Check final data、Record shape、错误代码、调度决定或诊断日志格式。

### Resolved Exception

- 用户批准只从 repository-private `schemas-examples` file-metrics 输入中精确排除 `docs/schemas/historical/v2/vibe-check-run.schema.json`。
- 该文件从 v2 创建、迁入 historical 目录到实施前的 SHA-256 均为 `5406c85d854cb4812c80797c255295d6a003849e887cf9bdcecc3699ad5f50a5`；既有 hard-cut 决策要求同一历史 URN 不覆盖既有 schema bytes。
- 它不进入 current runtime、公开 reader、package material、candidate 或 external-consumer acceptance；历史 schema registry 继续显式登记并 strict compile 它。
- 拆分或重写会改变受历史 identity 约束的 bytes；精确排除只改变该 Gate 私有 SCC 输入，不改变 schema、运行时、包或 validator。该证据只支持这一文件，不支持 `docs/schemas/historical/**`、全部 schemas、阈值或整个 Check 的通用豁免。

## Risks / Trade-offs

- 同时追逐所有阈值可能诱发碎片化 helper；通过 owner 分片、局部自测和主代理 diff 审计控制。
- 测试文件拆分可能破坏语义 Case 身份；任何测试正文变化都必须按 Test Evidence 规则验证。
- 多个局部重构可能使基线 Finding 的行号和身份漂移；最终以文件、函数和指标语义重新比对，而不依赖旧行号。
- 真实必要的闭合 validator、声明式历史材料或领域工作流可能需要特定例外；本 Change 仅以可复核证据采用一个用户批准的单文件历史 schema 例外，避免把便利当必要性。

## Open Questions

无。用户已批准并实施单文件例外；后续若该文件的路径、SHA-256、URN、历史登记或 package-isolation 边界改变，按长期 Decision 重新审阅，而不扩大本 Change 的范围。
