# Design

以阶段成本和必要性证据选择最小优化，分别维护行为、局部测量和完整 Gate 证据。

## Context

本轮开始时 HEAD 为 `8c39f3098e23a525ecc7472d71ecfde551331ad6`；当时解析器变更已暂存、尚未提交，继续保留该快照。
性能基线使用解析器复审 candidate `0.0.0-local.374b9bf8c9ce`，两轮完整 Gate 为 43/43 passed，
均值分别为 2,649.2ms / 1,962.6ms，P95 为 6,937.1ms / 6,707.9ms。

## Goals / Non-Goals

减少已测重项中的重复扫描、重复准备或低效计算，保留当前产品与验收契约。
Gate 并发、资源声明、Check 粒度、选择、预算及 timeout 保持不变；所有原验收继续执行。

## Decisions

### Intended Change

1. 每份声明只扫描一次 JSDoc 与相邻导出声明，收集有中文说明的名称，再完整核验 222 个公开名。
2. ESM 范围提取与 Worker URL 重写共用一次 TypeScript 语法解析及诊断；使用公共 compiler API，省去仅为诊断执行的完整转译 emit。
3. 消费者严格编译保留完整 dependency declaration checking；函数指标保留现有 tokenizer。二者成本已定位到必要工作，
   不以 skipLibCheck、宿主原语替换或新的缓存协议绕过当前契约。

### Resulting Impacts

修改必要的 owner 实现、直接测试与 Case，按实际 diff 更新说明并独立反查。
解析器变更与本性能 Change 保持可独立审查的提交单元，待整体验收完成后整理提交。

## Risks / Trade-offs

完整 Gate 的竞争和环境波动不能单独证明某个局部算法的原因；先用串行阶段测量定位，再核对整轮分布。
复用必须仍验证当前源和产物，避免把必要验收移到准备阶段或用缓存掩盖损坏。

## Open Questions

无。新 ESM 路径已通过既有案例、完整 emitted corpus 与非法语法对照。

## Implementation Observations

### 定位依据

- 固定 candidate 串行 3 次 baseline 中位数：类型测试 3,557.3ms、artifact 测试 4,007.3ms、完整函数 Check 进程 3,728.8ms。
  函数输入冻结为 546 文件，完整事实摘要 `7dd2443b…`；setup、输入准备不计入样本。
- artifact 分解：读取/渲染文档 25.3ms，staging 审计 1,324.1ms，读取 360 份声明 4.0ms，222 个名字的重复正则查找 2,588.1ms。
- 消费者 compiler extended diagnostics：414 文件、2,340,563 instantiations，check 约 3.08s；trace 的主要长关系来自
  Immutable 的 List/Indexed/zip 声明比较，保留严格编译而不是放宽 dependency 检查。
- 函数 adapter profile：约 77% 为组合正则扫描，完整 4,244 项指标摘要 `b97005e6…`；宿主原语路线按[既有决定](../../docs/decisions/permit-evidence-backed-host-primitive-optimization-in-lizard-port.md)关闭，
  本次不改变其来源边界。父线程 profile 有约 3.30s 的 Worker 等待间隔，不能把它误读为回调函数的 CPU 自耗时。
- 原始日志、profile、冻结输入和重放驱动在忽略目录 `tmp/gate-heavy-check-cost-20261015/`。Bun test 未生成 CPU profile，
  分解证据由 Bun run 驱动补足；加 profiler 的观察不参与未加 profiler 的 baseline 中位数。

### 行为与复审

- 360 份 emitted 模块加 42 类合法/非法文本，以 `.js`、`.mjs`、`.cjs` 文件名覆盖 486 个输入，
  三项公开 owner 操作共 1,458 次新旧对照，完整返回值与首错消息零差异。
- 产物与相邻测试 15 项 / 6 文件通过；新增相邻中文 JSDoc 名称索引测试，保留 222 个公开名逐项验收。
  同步既有 Case 与产物 owner，未新增 Check 或 Case。
- 非实施代理按实际 diff、完整编码规范与 ai-ready-docs 审查；唯一证据措辞已收窄为每个公开名至少存在一处合格声明，
  与原验收一致。平台路径完成静态核对，未在 Windows 执行。

### 串行复测

Linux / 4 核 CPU 配额、Bun 1.3.14、Node 24.18.0；每项各 3 个未加 profiler 的新进程，准备不计入样本。
baseline 与 after 分阶段顺序执行，使用同一 Product 源码与冻结的 546 个函数输入；after candidate 为 `0.0.0-local.1c3b95a292c6`。

| 完整工作 | 墙钟中位数前 → 后 / ms | CPU 中位数前 → 后 / ms | RSS 中位数前 → 后 / KiB |
| --- | --- | --- | --- |
| 消费者严格类型验收 | 3,557.3 → 3,449.7 | 4,840.1 → 4,748.4 | 799,548 → 803,988 |
| 产物验收 | 4,007.3 → 900.3 | 5,587.9 → 1,534.6 | 278,152 → 244,996 |
| 完整函数 Check 进程 | 3,728.8 → 3,735.5 | 4,751.3 → 4,779.9 | 253,748 → 258,488 |

产物验收由 5 项增加至 6 项，墙钟中位数下降 77.5%、CPU 下降 72.5%；类型与函数算法未修改，不把其波动归为优化收益。
函数全部 6 个样本的完整事实摘要一致。CPU 含已回收子进程，RSS 是单进程高水位而非进程树总和；
顺序测量仍可能受环境漂移影响，局部计时与整轮调度分布分别解释。

### Gate 与工程验收

同一 after candidate、原配置下连续执行；表中总反馈包含候选准备和 adapter/setup。

| 范围 | 结果 | 总反馈 / ms | Check 均值 / ms | Check P95 / ms |
| --- | --- | --- | --- | --- |
| 完整 `--all` 第 1 轮 | 43 passed | 28,057.6 | 1,627.3 | 3,622.6 |
| 完整 `--all` 第 2 轮 | 43 passed | 27,944.9 | 1,618.3 | 3,585.9 |
| 完整 `--all` 第 3 轮 | 43 passed | 28,333.6 | 1,636.1 | 3,533.5 |
| 默认 required | 38 passed，5 按条件未选择 | 22,881.8 | 1,519.3 | 4,060.6 |

全部满足完整 90s / required 30s、均值 2s / P95 5s 的既有预算；真实类型编译和函数分析继续执行。
没有修改并发、资源、预算、timeout、选择或 waiver，也没有拆分 Check 或把工作移到 preparation。
原始输出为该忽略目录中的 `full-1.log` 至 `full-3.log`、`required-1.log`，各自记录正式 Gate evidence root；
串行复测数据为 `before/`、`after/` 与 `comparison-summary.json`。

lint/typecheck/format、完整文档与材料验证、726 entities / 181 Cases / 15 topics 闭合、Decision、Investigation 及两个 Change 检查均通过。
两个 Plan 保留已完成任务和本轮证据，尚未执行需要单独删除授权的 finalize。

## Historical evidence handoff

2026-10-17 补存：[本切面历史验收材料](evidence/historical-acceptance.json)承接仍需复核的样本、方法、身份与边界。
本页其余 `tmp/`、旧 `.log/` 路径仅标注形成时现场，不再承诺保留、读取或执行；历史 source digest 不等于
可重建当时全部未提交源码。源码镜像、fixture、生成 IO、完整 profile 与一次性工具退出，未重新采样或运行 Gate。
这些材料只解释本 Change 的形成时验收，不是永久 benchmark 或可重跑 SDK。
