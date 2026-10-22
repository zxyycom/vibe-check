# 读取链与收集取消的隔离安全证据

本附件承接读取/收集实验的安全方法、注入边界和复跑步骤；结论由主报告承接。
`io-experiment-safety.ts` 通过 Bun 虚拟入口替换执行，作为调查证据保存。Product 契约、注册测试和 current Case 继续由原 owner 维护。

## 矩阵和输入

六个变体均沿用路径实验的 worker-sync containment probe：`fast`、`reader-direct`、`reader-worker`、`collection-local`、`collection-prefix`、`combined`。
2026-10-22 在 Bun/Node × 深度 10/30/60 各执行一次，共 36 组。深度指相对 canonical root 的组件数，含叶名；深源读链、source probe 取消及响应性替身使用该深度，24 项路径共同场景保留原小 fixture。

直接调用实验 `readRegularFile` 时显式创建并传入 signal/session，`finally` 等待 session close；无 session 的其他消费者保留异步读分支。

## 注入协议

安全模式在真实操作前后调用同步 hook；worker 通过同步屏障运行同一父侧 hook。plain timing 没有逐操作观察屏障。

| hook | 信息或动作 | 证明边界 |
| --- | --- | --- |
| `__batchObserve` | `before/after`、`op`、`path`；open 带 flags；fstat 后带 file/size；read 带 requested/returned；close 后带 `closed: true` | 顺序、取消边界、成功打开/关闭的句柄配对。 |
| before read 返回 `{ readLimit: 3 }` | native read 的提交容量钳制到 3，before requested 是原意图容量，after requested 是实际提交容量，returned 是真实返回字节 | 确定性的真实短读；不能只用任意修改返回值伪造 EOF。 |
| hook 抛带 EACCES/EIO 的错误 | 在所选操作阶段注入失败 | 读失败收束、关闭及无 partial output。 |
| after fstat 追加文件 | stat 观察后实际增长文件 | 保留原 max+1 字节上限，不依赖静态文件大小。 |
| after close 抛错 | native close 已完成才抛错 | 既有 best-effort close 吞错语义不改写成功或 too-large 结果；不模拟 OS 无法关闭句柄。 |
| `__collectionObserve` | 真实 lstat/readdir 前后同步观察 | collection 的有序宿主操作与其完成后的 owner 取消边界。 |
| `__batchOptions.fault` | true 在首 worker job、`read` 在 read job 进入 native open 前退出 23 | 异常 worker 退出不会发布 partial outcome，session 等待退出；不等价于 native read 进行中被强杀。 |

open 的 after hook 位于外层算法已取得句柄之后，因此该 hook 失败或取消仍能进入原 `finally close`。close 不能被取消检查跳过；其 after 事件只在 native close 已经完成后产生。成功 open/close 观察计数用于句柄配对，不能将 before open 事件一律当作成功 native open。

## 场景与可观察断言

- **24 项路径共同场景：** contained/missing/unavailable、目录和 root、内部与越界 symlink、40-hop 边界、loop、权限失败、external 三种 policy、节点固定观察和新节点重查、final-leaf no-follow、增长 max+1、empty/exact/over-limit。结果直接对照路径实验归档的 worker-sync 证据。
- **14 项共同读链场景：** 短读持续至真实 EOF、fstat 非 regular/oversize 禁止 read、open/fstat/read 错误、close 错误不改写既有成功/拒绝，以及 source/target × open/fstat/read 错误均结算 unavailable 且不发布普通 Records/final data。
- **worker 故障：** 全部六版验证 probe job 异常退出；reader-worker/combined 另验证 read job 异常退出。因此 `readChainCases` 数量分别是 15 和 16，跨变体等价比较须剔除故障项后比较共同 14 项，不可直接把数组长度差异当成行为漂移。
- **5 项路径/边阶段取消：** source probe、target probe、symlink，以及 8000 条边由真实 timer 与真实文件 I/O 回调触发的取消。边阶段结果必须 unavailable，验证 checkpoint 真正交还宿主事件循环；在途 native syscall 仍须完成。
- **12 项读链取消：** 已取消、before open、after open、after fstat、before read、after read 六个直接读入口；source/target × after open/fstat/read 六个 Check 入口。三种读链候选在观察取消后不开始新的 lstat/readlink/open/fstat/read，但仍恰一次 close 已打开的句柄。fast 与两个 collection 变体保留原异步节点级取消，可完成当前读；Check 层六版都必须 cancelled、无普通 Records/final data。
- **2 项 collection 取消：** 在第一次成功 lstat 或 readdir 后同步 abort。collection 本身没有 AbortSignal 契约，允许当前同步收集完成；随后 Check 必须 cancelled，mdlink containment/body 操作数为零，也不发布普通 Records/final data。归档保留有序 collectionTrace 与 abort 后继续的 collection 操作数。

