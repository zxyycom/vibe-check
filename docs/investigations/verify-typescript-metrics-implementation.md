---
title: "TypeScript 函数指标修复实施与验收"
id: "261011-verify-typescript-metrics-implementation"
formedAt: "2026-10-11T15:23:55Z"
question: "固定 Lizard 1.24.1 基线上的 callback 与空值合并修正是否满足完整私有、公有与安装后验收？"
tags:
  - "function-metrics"
  - "lizard"
  - "source-fidelity"
  - "typescript"
relations:
  - type: "复查"
    target: "261011-prepare-function-metrics-change-plans"
    summary: "以实际补丁与完整验收复查已确认修复路线"
---

## 形成时背景

用户授权完整实施 `fix-typescript-function-metrics`，按固定来源升级后串行修正两项 TypeScript 缺陷。
[准备度调查](prepare-function-metrics-change-plans.md)确定 callback 最小路线、reader-local 分类和 reader-gated ND；
本轮在已验收 Lizard 1.24.1 新基线上实际实施并取证，不覆盖原始来源或旧报告的形成时结果。

## 调查目的

核对返回类型后的函数边界、每项真实 `??` 的 CCN/贡献与既有短路 ND 状态路径，闭合继承 reader、
共享 extension 生命周期、公开 Finding/waiver 与 exact installed Node consumer。
保持默认 limits、公共配置和其他语言口径，不扩成 AST parser 或返回类型支持重写。

## 调查范围与依据

实施基线为 `39d9d55d65228bacfd32ef4ec9037a207d8394b4`，固定来源仍为
`0488a260e74e73ceba3149d7c600faac6a3616e6` / Lizard 1.24.1。
使用本地 Git archive 在自有短期目录恢复基线源码，以锁定 Bun 1.3.14 重跑原始 11 输入及公开 Worker 的两个 profile；
该目录复用已有 node_modules，只作历史 baseline，不冒充 installed candidate，完成后由 TemporaryDirectory 清理。
当前 source 用同一 runner 再验；installed candidate 用支持 Node 24.18.0 与真实包根/包内 Worker 验收。
未联网、fetch、安装新依赖、stage、commit、切换分支或 finalize。

- 基线与修复后的完整函数 facts、问号 token 和两个 profile 的 Records/messages 分别随附；原始固定上游 JSON 未改。
- 最窄 callback/TS/TSX/ND、27-reader/55-suffix oracle、malformed/extension，以及完整 function-metrics 共 109 tests / 38 files 通过。
- 新增直接矩阵保存独立固定期望；11 种 ND 形态同时用 `??`/`&&`/`||` 控制，不从当前输出自动派生期望。
- source mapping 公共 sync/只读审计通过，identity 仍为 83 classes、841 symbols、46 translated source/ranges；
  header 和 provenance 说明局部偏差，upstream hash 保持来源字节，不替换成本地 patch hash。
- typecheck、lint、format、validate、Test Evidence 698 entities / 176 Cases 已通过；完整 Gate 的阶段结果见下文。

## 调查结果与边界

两项修正、原始/修正证据分离、公开结算、来源与安装后 Node 验收均已闭合。
最终优化后重建的 exact candidate `0.0.0-local.9b17c1319000` 完整 Gate 为 **exit 0 / 43 passed / 0 failed**。
首次 42/43 的必要 fileMetrics 影响按独立领域责任整改，未放宽阈值或 waiver；两轮实际结果均保留。

### 当前核心认识

callback 完成分支先保存并释放旧槽，再以原 receiver 调用一次；重入安装的新槽保留。
typed-tail 的 endLine/NLOC/CCN/ND 从 10/10/4/3 恢复为 **3/3/1/0**，内部正常嵌套仍为 CCN 4 / ND 3、止于第 8 行。
已直接验证简单、Promise/generic、对象返回类型 declaration 与 typed arrow；不承诺未探测合法语法的完整支持。

TypeScript-local addition 单 token 识别 `??`，optional 标识符负向前瞻条件不吞紧凑写法首问号；TSX 独立 addition 同步。
原有 `conditionCounter`/`complextags` 提供每项 CCN +1 和真实 source-order line，不另建计数器。
四项 `??` 从 CCN 9 / ND 8 / 八枚 `?` 恢复为 **CCN 5 / ND 4 / 恰四项 `??`**。
原始 11 输入的诊断 profile Findings 从 10→7，默认 profile 从 1 blocking/failed→0/passed；
真实三元与可选参数对照保持原指标。九项真实 `??` 的 Record 全保留，human message 只预览八项且报告余项。

### ND 不是 AST 或恒定链增量

仅已声明 `??` 的 reader 走原 `&&`/`||` 分支；全语言 `DEFAULT_LOOPS` 不变。
既有状态在每次打开括号时重置首项标记，condition 内首项处理、condition 外逐项处理、
hidden bracket、分号与函数 reset 均不重写。代表性独立期望为：

