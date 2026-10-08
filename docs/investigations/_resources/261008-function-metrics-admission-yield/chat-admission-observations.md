# Admission 观测与验证来源

本资源服务 `261008-function-metrics-admission-yield` 的局部性能/取消比较和验证边界复核。
旧性能数值由主代理在本聊天中亲自执行、通过工具输出取得；调查子代理于 2026-10-08 保存主代理交接。
原 stdin harness / fixture 已清理，只剩聊天输出；此处不是原脚本副本、重跑记录或正式 E2E benchmark。
对原始输出仅作表格化整理，没有推算缺失项或把后续验证计时混入旧性能样本。

## 原样本方法和重建条件

- 当前源树的 `measureFunctionMetrics({ input: { rootDir, approvedExactPaths, areas: [] }, signal }, dependencies)`。
- Linux；mise-bound Bun `1.3.14` 和 Node `24.18.0`。旧调用形态为 `mise exec -- bun run -` 与
  `mise exec -- node --input-type=module`，脚本经 stdin 输入，没有保存旧脚本文件路径。
- 为每项 workload 在独占系统临时目录生成 `.ts` fixture：200 × 128-byte ASCII 空格文件，或
  1 × 4 MiB ASCII 空格文件。创建 fixture 不计时，同进程、warm-cache，每个组合连续 3 次。
- 包围 measurement 调用计 wall ms；scripted Worker 的 `subscribe` 保存 listeners，`postMessage`
  同步发布 `{ kind: "complete", metrics: [] }`，取消 probe 的 `createWorker` 记录是否启动。
  fake Worker 不运行 analyzer，因此包含 admission/read/decode 与受控 transport，不含真实 Worker 成本。
- 默认组合只注入 `createWorker`，保留当前 production `setTimeout(resolve, 0)`；immediate 组合另
  注入基于 `setImmediate(resolve)` 的 Promise；microtask 诊断注入 `Promise.resolve()`。
  上述是主代理方法说明，不宣称逐字恢复了旧脚本。
- 性能样本不取消；取消 probe 为 1 × 8 MiB 空格文件，在调用前用 `setTimeout(0)` 调度 abort。
- 未取得隔离 CPU/GC、cold cache、phase telemetry、CPU/RSS、p95 或稳定 variance；N=3 / N=1
  不能提供上述统计保证。重建同逻辑 harness 可以取得新样本，不能冒充原脚本重跑。

## Bun 1.3.14：全部旧 wall 样本，ms

| Fixture | yield | 3 次样本 | median |
| --- | --- | --- | ---: |
| 200 × 128-byte files | default timer | 247.29, 238.69, 240.38 | 240.38 |
| 200 × 128-byte files | setImmediate | 4.60, 5.08, 5.68 | 5.08 |
| 200 × 128-byte files | Promise.resolve 诊断 | 1.71, 2.19, 1.51 | 1.71 |
| 1 × 4 MiB file | default timer | 158.88, 157.68, 157.36 | 157.68 |
| 1 × 4 MiB file | setImmediate | 10.58, 7.72, 5.95 | 7.72 |
| 1 × 4 MiB file | Promise.resolve 诊断 | 16.12, 3.97, 8.45 | 8.45 |

## Node 24.18.0：全部旧 wall 样本，ms

| Fixture | yield | 3 次样本 | median |
| --- | --- | --- | ---: |
| 200 × 128-byte files | default timer | 234.20, 232.10, 232.30 | 232.30 |
| 200 × 128-byte files | setImmediate | 5.53, 3.05, 4.75 | 4.75 |
| 1 × 4 MiB file | default timer | 152.18, 153.83, 154.56 | 153.83 |
| 1 × 4 MiB file | setImmediate | 4.44, 6.09, 5.07 | 5.07 |

Node 没有对应 Promise.resolve performance 样本，不用 Bun 数据填补。

## 旧取消 probe：各一项，不是 latency percentile

| Runtime | yield | file | abort | result | Worker 启动 | wall ms |
| --- | --- | --- | --- | --- | --- | ---: |
| Bun 1.3.14 | default timer | 8 MiB | setTimeout(0) | cancelled | 否 | 2.84 |
| Bun 1.3.14 | setImmediate | 8 MiB | setTimeout(0) | cancelled | 否 | 1.06 |
| Node 24.18.0 | setImmediate | 8 MiB | setTimeout(0) | cancelled | 否 | 1.38 |

该 probe 直接观察 measurement / Worker startup；并未运行完整 Check，不能由此声称 immediate 已
验证全部 Records、waiver audit、混合 selection 或真实 Worker in-flight 的结果等价。

## 调查子代理新增验证，2026-10-08

形成时 HEAD `d266937d0c3e76dfeeee87f7b0901316e162dea3`；相关源码没有本轮改动。
`mise exec -- bun --version` 为 `1.3.14`，`mise exec -- node --version` 为 `v24.18.0`。
本段是对未修改默认实现的源树验证，不是 immediate 默认或性能重测。

```text
mise exec -- bun test src/package-checks/function-metrics/measurement.resource.test.ts src/package-checks/function-metrics/measurement.encoding.test.ts src/package-checks/function-metrics/analyzer-worker.test.ts src/package-checks/function-metrics/constructor.test.ts
12 pass / 0 fail; 12 tests across 4 files.

mise exec -- bun run test-evidence -- check --root .
671 current test entities (671 Bun); 671 mapped by 161 semantic Cases across 15 topics.
```

同四文件的额外 Node 源树 probe：

```text
mise exec -- node --test src/package-checks/function-metrics/measurement.resource.test.ts src/package-checks/function-metrics/measurement.encoding.test.ts src/package-checks/function-metrics/analyzer-worker.test.ts src/package-checks/function-metrics/constructor.test.ts
tests 12; pass 11; fail 1; cancelled 0; skipped 0; todo 0; exit 1.

Failing test:
constructor.test.ts:85:3
functionMetrics analyzer execution > runs from the Product-owned analyzer without an external scanner
AssertionError [ERR_ASSERTION] at constructor.test.ts:100:14
actual data: [Object: null prototype] { blockingFindingCount: 0, findingCount: 0 }
expected data: { blockingFindingCount: 0, findingCount: 0 }
actual and expected status: passed
```

这是完整失败信息的必要节选；省略正常进度打印、duration 和 runner stack 其余 frame。
Node 的其余 11 项实际通过：source Worker transport、constructor defaults、in-flight cancellation、
Check over-limit、decode、per-file/aggregate resource、missing source、post failure、reply failures、
default timer admission cancellation。项目正式 Case/runner profile 为 Bun；不要把这项额外 Node
断言差异推成 setImmediate regression 或完整 package 兼容性判断，也不要隐去它后称 Node 四文件通过。

测试 fixture 由原测试的 finally 清理；调查子代理没有保留额外 fixture、脚本或 profile。
