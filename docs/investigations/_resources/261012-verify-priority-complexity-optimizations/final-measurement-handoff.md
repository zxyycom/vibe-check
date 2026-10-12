# 最终性能测量交接

## 读法与统一边界

- 先读 `public-run-comparison.json` 与 `check-priority-final-comparison.json`，再展开 raw/identity/count。
- K 的旧 `after` 是首次 Gate 遇复杂度阻断的中间树，保留形成时事实，不用于最终交付性能论断。
- 最终 K 已在 helper 拆分后重测；原 Run 生产功能不变，不把同一第一批收益重复归因。
- Public Run 和 K 是两轮独立 before/after；K-before 已包含第一批优化，不相互混算收益。
- 所有正式计时为 Bun 1.3.14、warm process、单进程串行；每组合独立启动宿主。
- Node 24.18.0 只验证公开 root TypeScript 的 N=1 smoke，不支持 Node 性能收益结论。
- Linux WSL2 x86_64，6 logical CPUs，cgroup quota 4 cores、memory limit 6 GiB；不是独占硬件保证。
- `performance.now()` 测量 public 操作 wall time；import、fixture、Definition 构造、断言与 digest 在外。
- 默认 static、`maxParallel=1`、全部 Run outputs/terminalEffects disabled；无自定义策略或 writer。
- 原始样本全部保留；报告 median、min/max、MAD，不删 outlier、不估计可靠 p95。
- 没有批准的 latency budget；这是 observation，不是 timing CI gate。

## 第一批 Public Run

```bash
cd /workspace/vibe-check
R=/workspace/vibe-check/docs/investigations/_resources/261012-verify-priority-complexity-optimizations
mise exec -- bun run "$R/public-run-benchmark.ts" \
  --shape independent --size 512 --warmups 3 --samples 9 --iterations 1
```

- 固定顺序：N=1/8/32/64/128/256/512，每 N 为 independent→chain，14 组合。
- independent 无边；chain 只依赖前项；callback 常数 `passed/data={}`。
- N=1/8 每 sample 固定 20 次 Run，其它固定 1 次；主统计为九个 sample mean 的 median。
- 同窗口 controls 复测 N=1/8/512，两 shape 各 before→after，宿主串行、不混 runtime。
- before HEAD：`b01676764100e81603c0d64749a1b56a66682337`，before src 无改动。
- harness SHA：`90bfe0888cf05fd39f0553ecb68f575ce422533caa2766b0cdb7571a65ad2368`。
- after dirty tree 由 `public-run-after-identity.json` 的成员 hash/status/diff 定位，不冒充新 commit。
- N512 primary independent 3555.936→587.295 ms；chain 1616.593→358.463 ms。
- N512 controls independent 3681.737→630.315 ms；chain 1667.522→467.281 ms。
- 保守描述：该 workload 独立图约 83%、链约 72% 降低；不是任意项目或 runtime 的保证。
- 小规模范围重叠；N8 chain control +0.66%，低于观测噪声，不作确定回退/收益结论。

### Public Run 资源

- `public-run-before.json` / `public-run-after.json`：逐命令、warmups、raw wall samples 与宿主事实。
- `public-run-before-identity.json` / `public-run-after-identity.json`：source inventory/hash、锁文件、harness。
- `public-run-before-summary.json` / `public-run-comparison.json`：统计与判断边界。
- `public-run-interleaved-controls.json`：同窗 before/after serial control 原样本。
- `public-run-*-operation-counts.json` / `core-*-operation-counts.json`：独立 instrumentation 进程，不计时。
- `public-run-operation-count-comparison.json`：probe SHA、历史 locked 结果一致性与当前 source 核对。
- `public-run-*-smoke.json` / `public-run-bun-pilot-256.json`：合法入口与规模 pilot，不混入正式统计。
- `public-run-snapshot-lifecycle.json`：最初仓库内副本迁出原因、旧/新路径及清理条件。

### 第一批计数解释

- N128 chain settlement-find 690880→0；independent scope-find 2812544→0。
- 两种 public shape graph stringify 258→1，DTO freeze 4 不变，semantic digest/fingerprint 匹配。
- C02 N64 open/settle find 2080→0，重复 known-ID Set 输入 4096→0。
- C02 constructor 在 probe 包装前；Set detector 只计 array 输入，不声称总分配为零。
- 当前 source 的 private Map/Set 与 invocation fingerprint cache 支持目标重复工作消除。
- per-decision pending scan、Map 构建及 candidate 处理仍在，不能声称整体 Run 为 O(N)。

## 第二批 K01/K05/K06

```bash
F=/tmp/vibe-check-k-fixtures-yH6WLW
mise exec -- bun run "$R/check-priority-benchmark.ts" \
  --workload anchors --size 4096 --fixture-root "$F" \
  --warmups 3 --samples 9 --iterations 1
mise exec -- bun run "$R/check-priority-operation-counts.ts" --fixture-root "$F"
```

