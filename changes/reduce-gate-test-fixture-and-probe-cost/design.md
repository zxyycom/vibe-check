# Design

让隔离范围和测试输入匹配证明目的，减少重复启动与无关 corpus 工作。

## Context

起点调查中 required Gate 通过，两个 complete Gate 出现默认 entity deadline 超时；四组重项独立 64 tests 通过。
成本和 source 边界保存在 ignored `tmp/optimization-cost-investigation-20261014.0FTggZ/README.md`，
这是采用候选的背景，不是新预算或全通过的交付证据。

## Goals / Non-Goals

降低 duplicate probe 与 workspace routing 的测试成本，保留原证明目的。
Product duplicate/JSON 算法、Gate policy、resource budget、timeout、Check 粒度和材料覆盖保持不变。

## Decisions

### Intended Change

采用一个专属隔离 child 顺序驱动十步 probe sequence。每步新建 Check/Run，清零本步计数并返回 detached 结果；
builtin mocks 留在 child，磁盘变异顺序与 test-owned expected assertions 保留。
预期断言在 child 执行且不从 Product 输出派生，父端观察失败、完整完成信号与 cleanup。

workspace main 与 focused 路由共用 scripts 内部 validation adapter。focused 测试注入 material dispatch，
核对精确 argv、原样返回 exit code 与 unknown task 在 dispatch 前拒绝；default-all、retired-entry 保留真实 CLI child，
links failure fixture 保留真实材料诊断。不增加用户 flags 或通用测试进程框架。

### Resulting Impacts

- 同一 module 宿主内，每个 Run 仍取得 fresh bytes/scanner identity，cache-off/no-eligible/unavailable/read-failure 分支与全部 acquisition 计数重新验证。
- focused spy 直接证明 main 共用 adapter 的 dispatch，不证明独立 focused process 或材料内容正确。
- main 的 exit、错误处理和 reporter 责任保持原样；真实材料集成与 validator 内容/失败验收分别保留，owner/Case 对齐实际证据边界。

## Risks / Trade-offs

真实 default-all corpus 验收仍有线性材料成本，减少启动不保证所有机器都在默认 5 秒内。
隔离单位为整个 sequence，共享 module 状态由每步 fresh Run、独立计数和 mutation 断言捕获。
测试注入只承接 adapter dispatch，不穿透材料 parser 或削减 independent acceptance。
样本顺序漂移、源版本变化与环境抖动限制收益外推，单次 Gate 通过不证明 deadline 风险已消除。

## Open Questions

无阻断公开契约问题。若 module 复用破坏原证据，或 seam 需要新增公共接口，先拒绝该候选并报告范围变化。
本轮语义保持重构和文档整理已完成组合复验，来源及边界见下节。

## Implementation Observations

前轮已采用单 child 十次独立 Check/Run 及 main 共用内部 adapter，保留原 expected assertions、
各步计数快照、磁盘变异顺序和真实 CLI/validator 证据。

### 来源与采用依据

基线为 `3072afa1ff0fdc6509894499d9745cb6ad592eb1`。前轮原始样本、复现方法与 source manifests 位于 ignored
`tmp/optimization-gate-test-cost-pilot/README.md`；`before-source.sha256`、`control-harness-source.sha256`、
`control-product-before.sha256` / `control-product-after.sha256` 与 `final-source.sha256` 分别记录身份。

| 证据 | 结果与证明边界 |
| --- | --- |
| Whole-file before | 六次命令全通过。Scheduler 同期实施改变后续 Product 输入，因此不能将 whole-file before/after 当作隔离 test-cost 对照。 |
| 固定同一 Product 的旧十 child / 新单 child | 三对完整 probe assertions 全通过；wall median 7024→2208 ms、child-tree CPU median 9981→2876 ms，startup 十次→一次。scanner/version/Git 工作保留。 |
| 计时来源限制 | 样本有顺序漂移，早于最后三行 path capture 类型整改；不是最终源精确计时、p95、内存改善或整体 Gate 收益。 |
| Whole-file after | 第一轮真实 default-all 达原 5 秒 deadline 后停止采样，没有 after median；随后窄验证通过不能抹去该失败。 |
| 最终局部验证 | 21/21 duplicate owner/workspace tests、Product/scripts 类型/lint、精确路径格式与计数重验通过；最后 capture 整改后另跑 duplicate default 三测试通过。 |

