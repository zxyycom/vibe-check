---
title: "Function metrics 读取让步优化实施与验收"
id: "261011-verify-function-metrics-admission-implementation"
formedAt: "2026-10-11T15:58:32Z"
question: "逐块 setImmediate 是否保留完整输入、取消与清理，并在 exact installed Node 完整 Check 对照中满足采用标准？"
tags:
  - "cancellation"
  - "function-metrics"
  - "input-admission"
  - "performance"
  - "resource-boundaries"
relations:
  - type: "复查"
    target: "261008-function-metrics-admission-yield"
    summary: "以精确安装与完整 Check 复查局部让步收益和边界"
---

## 形成时背景

用户授权完整实施读取优化 Change，在已验收升级与 TypeScript 修复之后串行开展。
[直接前序](function-metrics-admission-yield.md)定位逐块 timer 的局部成本并保留取消方向，
但受控 port 样本不能证明完整 Check 收益。本轮在新基线上冻结精确安装和真实语料，
只改私有默认 helper，以支持 Node 完整路径与资源证据复查取舍。前序保留其局部实验条件和结果。

## 调查目的

核对逐非空 32 KiB chunk 的 setImmediate 是否仍给同线程 timer/I/O abort 执行机会，
保持实际 8/64 MiB caps、整批提交、rejection、无伪造 waiver audit 和 FD/Worker 清理。
以相同配置、真实 Worker、精确 installed roots 和 15-block ABBA 对照决定采用。本轮冻结的采用条件为：
至少一个压力形态有可区分收益，真实语料与另一形态无可重复退化。

## 调查范围与依据

### 已取得的身份与输入

- 基线 HEAD 为 `85776a7c8b62fd18d1e8e5bd1a27a63cd95e924a`，来源仍为 Lizard 1.24.1 加批准偏差。
  改动前 public package:status 验证 `0.0.0-local.9b17c1319000` current；完整安装、tarball 与 receipt
  复制到自有 `/tmp/vibe-check-admission-85776a7c/before`，workspace receipt 保持原状。
  tarball SHA-256 为 `b06e518ba7c5148d656e02eba7caf6e0f482e7ec737dbde458dd2c7be862f055`。
- 冻结所有真实 `src/**/*.ts` 的完整 union：601 files / 3,061,915 bytes，包含测试/fixture，
  配置 `useDefaultExcludes: false`，因此本次真实形态是全部 src 而非仅 Product runtime。
  另有 200×128-byte / 25,600 bytes 与 1×4 MiB / 4,194,304 bytes 的受控输入。
  逐文件 hash/bytes manifest 与只读 content snapshot 在改动前形成；fixture 建立不计时。
- Bun 1.3.14 承载仓库测试/脚本，Node 24.18.0 承载 installed consumer、资源与性能路径。
  唯一生产调整为 measurement helper 名称和 setTimeout→setImmediate；chunk、频率、checkpoint、read/decode/Worker 不变。
  preliminary public rebuild 为 `0.0.0-local.8bcc6e4ba797`，全 emitted `.mjs` 对比只有 `measurement.mjs` 改变。

### 资源观测与性能方法

- 独立资源 runner 的 private measurement/controlled port 定位 caps、FD、fault 与 cleanup；
  public Run 分支使用生产默认和真实 Worker，初步与最终精确安装的观测分别保存在 `preliminary-resources.json` 与 `final-resources.json`。
  FD instrumentation 仅在测量调用期间启用，将成功打开的 descriptor 与 close 逐项对照；
  fixture setup 不计入 admission FD。native hooks 最终恢复，自有 temp fixtures 清理。
- 初步和最终完整性能采样已通过。`benchmark.mjs` 只从 installed root import 公共 `functionMetrics`/`defineConfig`/`run`；
  两个长驻宿主按 corpus 各一次未计入 warmup 后串行 ABBA 15 blocks / side 30 samples，
  每次 invocation 仍创建真实 Worker。
  cold supervisor 从 fresh child 建立到首次 operation 完成单列，不含等待物理退出，不混入 warm 统计。
  完整 outcome/aggregate/Records/message 文本逐样本比较，只投影去除 Run identity/timing，保留全部
  ND、contributors、rejections、waivers 和 message 语义；失败立即停止，不丢弃异常样本。
  保存 raw wall、median/p95/IQR、block 配对差及确定性 bootstrap paired mean 95% 区间。
  环境采集位于计时外，记录 before/after 安装与 corpus 的 filesystem；采样时独占宿主，不并行 build/tests/Gate。