- 六组合顺序：directory32/1024、anchors16/4096、reminders4/32。
- directory32 每 sample 10 次，其它 1 次；均三 warmups、九 samples；controls 同六组合 before→after。
- K01：平目录空 `.ts` 文件、同数量精确 patterns、关闭默认 excludes，完整 public collection。
- K05：单 `a.md`，H=Q，同文档最后合法 slug；cache disabled，默认 limits，零 Finding/Record。
- K05 N4096 实际 204799 bytes，SHA 与 manifest/before/after 一致；此前 221183 消息为笔误。
- K06：真实 root+4/32 successors，R=1/8，同 root baseline，每 commit append 一行，无 merges。
- K06 固定 fixture Git identity/date，system/global config、hooks、signing 隔离，仅 `/tmp` Git 写入。
- K-before 是第一批已优化 dirty tree，完整身份见 `check-priority-before-identity.json`。
- K-final 含 K01 validatedDirectoryEntry、K06 measuredCommitPrefix 拆分与测试迁移；前后 source/hash 稳定。
- final manifest SHA：`b5336be5589ceb02b698e939b5aacafa16746d0a0ad1a9a081c07aa03ecd80bf`。
- harness SHA：`0efa6462349e90f2ae0bbf0514b01a366265573b23d76dab774628757f0ca44a`。
- fixture manifest SHA：`26951049de91f724b5f53cc0eae8165c4a2219a255387713440afbb85417b43f`。
- K01 N4096 pilot 遇 20 秒进程 deadline、无合法 wall sample；正式规模在实施前降至 N1024。
- K01 primary 1223.450→1243.457 ms；final control 2412.190→1866.548 ms 但范围宽且重叠，整体收益未证实。
- K05 final control 800.629→636.501 ms（20.50% 降低）；K06 517.893→68.981 ms（86.68%）。
- 小规模 primary 某些数值变慢，同窗 controls 范围重叠/方向不稳定；不保证确定无回退或确定回退。

### K 资源与操作归因

- `check-priority-fixtures.ts` / `check-priority-fixture-manifest.json`：构造方法、文件/hash、真实 Git history。
- `check-priority-pilot-*.json`：规模探查；directory4096 明确保留 timeout，而非空 JSON 或伪时长。
- `check-priority-before.json` / `check-priority-final.json`：最终六组合的原始命令、wall 样本与环境。
- `check-priority-final-identity.json`：最终完整 source hash/status/diff、依赖锁和 probe/harness 身份。
- `check-priority-final-comparison.json` / `check-priority-final-interleaved-controls.json`：最终统计/control 原样本。
- `check-priority-before-summary.json` / 原 `after`、comparison/control/identity：保留历史阶段，不覆盖。
- `check-priority-final-operation-counts.json` / `check-priority-final-operation-count-comparison.json`：最终真实路径计数。
- K01 N1024 name predicates 1048576→0；source 以 operation-local name→原 entry LIST 查找，保留 byte fidelity。
- Map-get stack count 包含既有目录缓存，不只新名字索引；零 predicate 需结合 source，不代表全流程 O(N)。
- K05 N4096 slug predicates 16777216→0，Set.has=4096，一次 slug Set 构建/4096 输入；不是旧 private seam。
- K06 native Git Trace2 process 266→35，diff-tree 256→32；trace 仅独立计数，raw trace 已删除。
- K06 timing/count 是成功 history；失败 retry、overflow、取消由行为测试证明，不外推本 fixture。
- `check-priority-fixture-consistency.json`：实际 Markdown bytes/SHA 对 manifest 与 immutable raw 的核对。
- `check-priority-final-verification.json`：最终计数/broad 后 source 与 fixture 的额外稳定核对。
- `broad-collection-control.ts` / `check-priority-final-broad-{before,after,comparison}.json`：最终 common-path sanity。
- final broad N1024 `**/*.ts`：7.488→7.296 ms，MAD .707/.701，范围重叠，不保证确定收益或回退。

## 临时物与交付责任

- before source roots：`/tmp/vibe-public-run-before-b016767-DU9nzf`、`/tmp/vibe-check-k-before-6Ta1QG`。
- fixture root：`/tmp/vibe-check-k-fixtures-yH6WLW`；source roots 只读依赖 symlink，不复制 node_modules。
- 所有冻结树无嵌套 Git；只有明确授权的真实 Git fixtures 含 `.git`，不触碰工作仓库 index/remote。
- 报告审查完成后精确清理上述 owned roots 与本任务 tmp notes/pointers；正式证据继续保留。
- 清理不撤销已采集证据；复现旧实现须恢复 identity 中 HEAD+对应 src diff，不能拿当前 tree 冒充 before。
- 本测量代理未实施 Product/测试/Case，未 stage/commit；测试、lint/typecheck/完整 Gate 由主线程交付。
- 测量脚本实际验证完整 public facts、输出关闭、顺序与 semantic digest；工程校验不等于性能证据。
