# Lizard 性能测量

显式比较 Lizard Python 与 TypeScript 实现时使用本文；先选择测量问题，再选择 layer 和 temperature。
这不是常规验证前置，也不授予修改 analyzer 的权限。

## Lizard / TypeScript performance evidence

### 用途与结果范围

`scripts/development/lizard-performance/command.ts` 是唯一显式选择的开发期比较入口。它**只形成 evidence，不授权或实施优化**；尤其不得据此修改 source-aligned analyzer core/readers/shared/protocol。

结果必须按 layer、workload 与 temperature 读取，不能压缩成一个“Python 或 TypeScript 更快”的结论：

| Layer | 回答的问题 | 不可替代的边界 |
| --- | --- | --- |
| A — historical Product end-to-end | 迁移前后完整 Product invocation | 包含 1.23→1.24、I/O、subprocess/Worker 与 Product 边界变化 |
| B — fixed Lizard 1.24 analyzer-only | 同一已解码 source 上的 Python API / current port cost | 不含 Product read/decode、Worker、CLI/CSV 或 settlement；tiny startup 与 representative batch 分开解释 |
| C — current Product decomposition | current path 的诊断定位 | stage 时间可重叠；不提供 historical 或 analyzer-only 替代值 |

运行前确认写入、安装与必要的联网授权：A 会在指定历史 worktree 写入并尝试清理 `.lizard-performance-historical-driver.ts`，须保证该路径可由本次测量独占；B 在系统临时目录创建 venv，用 `uv` 安装固定 Pygments（可能访问包源），结束后清理 venv。

```bash
bun scripts/development/lizard-performance/command.ts --mode smoke --layer B \
  --lizard124-source /absolute/lizard-1.24-upstream-checkout \
  --output /tmp/vibe-check-lizard-smoke
bun scripts/development/lizard-performance/command.ts --mode full --layer A --temperature warmed-operation \
  --historical-worktree /absolute/historical-worktree --lizard123 /absolute/lizard-1.23 \
  --output artifacts/development-benchmarks/<run-id>
```

### 证据与测量方法

测量材料写入 `--output`，其中 `evidence.json` 保存 raw samples、环境、scope 与统计，`summary.md` 用于定位；前述临时环境与 driver 不受该输出路径限制。入口不进入默认命令、普通 `bun test`、package payload 或 Gate；正式结论与外推边界由对应 Investigation Report 拥有，不能用 summary 替代。

B 要求显式 fixed upstream `308b1c3…` checkout；provision 时间不计入样本，evidence 仅保留最小 formation provenance。

B 先 canonicalize Product 消费的 file/name/location/NLOC/CCN/parameter fields，再对每一个计数样本复核 preflight digest。它同时报告：

- 160-byte TS/JS tiny cold-start；
- 27 reader-family representative fixtures 的 normal+edge（不含 malformed）各复制 64 次的 representative batch；
- full 模式按 deterministic ABBA 顺序保留 15 blocks / side 30 samples、IQR 标记与 paired bootstrap CI。

A、B、C 互不替代。

### 温度与资源语义

cold statistics 选择 supervisor whole-fresh-target wall。`warmed-operation` 的两侧各先做一次未计入的同进程分析，statistics 只选择 target 内部第二次 operation wall；它不是 long-lived warm session。

Linux collector 的 CPU 是 `wait4` target 加其已 reaped descendants；RSS 只是在这些进程中的 single-process maximum（KiB→bytes），不是 process-tree aggregate。非 Linux fail-closed。因此 CPU/RSS 只作为 whole-target session diagnostics，资源优劣为 `not-comparable`，不能冒充 operation resource。

C 的 total/read/decode/direct port-façade harness diagnostics 有重叠；Worker roundtrip 只用同一次 Worker 的内部 adapter+port duration 作机械差分，adapter mapping 单独不可隔离时明确为 `null`。

Python/Lizard、subprocess、CSV、fixture worktree 和 benchmark-only test-support harness 均只存在于该 opt-in developer workflow，不能成为 Product runtime、fallback 或 public façade。
