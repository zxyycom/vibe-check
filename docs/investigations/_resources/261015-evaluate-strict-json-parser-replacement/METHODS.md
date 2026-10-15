# 严格 JSON 解析器调查：取证与重放方法

随附资源保存本轮样本与原型，供阅读复核；Product 行为与当前 Case 仍由各自 owner 维护。
对照源为 `fc584f2bd52ad60da9d80d05bbe8097da4c6c57e`；`momoa-control.ts` 前 6483 bytes 与该版
`strict-document.ts` 相同，末尾仅追加阶段探针。依赖使用现有 Momoa 3.3.12。

## 按复核任务阅读

| 任务 | 材料 |
| --- | --- |
| 核对输入、算法与行为 | `corpus-manifest.csv` / `corpus.ts`，Momoa 对照、两版原型及对应 `verify` 脚本；初版保留递归退化现场。 |
| 核对性能数字与归因 | `samples.csv` 与 `measurements-summary.csv`，`phase-samples.csv`，`evidence.json` 中的环境、行为与统计摘要。 |
| 核对版本和字节身份 | `registry-snapshot.json`，`momoa-artifact-comparison.json`，`source-manifest.sha256`。 |
| 重放本轮实验 | 下文命令；输入准备、测量调度、worker 与阶段入口分别保留为源码。 |

## 输入与测量口径

- `prepare-corpus.py` 从固定 Git revision 提取全部 tracked `docs/**/*.json`；路径、字节数与 SHA-256 见 manifest。
- `corpus.ts` 另定义宽对象、数字数组、长转义字符串、末尾同值重复键；合成输入组包含重复文档，
  不代表用户频率分布。`semanticSources()` 使用固定 seed 和未覆盖掉的重复成员文本。
- 每宿主 5 对独立新进程，A/B、B/A 交错、全程串行，每进程先预热一轮、再测一轮；CSV 保留预热、样本与顺序。
  wall/CPU 覆盖已读 bytes 的文档边界，IO、Check/Run、启动与包验收在计时之外。
  随附 CSV 统一为 LF 换行，数值和行序保持原样。
- CSV 的 `processWallMs` 覆盖整次进程调用，包含准备、预热及全部输入组，并在其各行重复；
  它只用于核对执行，不累计为输入组耗时，也不是冷启动指标。
- `maxProcessRssKiB` 是单 worker 全进程高水位，包含模块、语料、JIT、预热与先前输入组；
  `evidence.json` 按整 worker 取 peak 后求中位数，表示进程内存而非 parser 独占 heap。
- 阶段探针独立运行，预热 1 轮、观察 3 轮；各阶段是 wall time 归因，区别于 CPU sampling profile，
  不能把各列中位数精确相加为独立吞吐量样本。
- Bun 的 `process.version=v24.3.0` 是该宿主的报告值；独立 Node 测试版本为 24.18.0。

## 原型与验证记录

初版 `native-prototype.ts` 递归复制安全值；两宿主普通矩阵均无差异，但 Node 的 depth=4096
压力输入变为 `unavailable`。`verify-recursive.ts` 保存当时比较脚本，`evidence.json` 保存原结果。
修订版 `native-iterative-prototype.ts` 仅处理新解析的私有值，以显式栈移除对象 prototype 并冻结全部容器，
不保留可变别名；最终吞吐量只测修订版。depth=16384 的容量差异另记为压力观察。

原型类型检查在补上 `--types node` 和阶段联合类型的纯类型标注后通过；TypeScript emit 比对确认标注前后 JS 相同。
首次失败与更正后的通过日志分别留在 scratch。

## 重放

从仓库根运行，需固定 revision、现有锁定依赖、mise、uv 和相同 runtime 可用；输出目录须全新。
按需执行以下命令，会创建本地文件并消耗 CPU。

```bash
R=docs/investigations/_resources/261015-evaluate-strict-json-parser-replacement
mkdir -p tmp/json-parser-replay
uv run --no-project python "$R/prepare-corpus.py" tmp/json-parser-replay/pack.json
mise exec -- bun run "$R/verify.ts" tmp/json-parser-replay/pack.json
mise exec -- node "$R/verify.ts" tmp/json-parser-replay/pack.json
uv run --no-project python "$R/run-measurements.py" tmp/json-parser-replay/pack.json tmp/json-parser-replay/paired
mise exec -- bun run "$R/phases.ts" tmp/json-parser-replay/pack.json
mise exec -- node "$R/phases.ts" tmp/json-parser-replay/pack.json
```

样本、脚本、汇总、source hashes 与 registry 快照随报告保存；原始 worker stdout/stderr、完整 pack 和工程日志
暂留 `tmp/strict-json-parser-selection-20261015/`，仅供当轮复核，重放可从固定 revision 重新生成输入。
registry 字段来自公开 npm HTTPS GET；Momoa tarballs 只在内存中解包比对，未安装或执行下载的代码。
