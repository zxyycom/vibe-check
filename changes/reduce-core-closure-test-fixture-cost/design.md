# Design

由 package-tool fixture 声明最小编译环境，真实仓库 validator 继续使用其原配置与规则。

## Context

[Workspace tooling](../../docs/tooling/workspace.md#package-tools-依赖边界)拥有符号身份、type/value role、Core 闭包与失败规则；
[编码规范](../../docs/development/coding-style.md)及[测试策略](../../docs/testing/strategy.md)拥有实现质量和证明维护边界。
起点为 `0fe55d31ecb11eadf4999b534a0767d08d68bd90`，722 个当前实体全树闭合。
Core 与 supporting lane 三次隔离 process-wall median 分别为 5.04 / 5.31 秒，三个完整 Gate 均 43/43 通过。

## Goals / Non-Goals

降低 Core 闭包 fixture 的无关声明加载，保持原 19 行违规矩阵、有效符号/alias/回调和 literal dynamic import 证明。
Product、validator 实现、真实仓库 tsconfig、Gate membership、timeout、并发、waiver 和预算均不改。
supporting lane 已测量；其主要成本是 maintenance 复用/重试矩阵的真实进程观察，本切面不改传输或断言。

## Decisions

### Intended Change

采用 fixture-owned compiler options：`lib: ["esnext"]`、`types: []`。
合约 fixture 与 alias 变体共享这组配置，后者继续显式声明 `baseUrl` / `paths`。
原 Core no-emit 成功断言保留，并在同一实体中加入真实类型错误的拒绝断言。

### Resulting Impacts

- Test support 的 compiler profile 仅控制其构造的临时材料，不能进入真实 repository validation 配置。
- 原实体与 Case ID 保持；Case 描述补足 no-emit 错误的可观察信号，不新增名义测试。
- 对同一测试命令复测 process wall / child CPU；完整 Gate 使用同一候选和原配置，缓存与 learned history 照常读写。
- 用户公开契约未变，用户指南无需更新；测试环境与证据边界在本 Change 和相邻 fixture 注释中交接。

## Risks / Trade-offs

`types: []` 关闭自动加载的宿主全局声明，不禁止源码中显式 import 的模块解析。
ESNext 仍支持 Core fixture 的 Promise / dynamic import；fixture 不证明 Node 或 DOM 宿主类型能力。
测试实体时长与 lane 时长不同；减少这一项成本不保证完整 Gate mean/p95 告警消失。
计时受宿主与缓存影响，原始样本、采样顺序和 source hash 需保留，不将小样本当作可靠 p95。

## Open Questions

无阻断方案问题。fixture-only 改动已完成下节复验。

## Implementation Observations

只修改两个测试 TS 和原 Case 的证明描述。fixture 明确 ESNext / 无自动 host types，alias 变体共享配置；
原 19 行矩阵与有效校验保持，实际 `publicCallback(1)` 由真实 no-emit 报告 `TS2345`。
非实施代理从完整规范、实际 diff、Case 查询和 owner 反查，未发现阻断问题；用户指南无需修改的判断成立。

### 测量与采用

原始样本、复现方法和来源保存在 ignored `tmp/gate-heavy-tests-20261014/README.md`。
起点 source manifest digest 为 `baaba93b27a3ee9c23064b1c9a5502abb0273d3805005bd19f8fab2736dec0e7`；
最终格式化后 digest 为 `c1a296e367ef9ff71739a21090e4e2f1698a5fc6156c36c8c14dceee5c71ec69`。
manifest 覆盖 tracked src/scripts 与 package/toolchain 根输入，只有两个测试 TS 不同。

| 证据 | 当前结果与边界 |
| --- | --- |
| 同 Core 命令，warmup 后各三样本 | process-wall median 5043.50→1324.83 ms，child-tree CPU 10157.57→2002.26 ms；含新增错误断言，不是 Gate 或总内存收益。 |
| 单次 compiler-read 归因 | 边界读取 129→18 个文件，Node types 68→0；边界/no-emit 均通过。单次归因计时不等于重复 median 或 CPU profile。 |
| supporting 同 lane 控制 | 5312.08→5110.88 ms；源码没改，不归因为优化。保留真实进程矩阵。 |
| 非交错完整 Gate 三样本 | 两组均 43/43；wall median 41667.05→49895.82 ms，未显示整体加速。文档增量与环境/顺序变化使其不能隔离本改动。 |
| 固定最终断言/文档的交错环境对照 | A/B、B/A、A/B 六次全部 43/43。wall change -19.72%、-15.48%、+0.22%；两组三样本 median 39088.59→34615.02 ms，仅是观察值。 |

交错对照的 baseline 使用旧 fixture 编译环境但保留最终额外断言，不是原 HEAD 精确重放；两组均使用
`0.0.0-local.dfb5e87283d2`，Core 测试断言、其它源码、文档与 Gate 配置固定，仅 test-support 的 fixture 编译环境变化。
缓存与 learned history 未冻结，且样本很少；不能承诺普适或因果 Gate 加速，也不能建立可靠 p95。
采用理由是 fixture 局部 wall/CPU 一致减少、无关声明工作退出和证明信号保持/增强，未扩大生产复杂度。

### 该切面验证与证据边界

scripts 类型/lint、精确两路径格式、两个目标测试 2/2、公共材料、722 entities / 181 Cases / 15 topics 均通过。
首次 pre-format Gate 为 42/43，仅 Source format 阻断；精确格式化后重新取得上述最终源样本，不将失败当通过。
该切面最终源三个 complete Gate 与交错中的三个 final Gate 都为 43/43，零 failed/unavailable；Check mean/p95 告警仍出现。
最后 final 日志：`.log/project-gate/2026-10-14T06-26-03.165Z-2828243-2a0ee315-8107-4e42-abf9-3b365d738422/`。
采集结束时已恢复该切面源码并核对 manifest；预算、timeout、并发、waiver、公开行为均未改变。
该切面证据采集期间未提交、推送或删除 Change。辅助证据保留以供复核；当前计划不把它当随包或持久规范。

## Historical evidence handoff

2026-10-17 补存：[本切面历史验收材料](evidence/historical-acceptance.json)承接仍需复核的样本、方法、身份与边界。
本页其余 `tmp/`、旧 `.log/` 路径仅标注形成时现场，不再承诺保留、读取或执行；历史 source digest 不等于
可重建当时全部未提交源码。源码镜像、fixture、生成 IO、完整 profile 与一次性工具退出，未重新采样或运行 Gate。
这些材料只解释本 Change 的形成时验收，不是永久 benchmark 或可重跑 SDK。