每组最后均检查已成功观察到的句柄余额为零、worker started/exited 数相等。确定性场景由操作 hook 触发，不使用 sleep 或毫秒阈值决定成败。

## 响应性机制演示的边界

另有 probe/read 各 0/100 ms 的受控 host-operation 替身；读替身用 `slowOp: "read"` 定位到读链。它们关闭逐操作观察屏障，以 timer 记录何时收到取消及方法何时返回，不设 elapsed-time 成败阈值。

100 ms 是受控阻塞替身，不是真实慢盘测量，不证明任何宿主、磁盘或文件系统的最大取消延迟。reader-direct 的同步操作会占用主线程；worker 可以让主线程先接收取消，但当前 native 同步操作仍不可被协作取消抢占。最终结果与资源关闭仍须等该操作结束及 finally 收束。

## 归档证据与复跑

`io-experiment-safety.json` 保存 36 组场景和 12 组相邻回归的结果、可还原有序轨迹、成功输出哈希与回归通过数，包含 collection 取消两项。
driver 比较同 runtime / 深度下的共同结果、读链轨迹与 collection 取消；只读 summary 将 24 项路径结果与 `probe-batch-safety.json` 的 worker-sync 证据对照。
读链增强取消与额外 worker 故障按各自断言核对，独立于共同数组的等价比较。

归档由 `retain-io-evidence.ts` 去重：事件按声明字段编码，path、完整 trace 与场景数组各只存一份；`unpackSafety` 可恢复测量 DTO。
归一化一次性 sandbox 路径后，36 个测量 DTO 均通过逐项 deep equality 还原验证，覆盖结果、操作顺序、字节数及取消观察。
重复成功 stdout 和回归成功日志仅留哈希/通过数；25.8 MB 临时原件核对后已清理，归档为 233,038 bytes。
归档脚本设 512 KiB 上限，超限时先收敛重复内容，保持仓库单文件验证限制。

按当前源码/依赖在新独占目录复跑；以下命令包含安全、性能和 profile 三种模式：

```sh
res=docs/investigations/_resources/261021-profile-markdown-link-consumer-workload
cache=.cache/vibe-check/performance-investigation
mkdir -p "$cache"
out=$(mktemp -d "$cache/new-mdlink-io-XXXXXX")
mise exec -- bun run "$res/build-io-experiment.ts" "$out"
mise exec -- bun run "$res/measure-io-experiment.ts" "$out" safety
mise exec -- bun run "$res/measure-io-experiment.ts" "$out" performance
mise exec -- bun run "$res/measure-io-experiment.ts" "$out" profiles
mise exec -- bun run "$res/retain-io-evidence.ts" "$out" "$out/safety-retained.json"
```

采样前后核对输入、方法及 bundle identities；选择必要证据并验证还原后，再清理该独占目录内的预检、bundle 和 fixture。
调查方法及归档证据留存，历史样本保持原样；临时输出不直接复制或分片入库。
