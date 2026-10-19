---
title: "validation 测试必要性与五秒预算内的证明重分工"
id: "261019-reassess-validation-test-boundaries"
formedAt: "2026-10-19T08:33:00Z"
question: "默认全材料校验是否需要真实子进程测试，如何在原五秒预算内保留独立且可证伪的证明？"
tags:
  - "performance"
  - "project-gate"
  - "test-evidence"
  - "validation"
relations:
  - type: "修正"
    target: "261019-evaluate-validation-cli-optimization"
    summary: "纠正必须保留全量进程测试的前提，按独立义务重分工"
---

## 形成时背景

前序[优化评估](evaluate-validation-cli-optimization.md)证明严格 JSON 私有遍历有局部收益，但未解决
并发时五秒 CLI 实体超时；其后续建议仍假定必须保留真实默认全材料测试，并提出有限加时。
用户明确否决加时：5 秒是红线，必须先证明测试的必要性，再讨论保留或优化。完成必要性审查后，
用户授权试改，最终方案仍须说明，不授权提交、重新冻结或发布。

本轮独立回答测试义务与承载层是否合理，而非再次测量同一遍历算法。保留前序的候选等价性、
局部收益与竞争超时证据，同时纠正“全量真实进程测试必须保留”的前提；不能把前序未做过的
必要性审查回填到其形成时结果。严格 JSON 草案与本轮测试重分工分开判断。

## 调查目的

1. 从当前行为 owner、Gate、artifact 验收和测试断言确认独立证明义务、重复覆盖和缺口。
2. 以隔离反例区分测试名称所宣称的内容和实际可证伪内容，不以测试或 Case 已存在证明必要性。
3. 在原 5 秒预算内试改最小证明分工，验证不会把工作移到另一重型实体或引入测试专用 CLI。

## 调查范围与依据

工作区为 `/home/dev/.codex/worktrees/package-release-preparation/vibe-check`，分支 `release-0-0-4`，
HEAD `b8cf54f4801397002b739c7945bf83e2ae6806ac`。main 与既有冻结工作区不变。实际读取
`workspace.ts/.test.ts`、repository-material workflow、task contract、schema/links validators、
Gate material 定义、artifact documentation audit、共享 process main、行为 owner 和相关 Case。

08:13 UTC 的隔离反例复制 workspace/workflow/test，只重定位 imports 与 cwd，每组至多增加一项
语义变异。测试正文与断言不变，正式三文件前后摘要相同。Bun 1.3.14 的默认 5 秒实体 timeout
不变；probe 外层 20 秒诊断 watchdog 未触发。该实验只证明所选反例，不代表完整 mutation coverage。

后续试改与验证在同一 Bun 1.3.14 上进行。当前环境暴露 6 logical CPUs，cgroup quota 为 4 核，
与前序记录的 4 logical CPUs 不同；不能直接比较两个时段的绝对耗时。下述试改反例与测量取得于
约 08:45–08:48 UTC，属于本轮补证，不是 08:13 时已经取得的结果。

整组对照同时运行 workspace 与 workflow 两文件，避免把新增证明转移到另一文件后只测原文件。
旧组复制四个原文件，只重定位 imports/cwd；新组直接运行当前文件。按旧、新、新、旧、旧、新
交错，每轮先单独跑测试，再与 product/scripts 两个冷 tsgo 并发；每个 compiler 使用此前不存在的
专属 build-info，不删改项目缓存。共 12 次测试进程与 12 次 compiler；每个进程组有外层 30 秒
诊断 watchdog，Bun 的默认 5 秒实体预算不变。受控变异的外层 watchdog 为 20 秒；均未触发。

测量期间源码与 JSON 输入摘要保持不变。输入守卫使用 Bun glob 的 493 个 JSON，是实际 strict-JSON
选择 492 文件的超集，额外包含 `docs/examples/artifacts/mixed-outcomes/run.json`；不把守卫清单当作
Check 实际扫描数。资源中保存两者区别。双方都使用前序严格 JSON 优化草案，没有比较两个 Product
版本。机器其它负载、JIT/OS cache 未完全隔离，compiler 本身也有波动；这些观察不是概率保证。

## 调查结果与边界

### 必要性与当前证明缺口

