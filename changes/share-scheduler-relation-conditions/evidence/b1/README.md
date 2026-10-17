# B1：完整生产切片，不采用

B1 是已通过正确性审查的真实 Product 共享条件候选，不是历史 ordinary-only 模型。其 `candidate.patch`
相对 identity.json 中 baseCommit 保存全部 Scheduler 实现/测试与直接 owner/Case 改动（含新文件）；
build-manifest.json 保存实际运行 bundle SHA、同范围 runtime-tree inventory 与基线 c45e5499。
可恢复输入不因 B2 后续修改而漂移；生成 bundle 在专属 tmp/b1，未入 Product，也不是永久双路由。
补丁载体为 `candidate.patch.gz`；复现先在隔离目录解压回 `candidate.patch`，原 identity/恢复证明仍指解压后的 bytes，压缩记录见上级 `patch-compression-manifest.json`。

## 结果与判断

**不采用 B1。** source condition 写入和 cell mass 确实消除了共享 fanout，但编译和状态/发现成本使大图完整轨迹普遍回退；
A+Bi 与低复用图的保留内存也增大，不能用局部操作量覆盖真实 total。仅 exact multi 的 retained snapshots 较低。

- Node24.18.0，N1024 Core+delay：multi 36.21→37.31ms，A+Bi last 53.95→65.20，unique 52.58→67.31，deep24.74→34.10。
- Bun1.3.14，同条件：cohort64.71→56.07，multi60.72→60.95，A+Bi last163.03→183.12，deep44.57→90.15ms。
- 真实 public Run，N1024 Node multi static124.6→141.7、measured201.3→202.8；factored static228.3→293.3、measured475.5→417.3ms。
- Bun public Run multi static238.7→280.7、measured264.4→264.6；factored247.6→258.9 /301.3→335.2ms。
- Node post-GC heap delta，N1024 factored current3.22→4.56MiB、retained source snapshots10.82→13.84；unique snapshots11.41→16.40；multi snapshots3.09→2.61。

以上为各自 raw 样本的 median，不是统计显著性或普遍速度结论。完整小/中/大、形状、min/max 与退化行在原始 JSON，不用总平均数掩盖。

## 方法与覆盖

- 每 runtime 66 个 Core total＋32 个 Run cohorts，3 warmups＋8 samples，A/B 交替并平衡先后；GC 在 span 外。
- total 直接包含 graph normalize/compile、seed、collector、完整来源/下游轨迹、声明的读侧和终态；不加各阶段 median。
- public Run 覆盖 static/measured/custom-full；diagnostic-shell 使用真实 Scheduler、确定 clock 与消费诊断的 logger（不含磁盘 writer IO）。
- 独占串行，timing 不改 Product 或开启 profile/操作量 instrumentation；结果 digest 在计时外对照。
- 计数单独48行；内存每 runtime64个 fresh-process rows；CPU/allocation 各独立进程，不混入正式 timing。
- CPU 4 warmups 后12轨迹、500µs sampling；allocation 6轨迹、4096B sampling、包含被GC对象。6条轨迹 sampled allocation A→B：multi228→278MB、factored377→476MB、deep175→255MB。
  B relation-compile占72/76/43MB，factored discovery（不含prune）54MB；parent与constraint prune分别7.65/7.21MB。这是采样归因，不是精确逐对象字节。
- 双 runtime 214同条件语义cohorts，含每effect投影、精确queue counts/peaks/delay、preseed、failure/cancel、source snapshots和真正独立fork；另N1024 Core/Run smoke。
- measurement clock 的具体边界由正式测试/独立oracle证明；计时本身不替代正确性测试。

第一次 Node core runner 在 full-read 的错误 harness 属性访问处退出，未产生可用完整结果；修正 harness 后从头采样。
此处 JSON 全部来自完整重跑。runtime B1 从未为此修改。

## 复现与生命周期

这里的脚本是冻结 B1 的复现输入；先按上级[复现入口](../README.md#复现入口)确认独立 c45 工作区、完整补丁和输出隔离。
复制本目录脚本到该工作区的 `tmp/scheduler-shared-condition-implementation`，再从工作区根用 pinned `mise exec -- bun tmp/scheduler-shared-condition-implementation/build.ts` 构建。
build 仅提取 Git 基线的 src，排除生成 *.test.ts 防止 Bun substring discovery 污染；真实 runtime 和 test-support 字节不变。
随后串行运行 `verify.mjs`、`timing.mjs core` / `timing.mjs run`、`metrics.mjs`、`memory.mjs`、`profile.mjs`；正式测量必须重新协调独占窗口，不在证据目录直接执行或覆盖原结果。
raw与脚本保存在活动 Change；临时bundle/提取树仅为本轮隔离工作物，不作为已采用代码。

本轮 12 个 CPU/allocation profile 原始 JSON 已按授权无损 gzip 为同名 `.json.gz`；
`profile-compression-manifest.json` 保存压缩前后 SHA/bytes，并确认逐字解压相等后仅移除本目录原始副本。
总计 19,696,514→2,135,525 bytes。需要读取时在独立临时目录解压，勿覆盖冻结结果；`profile-summary.json` 未压缩。
补丁从 c45 逐字恢复的证明及所有 4 个新文件 SHA 见上级 `restoration-verification.json`。
后续 B2 也不采用；本候选保持冻结，不因恢复 Product 而成为现行设计。
