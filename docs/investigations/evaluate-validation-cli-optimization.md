---
title: "validation CLI 超时复现与严格 JSON 局部优化评估"
id: "261019-evaluate-validation-cli-optimization"
formedAt: "2026-10-19T07:50:53Z"
question: "在可复现的冷类型检查竞争下，严格 JSON 遍历优化能否解决五秒 CLI 测试超时，应采用什么范围的后续方案？"
tags:
  - "performance"
  - "project-gate"
  - "validation"
relations:
  - type: "复查"
    target: "261019-investigate-validation-cli-timeout"
    summary: "复现竞争超时并区分局部收益与可靠性修复"
---

## 形成时背景

前序[定向调查](investigate-validation-cli-timeout.md)确认默认全材料 CLI 的真实集成测试受 Bun
5 秒单实体 timeout 限制，并发变慢但未再次触发失败。用户随后授权尝试修改和优化，要求最终方案先说明。
本轮在同一发布准备 worktree 复查竞争条件，评估保持原契约的局部优化；不提交、重新冻结或发布。

本轮有独立保留价值：前序回答原现场的原因与严重度，本轮引入明确的实现候选、同输入双宿主比较和
实际复现的超时，回答“候选是否值得采用、是否已经修复”。保留前序 47 个命令均通过的形成时事实，
不把后来复现回填为前序已经确认的证据。

## 调查目的

1. 保留真实 CLI、完整五项材料、负例及非零退出证明，复现默认五秒预算在竞争下的失败。
2. 用阶段与 CPU 证据选择最小热点，比较严格 JSON 私有遍历的行为等价性、局部收益和代价。
3. 区分优化、可靠性修复与发布验收，向用户提出有边界的定稿建议，不自行放宽阈值。

## 调查范围与依据

### 环境、输入与候选

- 工作区 `/home/dev/.codex/worktrees/package-release-preparation/vibe-check`，分支 `release-0-0-4`，
  基线 commit `b8cf54f4801397002b739c7945bf83e2ae6806ac`。main 与旧冻结工作区未改。
- 2026-10-19 07:33 UTC 起测量，Linux WSL2 x86_64、4 logical CPUs、cgroup CPU quota 4 核。
  CLI 和测试均由 mise 固定 Bun 1.3.14；另一宿主为 mise 的 Node 24.18.0。
- 通过 public `collectProjectFiles` 的 `docs/**/*.json` 和默认 excludes 固定 490 文件、34,811,143 bytes。
  内容及路径组合 SHA-256 为 `c1450dcd9090d7ffe2245780114d12a095919c81396b808f36cb564f36e99a6a`。
  与前序相比已加入前序报告资源；本轮资源和索引更新发生在所有对照采样之后。
- 候选只改 `src/package-checks/json-document/strict-document.ts` 的 `finalizePrivateJsonValue`：
  数组按索引扫描；对象先置 null prototype，再枚举键并读取值；仅把非 null 容器压栈，仍冻结每个容器。
  初稿的类型断言在 lint 检查后改为 `Reflect.get`，避免新增规则豁免；第二版重新做双宿主和并发对照。
  各轮源码摘要在资源中分别保存，初稿计时不冒充最终候选计时。

### 测量与证明方法

阶段 probe 动态加载 workflow，然后按真实顺序分别调用五项 material task；阶段计时不含完整 process
entry 的全部 import。另对真实 `workspace.ts materials` 做 1.60 秒、1259 samples 的 CPU 采样。

端到端 probe 在同一数据集上运行以下命令形状，计时从 child spawn 到 close：

```text
bun test scripts/validation/workspace.test.ts
bun scripts/validation/workspace.ts materials
bun node_modules/@typescript/native-preview/bin/tsgo.js -p <tsconfig> \
  --tsBuildInfoFile <此前不存在的 probe 专属文件>
```