旧重型实体运行 `workspace.ts materials`，既不经过 package script，也不覆盖无参数时的
layout/git-diff 分支。它的五条 success 输出仅覆盖四种 task，不能观察没有 success 输出的
`package-api-documentation`。Gate 直接执行 JSON/schema/publication/examples/links 内容校验，
artifact audit 独立比对 package API 投影，validator fixtures 另证坏输入语义。

| 旧测试的隔离反例 | 同文件三个实体结果 | 结论 |
| --- | --- | --- |
| 无语义改动对照 | 3/3 通过 | 隔离运行保留原结果。 |
| 默认选择移除 `package-api-documentation` | 3/3 通过 | 未证明全部默认任务。 |
| 默认选择移除 `json` | 2/3 通过，目标实体失败 | 有部分集成证明，不是完全无效。 |
| main 删除 `process.exitCode =`、保留 await | 3/3 通过 | 未证明普通失败返回值到 OS 退出码的映射。 |

最后一项对坏材料退出行为的影响来自源码推导，不是正式实现已有此 bug，也没有单独坏材料 child
实测。退休入口会抛错，由 `runAsyncMain` catch 设置退出码，所以该测试仍通过。

不能只从 mutation 存活推出“不必要”。判断依据是：内容正确性已有独立验收；默认五项分发仍有
独立价值，因为 Gate 绕过 CLI dispatcher，但该义务属于 workflow 层，不要求重扫仓库或启动进程。
薄 main 的 argv、console 和 process.exitCode 接线另有审查责任，不应以大量材料计算掩盖它未被证明。

### 已实施草案与直接证明

已实施草案保留生产 task map、组合 wrappers 和失败翻译，仅在已有 leaf validator 操作边界提供
内部受控依赖；独立字面量序列观察默认任务及生产 wrappers 对 leaf 的调用，controlled Promise 观察等待，
小输入观察 focused selection、去重、expected failure 聚合与 unexpected error 透传。
workspace adapter 观察空 selection 转发和非法参数拒绝；真实 links fixture 保留内容失败诊断。
不增加 CLI/env 开关，不把全量扫描搬到另一测试，不放宽 timeout 或 Gate 告警预算。

正式范围为 workflow、两份测试、内部 owner 与原 Case；`workspace.ts`、共享 process、Product、
Gate 调度和依赖不变。八个具名 leaf 默认绑定真实函数，测试替换 leaf 而非 task map；JSON/schema/links
reporter、links root 与 package `--check` 参数仍穿过生产 wrappers。两组受控 Promise 在 finally
释放，不靠 sleep 时长证明等待。workflow reporting 不再真实生成 examples 两次，workspace 删除
全部 child；九个实体均有可观察的分发、结果或失败责任。

对最终草案复制四个文件并只改变指定一处，测试正文不变，得到以下反例：

| 变异 | 九个实体结果 | 直接观察 |
| --- | --- | --- |
| 无改动对照 | 9/9 通过 | 隔离副本仍执行原证明。 |
| 默认选择漏 package API | 7 通过 / 2 失败 | 第五项任务不再漏检。 |
| package API task 错接 schema wrapper | 4 通过 / 5 失败 | 替换 leaf 没有掩盖生产 task map 的错接。 |
| 不等待 task | 5 通过 / 4 失败 | 顺序、完成和失败结果不能提前通过。 |
| JSON 不转发 reporter | 6 通过 / 3 失败 | 观察真实参数与输出通道接线。 |
| 丢弃 expected diagnostics | 7 通过 / 2 失败 | 失败聚合不能被静默清空。 |
| 材料失败仍返回 0 | 7 通过 / 2 失败 | CLI 返回值失败不能伪装成功。 |
| 删除 main 的 exitCode 赋值 | 9/9 通过 | 明确保留人工接线审查边界，不宣称自动覆盖。 |

六个应被自动证明捕获的变异均由断言发现，没有 timeout、signal 或 watchdog 干扰。去掉 await 的
变异还产生未观察的 rejection；不把它冒充正常实现故障。该列表是有针对性的反例，不是全变异覆盖率。

### 原预算下的成本观察

| 两文件整组 | 单独运行，3 次 wall | 配两个冷 compiler，3 次 wall | 竞争下最慢实体 |
| --- | --- | --- | --- |
| 旧组，6 个实体 | 2.93–3.83 秒 | 5.54–7.56 秒 | 3212.99–4750.24 ms |
| 草案，9 个实体 | 0.74–0.92 秒 | 1.70–2.95 秒 | 21.27–90.82 ms |

