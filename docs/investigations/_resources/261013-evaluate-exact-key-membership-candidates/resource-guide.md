# Exact-key 性能对照资源：阅读、身份与复现

本目录保存调查 `261013-evaluate-exact-key-membership-candidates` 的原始对照与审计材料，供阅读和受控复核；
采用取舍见[报告正文](../../evaluate-exact-key-membership-candidates.md)。原始材料来自工作区
`tmp/low-risk-optimization-20261013/exact-keys`，本轮 2026-10-13T03:11:29.669Z 复制/复核；
原样本取得时间仍以各 `samples.json` 的 UTC 字段为准。原 tmp 未删除，待用户明确授权具体清理范围后处理。

## 如何阅读

- `baseline/closed-values.ts`：共同 before 的完整冻结源码，已经逐字节对照 `bedcfc6b856678ebfc1db3ccf02520e43f56f3ea`。
- 每个阶段的 `candidate.ts`：完整候选源码；对照共同 baseline 即可恢复唯一算法变化。
  `cancelled-threshold256` 是历史目录 `final` 的准备草案，未取得正式性能数据，不表示最终采用。
- 每阶段 `harness-measured.ts` 是原冻结 TypeScript；`harness-type-fixed.ts` 是后续仅类型修正的 authoring source。
  类型差异在两个 `Object.fromEntries<unknown>` 与一个 tuple return annotation；
  取消的256阈值 helper 另有一行缩进格式修正。既有修正构建与原 compiled JS 仍逐字节一致。
  `harness-frozen.mjs` 是当时真实计时使用的小型 compiled bundle，而不是 `.ts` 的伪装文本。
- 三个 `samples.json` 保留全部 1,104 个原始样本，未过滤离群或负结果。
  对应 `summary-paired.json` 保留全部组的中位数、范围、8 个配对比值和方向计数。
  `threshold64/summary-historical.json` 是最早无 paired 指标的摘要；保留它是为了审计当时
  6.6–7.5% 的口径来源，不作为额外实验或优先统计。
- `summarize.ts`：真实原始统计程序；只读取 raw 并输出摘要，不调用候选、不重新计时。
  当前输入路径会不同，重算比对时只忽略最外层 `inputPath`，不能忽略 `summary` 内容。
- `copy-identities.json`：每项来源、bytes 和 SHA-256。31 项是逐字节复制；
  `withdrawn-formal-test.patch` 是唯一处理项：先用原 patch 与 baseline 验证/恢复完整草案，再派生 U0 等价 diff，
  去除无判断价值的上下文空行。manifest 保留原 patch hash 与新 hash，不冒充原字节。
  草案未成为当前测试且未执行，不能把 patch 当作测试通过证据。
- `audit-results.json`：本轮独立重算（不是直接运行历史摘要程序）的结果，检查所有 8+8 样本、AB/BA 顺序、
  正迭代数配对、raw 声明 identity、共同 baseline 和生产/正式测试回撤身份。
  `typeFixedRebuildByteIdentical` 表示本轮核对既有修正构建与既有 frozen bundle 的字节一致，
  不表示本轮重新构建/计时。
- `semantic-recheck.txt`：2026-10-13T03:12:28.754Z–03:12:29.616Z 的新 Node24 非计时 smoke，
  不是原测量窗口日志。所有四阶段均调用两个 variant 的原 verify assertions 后成功退出。
- `helper-validation`：原 17-input typed lint 的配置、完整 inputs identity、初始9项诊断和最终 exit 0。
  其中8项诊断来自本报告4个 harness；另1项是 Markdown helper。17-input pass 不等于原冻结 TS
  当时已经 typed-lint pass；镜像已移除，配置中的绝对路径只记录历史准备条件。
  `.log` 来源副本改为 `.txt` 是为了不受仓库全局 ignore 影响，内容字节不变。
- `provenance-original.txt`：原 implementer 的现场说明。其声明与本轮可核实事实分开；
  例如 threshold 的“6.6–7.5%”应读为独立样本中位数比，不是配对中位数。

## Identity 字段的解释

raw 内 `sourceSha256.harness` 名称容易误解：原 harness 实际对 `./harness.mjs` 做 digest，
所以它是 **compiled JS** 身份，不是 TS 源码。`before`、`candidate` 才是冻结 `.ts` 模块的 hash。
TS 原/修正身份分别在 copy manifest 的 `harness-measured.ts` / `harness-type-fixed.ts`；
审计给 compiled hash 独立命名 `compiledHarnessSha256`。

## 受控复现前提

本资源默认供阅读和独立统计审计，不承诺“在本目录直接执行任意 harness 就能重测”。
冻结 bundle 的 `smoke` 不读取原 module 路径，因此可在已安装的 Node 24.18.0 直接执行；本轮已验证。
统计可以在仓库根用 `bun run <summarize.ts绝对路径> <samples.json绝对路径>` 重算，结果不会修改资源。

若后续获得性能复测授权：在独立 scratch 目录为每阶段建立 `node_modules/before.ts` 和 `candidate.ts`，
按原 harness imports 放置原 TS；用已安装的 Bun 1.3.14 `bun build <harness.ts> --target=node --outfile=<harness.mjs>`。
先独立核对 fixture/algorithm/compiled identity，再在相同 pinned Node、machine/load 条件下运行。
改变 source 路径可能改变 bundle 的 path comments；不能仅凭编译成功认定与旧 JS 身份相同。
`measure` 模式还会 digest 同目录 `harness.mjs` 与 module sources，不应直接对本目录改名 bundle 运行 measure。
任何新 window 都应独立保留，不覆盖本目录原 raw。未重跑性能、未承诺跨机器或 Bun 性能复现。