资源中的 `.mjs` 是本轮一次性做法记录，不是长期仓库工具或 Case。入口注释给出参数；
重跑时先通过公开 package workflow 准备精确安装，再向 benchmark 传入安装根、冻结的 corpora 根和自有输出路径。
manifest、初步身份与观察保留原样，最终复采另存资源，保持两次产物可独立复核。

## 调查结果与边界

**逐块 setImmediate 已满足采用条件；最终精确候选的完整复采、行为/资源与43项Gate验收通过。**
下文分别保存初步采用与最终产物的身份和观察，不把两阶段样本混为同一产物。

### 行为与资源

最窄 16 tests / 5 files、整个 function-metrics 113 tests / 39 files、typecheck/lint 已通过。
Test Evidence 为 702 current entities / 176 Cases；新增四项复用原 Check 行为 Case，未增加机械 Case。

- pre-abort 不打开 source、不创建 Worker；default helper 首次实际调用处安排 timer/I/O callback，
  delegate 原 setImmediate 不替换行为；读取在后续 checkpoint 停止，没有 Worker batch。
- early-file 测试在该文件 chunk yield、尚未 EOF 时 abort，证明后续 exact path 不读取/不提交。
  其观察边界是首文件读取中取消，EOF 后外层文件 checkpoint 不由该 Case 证明。
- real private Worker 提交后 abort 一次结算，实际移除唯一 abort listener、unsubscribe 并调用 terminate 一次；
  controlled late message/error/exit 不再结算。public Run 另观察 message/error/exit off 各一次、terminate 一次。
  这些是调用/卸载证据，未等待或声称物理线程退出。
- public default timer/I/O 与 Worker 在途取消保留先前 input-rejected Record，无 metric prefix/final data/waiver audit。
  Run 为 cancelled，scheduler outcome reason 为 execution-cancelled；Check direct callback 为 unavailable/cancelled。
- private default caps 直接接受 exact 8 MiB 和 exact 64 MiB；各 +1 在 Worker 创建前失败，所有 FD 成对关闭。
  empty batch、missing/open/read fault、BOM/valid newline 与 invalid-byte fallback 均覆盖；
  fallback 保留初始 BOM 与原 CRLF，沿用现有 decode 结果。
- Worker create/post/message/error/exit0/exit1 的完整失败和 late-event 幂等有 installed private probe，
  source 既有矩阵另证明 transport shape 和非 approved-path rejection。

### 初步完整 Check 采用证据

支持 Node 24.18.0 的精确安装对照为 timer `0.0.0-local.9b17c1319000` → immediate `0.0.0-local.8bcc6e4ba797`。
三个 corpus 各 15 blocks、30 samples/side，共 180 计时样本，另有 6 cold 和 6 uncounted warmups；
所有完整 canonical Records/outcome/aggregate/messages 相等，异常样本没有剔除。

| 形态 | median A→B (ms) | p95 A→B (ms) | median 相对变化 | 配对 mean bootstrap 95% CI B−A (ms) |
| --- | ---: | ---: | ---: | ---: |
| 真实全部 src | 1279.730→602.187 | 1341.092→645.092 | −52.94% | [−685.463, −673.926] |
| 200 个短文件 | 287.248→61.743 | 291.899→70.451 | −78.51% | [−226.314, −224.092] |
| 4 MiB 单文件 | 328.696→188.656 | 336.464→203.486 | −42.60% | [−140.704, −136.117] |

三个形态都为 15/15 blocks 更快；A/B IQR 分别为 19.831/10.815、2.608/2.676、3.048/7.738 ms，
效应与噪声可区分。两个 timer-heavy 完整路径有收益且真实形态无可重复退化，按冻结设计条件初步采用 setImmediate。
只说明本轮同条件相对成本，不与升级阶段不同语料/配置的绝对时长拼接，不外推 Gate 加速或一般语言分布。
OS、CPU、Node、三处同 `/dev/sdd` ext4 storage、temperature、cache、完整配置与 raw samples 均保存。