本批新旧全部通过，12 个 compiler 也全部 exit 0，不能说本批重现了旧超时；前序多次失败证据仍成立。
整组 wall 包含 runner/import，不等于实体时长；旧组 wall 超过 5 秒也不代表单实体超时。新旧证明集合
故意不同，不能把差值称为等价算法加速比例。这里可确认的是移除了重复内容计算，并以更直接的小型证明
取得原预算内的余量，而不是通过修改阈值消项。未验证其它机器、CI、平台、长期分布或更高竞争。

### 验收、人工边界与采用建议

最窄两文件 9/9、scripts typecheck/lint/format、完整 Case（759 entities / 188 Cases / 16 topics）
均通过。真实 `bun run validate` 仍检查完整材料、layout 与 diff；试改前后必要内容范围不变。
实际根命令 `validate -- docs` 与 `validate -- materials unknown` 均观察到 exit 1，但这只是本轮
直接运行证据，不是继续保留两个进程测试的理由，也不证明普通内容失败的 OS 退出映射。

`Manual CR:` 核对 workspace/workflow 两处 `import.meta.main`、`process.argv.slice(2)`、
`runAsyncMain` 中的 await 与 `process.exitCode` 赋值、stdout/stderr 回调，以及默认 leaf 对真实
函数的直接绑定。自动化证明 CLI 返回值与 callback，不证明 OS exit status；为这一薄接线新增
测试专用 CLI/env 或扩张共享 process API，代价大于当前收益。修改该边界时须重新审查，不用全库
计算冒充其证明。失败 diagnostics 不走 success reporter，同轮其它成功 task 仍可发布 summary；
owner 对这个既有行为的澄清不构成新的 runtime 行为。

建议采用本轮测试证明重分工作为可靠性处理，不再保留原重型形式或加时。此前 Product 局部优化
有独立的等价性与性能证据，但不是证明该测试必要、或必须捆绑到本次可靠性修复的理由。
最终采用、完整候选验收与发布状态由当前 Change 承接；当前只是未提交草案，没有新的 clean S、
formal receipt 或正式发布。

独立非实施 reviewer `review_validation_evidence_rewrite` 审查实际五文件 diff、上述 Manual CR、
Case、报告与原始采样，结论无阻断；公开 API、随包文档和 JSDoc 不受本轮内部改动影响。
审查没有重新运行测试；其语义结论与前述执行证据分开成立。

08:50 与 08:52 UTC 两次实际 `mise exec -- bun run check -- --all` 都 exit 1：39 passed、
0 failed、4 unavailable。材料测试 lane 分别为 842.8、950.3 ms 且 passed；所有其它测试、
类型/lint/format、材料及 artifact 验收 passed。`prepared-external-package-consumer` 触发原有
30 秒 `command-timeout`，三个消费者 runtime/docs/types Check 因 dependency-not-passed 未运行。
两次均使用 `0.0.0-local.eb98142b323f`，tar SHA-256 为
`dd6db28571624a8b0c68a4361a299d7fdff47433669c910325ece0ceefb8acaa`，与前轮候选相同。

第二次是唯一一次为定位阶段而进行的带观测复查，未改命令或预算。在该次自有进程树的 2、10、20、28
秒快照中，provider 与其 `bun install --no-save --ignore-scripts <tarball>` 子进程持续存在。
结合 provider 顺序源码，可将未完成阶段缩到外部消费者安装；未采集认证配置或环境，也未证明是网络、
缓存、调度或本次改动导致安装变慢。没有继续盲目重试或扩大本轮修复范围。完整 Gate 仍未闭合，
不能用先前同 candidate 的通过记录覆盖当前验收缺口，更不能把它说成新的五秒实体超时。
随附 Gate 资源保存两个 run 的 outcome、日志摘要及自有 provider/install 快照节选；省略大段包清单与
无关进程，原始 ignored 日志的路径和摘要保留用于现场复核。

## 随附资源

- [旧测试与试改反例、原始命令输出及交错整组采样](./_resources/261019-reassess-validation-test-boundaries/evidence.json)
- [两次完整 Gate 结果与外部消费者安装阶段观测](./_resources/261019-reassess-validation-test-boundaries/gate-evidence.json)
