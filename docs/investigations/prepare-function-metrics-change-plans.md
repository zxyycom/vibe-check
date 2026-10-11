---
title: "函数指标三项 Change 的实施准备度核对"
id: "261011-prepare-function-metrics-change-plans"
formedAt: "2026-10-11T13:33:23Z"
question: "既有升级、TypeScript修复和读取优化调查在当前基线上能否收敛为无需重新选择产品策略的直接实施计划？"
tags:
  - "change-readiness"
  - "function-metrics"
  - "source-alignment"
relations: []
---

## 形成时背景

用户要求用 ai-ready-docs 优化三项函数指标 Change、完成准备度审计并提交可直接交给实施代理的计划；本轮不实施 Product。既有升级、缺陷和 admission 报告保存了样例与风险，但三个 Draft 的策略菜单、开放问题和缺失 tasks 尚不足以恢复明确执行路线。

`??` 短路计量方向已经用户确认，见[活动 Decision](../decisions/align-nullish-coalescing-with-short-circuit-function-metrics.md)；本轮不重选其 CCN/ND 口径。

## 调查目的

在当前 owner 与本地可取得的固定源码上核对：升级的 Rust contributors、Kotlin 位置和 regex 翻译如何有界落地；修复的共享影响面如何验收；admission 如何保留取消机会并取得真实 Check 对照。目标是消除影响范围、责任或采用标准的未知，而不是提前证明补丁正确或收益成立。

## 调查范围与依据

取证基线为 `aa64f14a335b21f106531680e9bea9ff7e05eb6b`，本轮于 2026-10-11 UTC 只读核对源码与当前测试。工作树已有两项修复计划编辑、新 `??` Decision/索引和协调入口编辑，均保留；本轮未改产品源码、测试、Case、依赖或公开指南。

| 依据 | 实际动作与范围 |
| --- | --- |
| 既有调查 | 完整读取[升级](assess-lizard-1-24-1-upgrade.md)、[行为缺陷](verify-typescript-function-metrics-defects.md)、[来源](trace-typescript-metrics-upstream-origin.md)、[新版复查](verify-lizard-latest-typescript-defects.md)、[admission](function-metrics-admission-yield.md)及必要资源；旧样本保持形成时身份。 |
| 当前责任与调用链 | 读取 function-metrics guide、scanner dependencies、source mapping、性能流程、测试策略/Case owner；CodeGraph 查询 TypeScriptReader、measureFunctionMetrics 和后者 callees；结果仅辅助定位，再读 measurement、Worker port、pipeline/context、code-reader、TS/TSX/Rust/Kotlin 与 selected extensions。 |
| 固定新版源码 | 从已有本地 Git object 只读 `git show 0488a260…:<path>`，取得七个模块；逐文件 SHA-256 与前序 source-review.json 的 newSha256 相等。保存 Rust/Kotlin/regex 全文和七模块 diff，不依赖缓存路径存续；未联网、fetch 或安装。 |
| 测试定位 | 读共享状态机、Go-like readers、measurement resource/encoding、Worker、constructor 的相关断言；读取 Case owner，起点 `mise exec -- bun run test-evidence -- check --root .` 通过：686 current entities、173 Cases、15 topics。该命令注册但不执行正文。 |

这是新的“计划准备度”问题，旧报告是依据，不是被本轮复查的同一问题，因此直接关系为空。随附源码资源用于核对精确增量位置与翻译表达式，diff 用于恢复其余模块；不是生产源码或可直接应用的 Product 补丁。

## 调查结果与边界

### 升级风险可以收窄到真实 owner 内