非实施代理通过 64 个组合窄测试，反查原十步 sequence、main adapter、真实 CLI/失败信号与 Case 连续性，支持采用。
预算、timeout、waiver 和质量门槛均未改变。

## Integration Verification

前轮冻结输入上串行执行 `mise exec -- bun run check` 与 `mise exec -- bun run check -- --all`，
required 34 passed / 9 not-applicable、complete 43/43 passed，零 failed/unavailable；complete 含 artifact、
external consumer 及全部材料/质量 Checks。两次均绑定 exact local candidate `0.0.0-local.cc06e1edad25`，日志分别为
`.log/project-gate/2026-10-14T03-40-28.613Z-2719014-dea7fe8a-cbb5-4aab-8b17-9050781dfe45/` 与
`.log/project-gate/2026-10-14T03-41-00.022Z-2725189-afb46c93-8e65-4f24-8a52-6ebd7be8c511/`。

公共 `mise exec -- bun run validate`、全树 Case 722 entities / 181 Cases / 15 topics、Change 24/24 和 `git diff --check`
在前轮通过。required execution-summary 26.3s（含 candidate preparation 的 initial result 48.7s），complete 40.8s
复用已准备 candidate，不是配对 Gate timing；Check mean/p95 warning 仍存在。
该次 default-all 通过不抹去 after-sampling 的 deadline 失败。

上述结果限定于前轮冻结源。本轮语义保持重构与文档整理须重新取得组合验收；复验不能把历史计时变为新源精确测量。
当前 metadata 保持 plan，目录保留；提交与结项删除分别依当前任务授权执行。

### 本轮规范复核

按完整编码规范复核四个 TS 路径。in-process probe 结果使用具名只读 acquisition counts 和 Product CheckOutcome，
父端 completion 保留 unknown JSON 边界及完整十步断言；workspace adapter 的解析、dispatch、exit 与成功后验收责任保持明确。
AI-ready 审查分别呈现 focused dispatch、真实 CLI 与材料内容验收，保留原源身份和失败观察。

首次未锁定的 Bun 1.4.2 窄验证为 5 pass / 1 fail：未改的 aggregate 测试遇到 null-prototype 比较差异。
按 `mise.toml` 锁定 Bun 1.3.14 重跑为 6/6 pass，Product/scripts 类型、lint、四路径格式与 diff check 通过；
没有改断言规避环境差异。本轮不重复 wall timing，旧计时不代表这些类型整改后的精确源版本。
组合 complete Gate 首次为 42/43，唯一阻断是 compiler Case 文档超过原文件行数限额；
按实际证明收敛该 Case 的架构背景后重跑 43/43 passed，零 failed/unavailable。
两次绑定 exact local candidate `0.0.0-local.dfb5e87283d2`，最终日志为
`.log/project-gate/2026-10-14T04-10-07.237Z-2743795-8b6bbf2a-3fbd-47ef-be4b-82ab2a21b754/`。
公共材料、722 entities / 181 Cases / 15 topics 与 24 份 Change 检查通过，task 2.6 闭合。
Check mean/p95 warning 与先前 deadline 风险保留；没有为通过验收改变 timeout 或质量门槛。

## Historical evidence handoff

2026-10-17 补存：[本切面历史验收材料](evidence/historical-acceptance.json)承接仍需复核的样本、方法、身份与边界。
本页其余 `tmp/`、旧 `.log/` 路径仅标注形成时现场，不再承诺保留、读取或执行；历史 source digest 不等于
可重建当时全部未提交源码。源码镜像、fixture、生成 IO、完整 profile 与一次性工具退出，未重新采样或运行 Gate。
这些材料只解释本 Change 的形成时验收，不是永久 benchmark 或可重跑 SDK。
早期成本 inventory 只作为起点背景，不另保存完整 profiler；采样控制不一致、deadline失败和最终验证仍按本页分别解释。