每组 3 轮，先单独执行目标，再与 product/scripts 两个冷 compiler 并发；不删除项目缓存、不改变 compiler
参数或线程数。每个 child 使用独立进程组与 30 秒诊断 watchdog。旧版与初稿另按旧、新、新、旧、旧、新
交错运行，替换前检查文件摘要，结束恢复候选。没有同时运行另一组性能采样；期间少量只读文件和治理查询
未完全隔离，系统其它负载、JIT 与 OS cache 也未控制，因此不从一次前后差值推定根因或失败概率。

双宿主 probe 对原始及最终 `inspectStrictJsonBytes` 使用同一预读 bytes，每类 5 轮交错顺序。
时间包含 UTF-8、native parse、decoded-key 检查和私有值冻结，不含文件读取、模块启动或 Product Run。
旧模块仅调整临时副本中 duplicate scanner 的相对 import，函数体不改；保留原始来源摘要。
逐层比较 closed verdict、own keys/order/descriptors、prototype、冻结及 primitive `Object.is`，
覆盖全部真实文件、根 primitive、BOM/UTF-8、grammar/duplicate 负例及五类合成形状。
Node 在计时外显式 GC；Bun 未强制 GC，各宿主只与自身对照，不横比绝对时长。

## 调查结果与边界

### 热点与局部收益

前三次 baseline 阶段总时长为 1964 / 1330 / 1287 ms，其中模块加载 550 / 269 / 242 ms，
JSON task 941 / 666 / 657 ms。真实 CLI CPU profile 中 `Object.values` self time 为 108.4 ms、
`Object.freeze` 为 187.2 ms，支持优化遍历临时分配；freeze 本身是必须保留的契约。
模块加载和 jiti/Babel 也有成本，不能把全部启动或首个 JSON 摘要前的时间归到 JSON 检查。

测量第二版的私有文档边界 5 轮中位数如下。真实 corpus 每轮一次，合成大输入每轮 5 次，小混合输入每轮 1000 次：

| 输入 | Bun 旧 → 新，ms | Node 旧 → 新，ms |
| --- | --- | --- |
| 490 文件真实 corpus | 469.92 → 388.30 | 240.09 → 223.94 |
| 100,000 primitive 数组 | 368.58 → 248.12 | 24.77 → 16.97 |
| 25,000 属性宽对象 | 49.58 → 58.33 | 66.09 → 50.70 |
| 4096 层数组 | 8.62 → 5.35 | 2.10 → 1.40 |
| 4096 层对象 | 4.11 → 4.77 | 5.24 → 4.38 |
| 小混合对象/数组 | 4.78 → 3.42 | 2.63 → 2.42 |

真实 corpus 的局部中位数分别下降约 17.4% 与 6.7%。这不是全 CLI 或 Gate 的加速比例。
代价是 Bun 宽对象每份约增加 1.75 ms，深对象每份约增加 0.13 ms；样本少且部分范围重叠，
不宣称每种输入更快或统计显著性。全部行为对照通过，未发现冻结、prototype、特殊键、Infinity/-0 或失败顺序差异。

### 超时复现与因果边界

| 测量组 | 单独目标 | 配两个冷 compiler |
| --- | --- | --- |
| 旧版初始 3 轮 | 3/3 通过，实体 2.01–2.50 秒 | 3/3 在约 5 秒超时 |
| 初稿首组 3 轮 | 3/3 通过，实体 1.45–1.61 秒 | 3/3 通过，实体 3.56–4.02 秒 |
| 交错旧版 3 轮 | 3/3 通过，实体 1.61–2.70 秒 | 2 次超时、1 次 3.79 秒通过 |
| 交错初稿 3 轮 | 3/3 通过，实体 1.38–3.03 秒 | 2 次超时、1 次 3.79 秒通过 |
| 初稿 direct CLI 3 轮 | 3/3 exit 0，wall 1.39–1.81 秒 | 3/3 exit 0，wall 4.40–4.87 秒 |
| 测量第二版 3 轮 | 3/3 通过，实体 2.29–4.19 秒 | 3/3 在约 5 秒超时 |