- **Rust 已确认事实：** `1.24.1` 每个 match scope 有 `_seen_match_arm`；首个真实 `=>` 只设置标记，后续 `=>` 才 `add_condition()`。三 arm 的 CCN 3 应解释为 base 1 + 第 4、5 行两项 `=>` 贡献。不能把所有箭头加进静态 conditions，否则首 arm、非 match 箭头和 conditionCounter 会被误计。最小路线是在这个实际增量位置、complextags 已激活时保存 token/current line，保持普通条件的顺序与无扩展生命周期；不改变 Rust CCN、ND 或其他操作符。
- **Kotlin 已确认事实：** 新版 expression body 在下一 declaration token 到来时调用 end_of_function，再重放该 token。当前 port 的 lineCounter 在 reader 之前已更新 currentFunction 的 endLine/nloc，因此位置污染有明确机制。最小路线是 Kotlin-local 保存表达式最后有效 token 的 FunctionInfo 行/NLOC 快照（包括 when 子状态返回），在 ender/外层关闭/EOF 完成前恢复该函数的测量边界，再重放下一 token；不回退全局 currentLine/file NLOC、不对所有函数统一减一。样例独立期望为 expression 结束行/NLOC 1/1，choose 4/4，下一函数独立；实现仍需直接验证 comments、空行、multiline 和 EOF。
- **regex 已确认事实：** 新版提前以 addition 识别 literals，使用 `\A`、lookbehind、Python whitespace/lstrip 并拆出前缀 newline；不再收集整个 generator 后拼接。翻译需用 JS start anchor 等价替换 `\A`、沿用项目 Python whitespace helper，逐 token/换行验证，不以 JS trimStart 或一条匹配成功代替 parity。TS/TSX 共用新版 TEMPLATE_LITERAL；Ruby/Vue 也消费 regex wrapper。

上述路线来自精确源码和现有公开结果维护义务；Rust/Kotlin 属必要偏差，原始新版 oracle 与修正期望分开保留。实现方法的可行性仍由 tasks 中直接测试证明，不能把本轮源码阅读当作补丁完成。

### TypeScript 修复与共享影响明确

回调在 `CodeStateMachine.consume` 完成分支应取出旧槽、清空、以原 receiver 调用旧回调，保留重入的新槽。当前共享测试明确断言旧清槽行为，实施时需保留原始来源证据并改为获批期望；27-reader/扩展生命周期是受影响验证，不据此扩成一般 parser 重写。

`??` 可局部加入 TypeScript tokenizer addition，并给 `\w+\?` 加“不跟随第二问号”的限制，避免改共享组合符号而改变其他语言 token；TSX 直接绕过 TS generateTokens，须在其 addition 同步。TypeScript logicalOperators 承接逐 token CCN，ND 扩展只对 reader.logicalOperators 已包含 `??` 的 reader 将其送入现有短路分支，防止 Kotlin 已有 `??` token 或其他语言被改计量。condition 内外及混合嵌套以同形 `&&`/`||` 对照证明状态路径，不使用“所有链恒增一层”的替代标准。

### Admission 选定局部路线，收益仍须实施取证

固定为每个非空 32 KiB chunk 的 `setImmediate` Promise，保留 yield 频率、signal checkpoints、实际字节 cap 和 FD/Worker cleanup；不移除或稀疏化让步、不建公共调度抽象。旧局部样本只支持选择这个最小候选，不证明真实 Check 加速。

实施对照冻结实际 `src/**/*.ts` 的清单/content digest，并追加旧报告的 200 短文件和 4 MiB 文件形态作为受控压力输入；支持 Node 的 public functionMetrics→run→真实 Worker 使用生产默认，比较完整 Records/outcome 与 wall 的 15-block ABBA 样本。Bun、controlled port、源树 Node assertion 各自保留范围，不替代 installed Node consumer。取消验收使用可观察边界而非硬毫秒：预先取消、读取中同线程 timer/I/O abort、跨文件、Worker 在途及 rejection+取消；区分 terminate 调用和线程物理退出。

### 当前结论与未证明边界

三项可据上述路线派生完整 Plan：升级→修复是默认协调顺序而非技术硬依赖，admission 独立；所有 Implementation/Verification checkbox 保持未执行。准备度语义审计须独立复核 artifacts，机械校验也须另行通过，之后才能记录 Plan stage 与提交。

本轮没有执行上游/候选分析器、真实 Check 性能对照、产品测试正文、完整 Gate 或包安装验收，没有证明 Rust/Kotlin 补丁正确、性能非回归或 Decision 已 aligned。实施若发现超出已选范围的计量/接口变化，应停止该扩大改动并交回决定；纯补丁验证失败则保留基线和未完成项，不以更新期望消除失败。

## 随附资源

- [七模块精确上游差异](./_resources/261011-prepare-function-metrics-change-plans/seven-module-delta.patch)
- [源码身份与 Rust/Kotlin/regex 完整取证](./_resources/261011-prepare-function-metrics-change-plans/source-route-evidence.md)