原性能 JSON 约 3.8 MiB，超过既有单文件材料上限；本轮保留同一证据的有界表示，而不调整验证限制。
`preliminary-performance.json` 保存全部样本、统计、环境及配置。真实语料的完整 4,391 个 Records
按顺序分为五份（每份至多 1,000 项），其 `semanticReference` 保留 metadata、有序 `recordsParts`、
`recordCount` 和完整语义的 `canonicalSha256`；另外两个 corpus 的完整语义仍直接保留。
恢复时依引用顺序连接 Records，再与 metadata 合并并递归排序对象 key，数组顺序不变。
独立 Node 24.18 核对已证明：恢复后的完整 evidence 与原始 JSON 深度相等，三个 corpus 的摘要
均匹配各自 60 个计时样本、2 个 cold 和 2 个 warmup；五份 Records 资源各小于 1 MiB。
该分包没有删字段、样本或改动统计，完整语义摘要不是单个资源文件的字节 hash。

原大文件留在自有 `/tmp/vibe-check-admission-85776a7c/preliminary-performance.json` 作重构对照，
不作为仓库交付物。正式保留的是上述 summary 与有序 Records 资源；临时目录按已有 artifact note
保留至最终证据复制并经 root 接纳，由 root 收尾，不依赖临时文件读取正式调查结论。

非实施 reviewer 另以 Node24.18 一次性私有 seam 探针观察真正 EOF 后外层 checkpoint：
yield 中双层 queueMicrotask 延后 abort、返回 Promise.resolve，并通过委托原 aborted getter 记录首次 true 的调用栈。
同步 abort 对照命中 readBoundedSource:109，双层 microtask 命中 readExactFunctionSources:70，二者 cancelled/exit0。
该 tmp 探针已清理，无持久 Case/原始资源，不作为生产默认或性能证据。

### 最终精确产物与验收

owner/changelog 独立收尾之后，public package:build 重建最终 `0.0.0-local.f83e9a2caff6`，status 为 current。
tarball SHA-256 为 `b890dd1a12cb0edad00196caf2d1a3033b7af89181b5ea33279fa74296f992b6`；
全部 emitted `.mjs` 与 timer baseline 比较仍只有 `measurement.mjs` 改变，其 hash 与初步候选相同。
包材料差异不冒作算法变化。最终 Node24.18 再以同一 frozen before、三组 snapshot/config 和 ABBA 完整重采：

| 形态 | median A→B (ms) | p95 A→B (ms) | median 相对变化 | 配对 mean bootstrap 95% CI B−A (ms) |
| --- | ---: | ---: | ---: | ---: |
| 真实全部 src | 1279.864→606.870 | 1308.072→655.858 | −52.58% | [−676.907, −670.379] |
| 200 个短文件 | 287.455→61.600 | 292.308→67.736 | −78.57% | [−226.453, −224.318] |
| 4 MiB 单文件 | 327.507→188.172 | 343.561→204.238 | −42.54% | [−142.705, −137.278] |

每形态仍为30 samples/side、15/15 blocks 更快，全部180计时样本及独立6cold/6warmup完整语义等价。
A/B IQR 为10.320/11.785、3.329/3.140、6.405/3.719 ms，收益可区分于噪声且没有可重复退化，采用条件闭合。
最终性能资源沿用同样有序分包；恢复完整4391 Records后与原始完整JSON deepEqual，全部样本摘要匹配。

最终 exact installed Node 资源 runner 全部通过；113 tests / 39 files、typecheck/lint/format、Decision/Change check
和 diff whitespace 均 exit0。随后同一 candidate 的完整 `mise exec -- bun run check -- --all` 为
**exit0 / 43 passed / 0 failed**，含 artifact、installed runtime/types/docs 与真实 Worker acceptance。
Gate保留原有non-blocking诊断/waiver，未改变门限或为本项新增waiver；该通过结果不是Gate加速对照。

非实施代理分阶段审查生产正确性、coding-style/AI可读性和资源表示；默认timer/I/O证据、early-file边界、
真实Worker和once cleanup调用层级分别核对。稳定实现说明和版本净变化分别交给 scanner-dependencies 与 changelog，
公开指南原“可观察边界取消”承诺不变，没有新增配置或毫秒响应保证。
最终资源与完整命令/exit记录见acceptance；报告与本地候选不是正式包发布或用户环境应用证据。
Git提交、临时snapshots收尾与Change finalize由root按授权另行完成。

### 未覆盖范围与交接

