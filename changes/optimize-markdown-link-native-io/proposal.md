# Proposal

将私有串行 Worker、自适应读缓冲和收集纯判断复用落到原生 Markdown Link Check，定义首版实施与验收范围。

## Why

[性能调查](../../docs/investigations/profile-markdown-link-consumer-workload.md)用独立同量级语料复现了深路径下的 6–8 秒耗时。
计数符合路径安全模型；可降低的是逐组件异步调度、收集中的重复纯 matcher 判断，以及按单文件上限分配工作缓冲的成本。

隔离组合原型支持进入产品实现；真实产物收益、包加载和完整故障收束由本 Change 验收。
Node `>=24.18` 是[正式产品宿主](../../README.md#安装)，运行前提为允许创建 `node:worker_threads` Worker；Bun 保留仓库对照。

## Outcome

原生 mdlink 在保持文件范围、路径授权、逻辑计费、首错、缓存与完整发布语义的同时，降低深路径下的执行开销及无效缓冲分配。
主线程仍可响应协作取消，新增私有 Worker 随 invocation 收束，并能从真实安装包运行。

## Scope

### Intended Change

1. 每 resolver 一个惰性、串行的私有 Node Worker；完整 containment probe、endpoint probe、整文件 bounded read 分别作为 job，job 内使用同步 filesystem 调用。
2. 正文缓冲按 fstat size 加一并钳制到 `maxBytes+1` 起步，读满后有界倍增，继续读到真实 EOF 或上限。
3. 在单次文件收集内，按 policy/prefix 复用纯祖先排除判断；沿用现有获取、剪枝和最终选择顺序。

首版保留 probe/read 两段授权边界和现有公共 API；并行 I/O、任务融合及跨 invocation 复用不在范围内。

### Resulting Impacts

- resolver/source/target 接入私有 I/O 会话；execution 在普通链接结果发布前完成 Worker 与 cache 收束。
- 共用 async probe/read 仍服务 Markdown lint；同步与异步驱动共享纯安全判断，自适应缓冲同时覆盖共用读链回归。
- 新 Worker 进入 compiler roots、fingerprint、定点 URL normalization、runtime material audit、repository-layout 门禁与 installed Node consumer 验收；根 export 保持唯一。
- 共用收集优化影响全部消费者，需证明 selection、错误时点、no-follow 和 filesystem 观察顺序等价。
- 同步实现 owner、必要的公开 I/O/取消说明、Case 证据和简要性能交接；本 Change 不调整 Gate 预算或调度。

## Success Criteria

1. Check outcome、普通 Records/位置、`targetReadCount`、预算与多故障首错保持等价；cache hit 仍读取并核对当前 bytes。
2. 同量级语料的必要路径/读取工作量保持不变，自适应缓冲零扩容且降低申请量，每 policy/prefix 纯排除计算至多一次；具体计数见 design 的性能验收。
3. 正常、可捕获失败与协作取消完成必要 close/drain；Worker 创建、发送、协议、error/exit 故障恰一次结算，取消隔离且无部分普通结果或遗留请求。
4. 新 Worker 在 exact installed Node package 中加载并退出；Markdown lint、共用收集和原 function-metrics Worker 回归通过。
5. 同窗口比较当前原生实现与完整首版：Node 深度 30/60 有正的配对节省中位数及多数更快样本，浅层和少文件常数代价单列说明。收益不成立则回到设计审查；不把历史数字或固定机器秒数作为 CI 阈值。
6. 受影响直接测试、Case 闭合、文档、脚本/产品工程检查和完整 Gate 通过；未验证平台或故障边界明确保留，不能以原型通过替代。

## Affected Owners

| Owner | 承接内容 |
| --- | --- |
| [Markdown Link 解析与授权](../../docs/development/markdown-link-resolution.md)、[公开指南](../../docs/checks/markdown-link-validation.md) | 私有会话、授权/计费、取消、cache finalize 与发布 |
| [Project files](../../docs/development/project-files.md)、[收集指南](../../docs/guides/collecting-project-files.md) | operation-local 纯 predicate memo 与所有消费者的等价性 |
| [Markdown lint](../../docs/checks/markdown-lint.md)及相邻 execution/tests | 共用 async filesystem 路径与读取限制 |
| [Package artifact](../../docs/tooling/package-artifact.md)、[Workspace tooling](../../docs/tooling/workspace.md) | roots、URL、fingerprint、runtime audit、repository-layout 与 installed consumer |
| [测试策略](../../docs/testing/strategy.md)、[Case 维护](../../docs/testing/case-maintenance.md) | 直接行为证据与 Case 映射；性能观察独立于日常 timing gate |
| [Change 协调](../../docs/governance/change-coordination.md) | 与 Gate 系列的 package/validation/Case owner 写入串行，计时使用独占窗口 |