| 函数内表达式 | CCN | ND |
| --- | ---: | ---: |
| `return a ?? b;` | 2 | 1 |
| `return a ?? b ?? c;` | 3 | 2 |
| `return (a ?? b ?? c);` | 3 | 1 |
| `if (a ?? b ?? c) { return a; }` | 4 | 2 |
| `return ((a ?? b) ?? c);` | 3 | 1 |
| `return (a ?? b) || c;` | 3 | 2 |
| `return [(a ?? b), (b ?? c)];` | 3 | 2 |
| `a ?? b; c ?? d;` | 3 | 2 |
| `if (a ?? (b ?? c)) { return a; }` | 4 | 3 |

分号不代表每个表达式都从 ND 0 重算；后续 function 则明确 reset。
JS、JSX/TSX、Vue 的继承修正通过；Kotlin 自有 spaced `??` token 不被授予 logical/ND 口径，
其 compact `a??b` 的旧 `a?`/`?` 分类未改。

### 独立审查与边界

非实施 reviewer 对核心生产 diff 独立核对原始 11 输入、22 项固定上游 `&&`/`||` ND controls 与 Node 9 probes，未发现阻断。
其 probes 覆盖 JSX attribute/body、typed TSX arrow、JS/Vue、字符串/注释/已识别 regex 的 shielding。
Vue 前置 template 的旧行号计数、未被 reader 识别的 return 后 regex 均为上游既有边界，不在本轮扩大修复。
本轮没有新成本告警，因此不重做上一项升级性能采样，也不声称性能加速或零成本。

### 阶段验收与必要影响

首次完整 Gate 使用 `0.0.0-local.bbe4f1af5e95`，明确为 **exit 1 / 42 passed / 1 failed**；
artifact、installed Node runtime/types/docs、functionMetrics、其余工程检查均通过。
唯一失败是本项 installed TS 证据使 `runtime-evidence/assertions.ts` 达 310 code lines，超过原有 300 上限。
修正按现有 runtime-evidence 领域分解，把 function-metrics Record 验证移到同级单领域模块，
保留 Rust 与 TS 全部真实断言；不放宽限值、添加 waiver 或压缩材料。
修正后的 external-consumer 最窄测试为 6/6 passed / 4 files，typecheck/lint/format 通过。

随后独立最终审查按 coding-style 与 ai-ready 核对实际 diff，仅优化 6 份文档，不改变生产、测试、Case、fixture、
provenance/pin 或 Decision；function-metrics Record 模块承接真实领域证明责任，无多余抽象。
最终以公共 package rebuild 后的同一 candidate 重跑完整组合，**43/43 passed、exit 0**；
Function Metrics、File Metrics、artifact 与 installed Node runtime/types/docs 全部通过。
最终组合前另跑 109 tests、source mapping、typecheck/lint/format、validate、Case、Decision/Change 和 diff whitespace，均 exit 0。

### 包与公开证据边界

最终优化改变随包指南与 changelog 字节后，公共 package:build 执行 rebuild，status 核对为 current；
最终 exact candidate 为 `0.0.0-local.9b17c1319000`，tarball 与安装入口身份保存于 acceptance 资源。
支持 Node 24.18.0 的同输入 runner 已针对该精确安装重跑全部 11 输入、私有函数 facts 与真实公开 Worker 的诊断/默认 profile。
常规 installed fixture 保留 Rust CCN 3 的两项真实 arm contributors，并新增 typed-tail + 四项 `??`，
独立断言 CCN 5、完整四贡献以及 NLOC 上限 3 下无多余 Finding；对应完整 Gate 的 runtime acceptance 通过。

Decision 261011-align-nullish-coalescing-with-short-circuit-function-metrics 在完整方向、owner 和安装证据核对后，
通过公共 CLI mark-aligned，严格 check 通过；alignment 本身不替代完整 Gate 证据。
结论仅覆盖本轮固定上游、锁定 Bun/Node、明确输入及 local candidate，不是正式发布、Git 合入或用户环境升级证据。
Git 提交与 Change finalize 由编排者按当前授权另行完成；历史报告和原始 oracle 保留不改。

## 随附资源

- [最终验收与 exact candidate 身份](./_resources/261011-verify-typescript-metrics-implementation/acceptance.json)
- [冻结基线的原始 11 输入与公开观察](./_resources/261011-verify-typescript-metrics-implementation/baseline-observations.json)
- [最终 43/43 Gate 的完整输出](./_resources/261011-verify-typescript-metrics-implementation/final-gate.txt)
- [安装后 Node 的同输入完整观察](./_resources/261011-verify-typescript-metrics-implementation/installed-observations.json)
- [首次 42/43 Gate 的完整输出](./_resources/261011-verify-typescript-metrics-implementation/preliminary-gate.txt)
- [同输入重跑器](./_resources/261011-verify-typescript-metrics-implementation/reproduce.mjs)
- [修复后 source 的完整观察](./_resources/261011-verify-typescript-metrics-implementation/source-observations.json)