组合命令使用 `set -euo pipefail`；开发中参数、类型/lint 与 probe 断言失败均停止该组合，
修正后重跑，成功结果只归属于实际通过的运行。
两处一次性 runner 的参数解析错误在采样前以 exit 1 停止，修正后才取得上述完整样本；
原始大 JSON 的材料校验失败通过分包处理，没有放宽 size gate 或排除异常样本。

资源结果仅覆盖本次 Linux、锁定 Node/Bun 和声明形态；同步 open/read/concat/decode 不可抢占，
32 KiB 与 setImmediate 不是硬 latency 保证，不证明 RSS/heap 上限或跨平台取消分布。
本轮支持宿主、精确安装和声明输入已验收；未重新运行旧Node源树prototype断言矩阵，
安装后语义以完整公开字段和Records独立比较，不修改Product normalization迁就断言。

## 随附资源

- [最终命令、采用判断与重构核对](./_resources/261011-verify-function-metrics-admission-implementation/acceptance.json)
- [冻结 timer 产物身份](./_resources/261011-verify-function-metrics-admission-implementation/before-identity.json)
- [公共 installed 完整 Check ABBA 一次性 runner](./_resources/261011-verify-function-metrics-admission-implementation/benchmark.mjs)
- [冻结三组语料逐文件字节与 hash](./_resources/261011-verify-function-metrics-admission-implementation/corpus-manifest.json)
- [最终113项function-metrics测试输出](./_resources/261011-verify-function-metrics-admission-implementation/final-function-tests.txt)
- [最终43项完整Gate输出](./_resources/261011-verify-function-metrics-admission-implementation/final-gate.txt)
- [最终精确安装与tarball身份](./_resources/261011-verify-function-metrics-admission-implementation/final-identity.json)
- [最终唯一生产模块差异](./_resources/261011-verify-function-metrics-admission-implementation/final-module-difference.json)
- [最终完整Check样本、统计与语义引用](./_resources/261011-verify-function-metrics-admission-implementation/final-performance.json)
- [最终真实语料完整Records分块1](./_resources/261011-verify-function-metrics-admission-implementation/final-real-records-1.json)
- [最终真实语料完整Records分块2](./_resources/261011-verify-function-metrics-admission-implementation/final-real-records-2.json)
- [最终真实语料完整Records分块3](./_resources/261011-verify-function-metrics-admission-implementation/final-real-records-3.json)
- [最终真实语料完整Records分块4](./_resources/261011-verify-function-metrics-admission-implementation/final-real-records-4.json)
- [最终真实语料完整Records分块5](./_resources/261011-verify-function-metrics-admission-implementation/final-real-records-5.json)
- [最终installed Node的资源、取消与协议观察](./_resources/261011-verify-function-metrics-admission-implementation/final-resources.json)
- [基线 clean source 与压力 corpus 冻结器](./_resources/261011-verify-function-metrics-admission-implementation/freeze-corpora.mjs)
- [精确安装与 tarball 身份采集器](./_resources/261011-verify-function-metrics-admission-implementation/freeze-identities.mjs)
- [完整性能证据的有界 JSON 一次性打包器](./_resources/261011-verify-function-metrics-admission-implementation/pack-performance.mjs)
- [初步候选身份](./_resources/261011-verify-function-metrics-admission-implementation/preliminary-identity.json)
- [初步完整 Check 样本、统计与语义引用](./_resources/261011-verify-function-metrics-admission-implementation/preliminary-performance.json)
- [初步真实语料完整 Records 分块 1](./_resources/261011-verify-function-metrics-admission-implementation/preliminary-real-records-1.json)
- [初步真实语料完整 Records 分块 2](./_resources/261011-verify-function-metrics-admission-implementation/preliminary-real-records-2.json)
- [初步真实语料完整 Records 分块 3](./_resources/261011-verify-function-metrics-admission-implementation/preliminary-real-records-3.json)
- [初步真实语料完整 Records 分块 4](./_resources/261011-verify-function-metrics-admission-implementation/preliminary-real-records-4.json)
- [初步真实语料完整 Records 分块 5](./_resources/261011-verify-function-metrics-admission-implementation/preliminary-real-records-5.json)
- [初步 installed Node 的 FD、取消与协议观察](./_resources/261011-verify-function-metrics-admission-implementation/preliminary-resources.json)
- [初步产物唯一生产模块差异](./_resources/261011-verify-function-metrics-admission-implementation/production-module-difference.json)
- [有界资源与取消一次性 runner](./_resources/261011-verify-function-metrics-admission-implementation/resources.mjs)