首组优化前后看似消除了失败，但交错复测推翻了这一解释：两版都可超时，compiler 时长也在不同窗口明显变化。
只能确认并发条件下能复现五秒实体超时，局部优化不足以作为可靠性修复；未还原原 Gate 的精确资源竞争过程，
不能把全部差异定量归因于 tsgo、CPU throttling 或某个材料 phase。
第二版复测延续这一结论。上述共 72 个 command samples，所有 compiler 均 exit 0，诊断 watchdog
均未触发；失败只发生于 Bun 默认五秒实体保护，失败细节完整保留在随附资源。

### 同轮 Gate 收尾补证

08:00 UTC 起的收尾不改变上述超时判断。首轮完整 Gate 为 42/43，唯一失败是候选遍历函数的
cyclomatic complexity 14 超过 10、nesting depth 8 超过 7；材料、包产物与外部消费者验收均通过。
随后把数组和对象共用的“仅容器入栈”规则收拢到私有 helper，保留原检查门限，不改变遍历和失败行为。
最终候选 `0.0.0-local.eb98142b323f` 完整 Gate 为 43/43、exit 0，含相同 tarball 的 artifact 与
external consumer types/docs/runtime 验收；这一通过不作为五秒可靠性已经修复的证据。

helper 变体再次通过 Bun/Node 全部值等价性对照，5 轮局部中位数为 Bun 524.92 → 428.43 ms、
Node 219.33 → 203.07 ms（约 -18.4% / -7.4%）。Bun 宽对象单份约 +0.87 ms、深对象约 +0.07 ms，
仍不承诺所有形状更快。它沿用 490 个固定路径，但其中 investigation index 已因报告发布更新，
实际共 34,812,154 bytes；与前表不是完全相同 corpus，不能跨轮比较绝对时长，各轮 before/after pair 内一致。
原 probe 沿用了旧总字节 metadata，随附补证明确保留原值并按同一 corpus digest 校正。
计时后仅修正 helper 注释，通过反向替换验证计时源码与最终源码之间无可执行代码差异。
后续未再为该注释变化重复压力采样；正式冻结、其它机器和稳定 timeout 仍未证明。

### 实际动作与最终建议

已留下局部实现、扩展原 Case 的数组/空容器/特殊键/深嵌套证明，以及测量资源；没有更改 timeout、
性能告警预算、调度、公开签名、schema、依赖或材料覆盖。独立非实施 reviewer 确认原公开指南和 JSDoc
仍准确，不需要新增性能承诺。采用、提交与正式发布均未因此获得确认。

建议把两件事分别定稿：

1. **局部优化可采用。** 以少量直接遍历代码消除临时 values 数组和 primitive 排队；接受上述 Bun 宽对象常数代价，
   换取真实 corpus 和大数组收益。它不需要 parser、loader 或调度架构重构。
2. **可靠性仍需独立处理。** 保留真实默认全材料 CLI，为该实体显式设置有限的集成预算，建议 child 10 秒、
   entity 15 秒，并让 child 超时、signal/error 和非零退出明确失败。这些值是待确认的工程保护范围，
   不是性能通过阈值或跨机器保证；不调全局 Bun timeout、Gate 120 秒上限或原性能告警预算。
   该建议尚未实施，须另验证正常、负例、挂起清理及同负载重复运行。

不采用通过删减 JSON corpus、替换为简化 `JSON.parse`、全部 mock CLI、重试通过或改 loader 隔离语义消除红灯。
本轮仍按 P2 仓库验证可靠性问题处理，没有发现产品内容误判或错误放行。
完整 Gate、实际包身份及后续用户选择由[当前发布证据](../../changes/release-0-0-4/current-evidence.md)承接；
即使一轮 Gate 通过，也不推翻并发复现或证明原五秒预算稳健。未验证其它机器、CI、平台、长期分布或更高负载。

## 随附资源

- [同轮 Gate 收尾、helper 变体原始计时与源码关联](./_resources/261019-evaluate-validation-cli-optimization/gate-followup.json)
- [局部、端到端与交错样本及源码和语料摘要](./_resources/261019-evaluate-validation-cli-optimization/measurements.json)
