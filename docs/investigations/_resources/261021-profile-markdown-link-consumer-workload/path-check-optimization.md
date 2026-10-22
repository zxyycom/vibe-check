# 原生 mdlink 路径检查：优化候选与验证设计

分析核对于 2026-10-21（Asia/Shanghai），承接本报告的深度实验。以下是待实验候选，尚未实现或测得提速。
推荐先比较同一串行组件检查的执行成本，保持当前授权与观察模型；有充分收益证据后再决定实施。

## 证据与责任边界

深度 26 的 profile 中，原生 execute 为 7.362 秒，path probe 为 5.674 秒，内部组件 status 为 5.336 秒。
后者包含 filesystem API 的等待、runtime 调度和包装成本，现有 profile 尚不能拆出各自占比。
probe 外层与 status 的时间差约 0.338 秒，提示仅整理外层对象与循环的收益空间有限；这不是无插桩的收益上限。
同一样本中，source traversal 和 resolver 两类事件循环 checkpoint 合计约 13.6 ms，远小于 probe 成本；
保留这些显式让步是合理的取消代价，不应为本轮提速而删除或换成 microtask。

优化入口是 Product 私有的
[`filesystem-probes.ts`](../../../../src/package-checks/markdown-link-validation/filesystem-probes.ts)。
source reader 与 target observation 消费其结果，resolver 保持节点身份、顺序、逻辑计费和结算职责。
Markdown lint 的 execution 也直接消费同一 probe；共享循环/API 改动需要覆盖该消费者的路径安全与取消回归。
候选 C 若只在 mdlink invocation 接入，须保持该消费者原有入口与结果语义。
当前 segment cursor 已复用数组，同节点去重与 source/target facts 共享也已存在；本次候选继续在这些基础上工作。

依据为[公开指南](../../../checks/markdown-link-validation.md)、
[内部不变量](../../../development/markdown-link-resolution.md)及
[引用图决策](../../../decisions/observe-markdown-reference-graph.md)。
这些材料拥有当前契约；本文仅提供候选分析。

## 保持不变的语义

1. **逐段授权。** canonical root 固定；每个路径组件先 `lstat`，遇 symlink 才 `readlink`。
   link destination 先检查 root 包含关系，再决定是否观察后续 referent；保留 40-hop 上限、root 重置与剩余后缀。
   root-external `ignore/report/validate` 的分类、授权时点与无权限时的 root 外零 I/O 保持不变。
2. **观察边界。** 不同逻辑路径和授权域各自观察；同节点首次完整成功或缺失结果固定。
   相同前缀不是共享 filesystem 状态的授权；后一个新节点要能看见前缀目录已被替换为越界 symlink。
3. **读取与结算。** 保留 no-follow final-leaf open、打开后文件类型确认、字节上限和当前 bytes 核对。
   source 顺序、目标首次引用顺序、预算先于额外正文/目录读取、首错与普通 Records 完整发布保持不变。
4. **协作取消。** 保留阶段、每 source/target 节点和每 256 边的真实 `setImmediate` 让步与前后取消检查。
   保留既有取消点与其错误优先级；组件级停止后续工作是候选增强，须验证最终取消结果仍由当前 owner 统一映射。
   [`lstat` 的参数](https://nodejs.org/download/release/v24.18.0/docs/api/fs.html#fspromiseslstatpath-options)不包含 `AbortSignal`；发出 abort 不代表在途 syscall 已停止，终态须收束在途工作。

安全保证仍基于操作期间实际观察的状态；probe 完成后的 hostile concurrent replacement 继续属于既有非保证范围。
这不等同于允许把不同节点开始前已经变化的目录状态当作旧快照使用。

## 候选顺序

### A．单路径局部状态与较薄的异步循环

以单路径私有局部变量推进 cursor，减少每个普通组件的中间 state/result 对象、`Object.freeze` 及多层 async 返回。
只冻结跨函数返回的最终结果；保留每组件一次 awaited `lstat`、原 symlink 分支及错误映射。
普通段的路径累计可单独评估，但应先证明 root、Windows 分隔符和 symlink 重置下与现有 `path.join` 等价。
可复用纯词法的分段或前缀字符串；这类派生数据不承载目录存在、类型或授权状态。

这是最小的首个候选：不缓存 filesystem 状态，不改变 API 调用量，也不改变节点 I/O 串行关系。
收益预期属于常数成本，需用 CPU/分配采样和无插桩对照确认，不能把整个 probe 时间归因于临时对象。

### B．一个路径 Promise，内部异步 callback 状态机

比较 `fs.lstat` / `fs.readlink` 的 callback 形式：外层只建立一次路径完成 Promise，
每个 callback 消费当前组件结果后才提交下一个组件，保留同样的 filesystem 操作顺序。
重点是避免组件之间反复建立 Promise/async 包装，而不是给 callback 再逐次套 Promise。

[Node 24.18 FS 文档](https://nodejs.org/download/release/v24.18.0/docs/api/fs.html#callback-example)
将 callback API 列为追求最高执行/分配性能时的选择依据；这支持做实验，不证明 Bun 1.3.14 的实际收益。
实现复杂度高于 A：须统一错误入口、防止重复完成，并验证取消后 callback 只收束当前工作，不再提交下一组件。
当前 probe 本身没有 signal 参数；需要由 source reader 与 resolver/target observation 沿私有调用链传入，
并处理 listener 释放及原消费者兼容，不增加公开 option 或通用 resolver。
probe 内的局部提前退出应交回现有 source/target owner 映射取消，不将它解释成 missing finding。
既有显式事件循环让步仍由原阶段 owner 保留；callback 或已完成 Promise 不充当其替代品。

### C．条件备选：单个私有 worker 串行执行同步 probe

仅在 A/B 收益不足，且隔离实验显示逐次异步往返占比足够高时继续评估。
每 invocation 复用一个 worker，一次只发送当前路径；worker 内仍逐组件 `lstatSync/readlinkSync`，
返回最小 probe 结果。正文读取、图、预算与发布继续在原 owner，保持节点 I/O 串行。

主线程把取消写入共享标志，worker 在每次 filesystem 操作前后检查，避免同步循环收不到消息式取消。
取消后停止派发，等待当前工作收束并关闭 worker；不遗留后台任务，也不承诺抢占已阻塞的 syscall。
测量须计入 worker 启动、消息往返、RSS、错误退出与退出等待，并验证包内 worker 入口及 Node/Bun 支持。

[Node worker 文档](https://nodejs.org/download/release/v24.18.0/docs/api/worker_threads.html)
说明 worker 可共享内存，同时提醒普通 I/O 通常不因 worker 获益。
因此 C 不是“开线程就更快”的建议，只是隔离同步调用与主线程响应性的较高成本候选。

## 需要另行取舍的路径

| 路径 | 为什么不作为当前语义下的首选 |
| --- | --- |
| 跨节点缓存前缀 `lstat`、TTL 或 invocation-wide 目录快照 | 新节点可能错过已发生的目录替换；缓存 missing 也会改变其它节点的观察。缩短 TTL 不能证明状态未变化。 |
| 直接 `realpath` 后检查最终路径 | 可能先穿过 root 外再返回 root 内，已经触碰未授权 referent；最终包含关系不能替代逐 hop 授权。 |
| 提前并发同路径的全部组件 | 父组件授权完成前就会观察后代；遇越界 symlink 时可能已经产生 root 外 I/O。 |
| 并发多个节点或预取目标 | 改变首次观察时点、首错顺序和取消后的额外工作，与当前串行契约冲突。 |
| 主线程整批 `lstatSync`，每若干项才让步 | 单次慢 filesystem 调用仍会阻塞 timer/I/O；批次计数或时间预算不提供单次调用耗时上限。 |

同步 API 的阻塞行为见
[Node 同步 FS 文档](https://nodejs.org/download/release/v24.18.0/docs/api/fs.html#synchronous-example)。
用操作系统级句柄相对遍历建立另一种安全证明，或采用目录快照/并发观察，都应先明确新契约及平台代价，另行决策。

## 验证设计

### 1．先验证行为与实际访问序列

用相同 fixture 对照当前 probe 与候选，检查结果、顺序化的 `lstat/readlink/open` 轨迹及全部 Check 输出。
对取消分支允许候选安全地少做后续操作，但不得增加未授权访问或形成部分普通结果。

- 普通深路径、缺失中间段、普通文件被当作目录、叶类型、权限错误；覆盖 root 自身及 host-native 路径边界。
- root 内 symlink、root reset、40/41 hops、loop、越界后再回 root；后者在第一次越界即停止未授权探测。
- 在节点 A 完成后、不同节点 B 开始前，确定性地把共享前缀替换为 root 外 symlink；B 必须重新识别。
  同时保留同节点固定观察、不同别名与授权域独立、下次 invocation 重新观察的原行为。
- final leaf 被替换、超限文件及读取期间增长，确认 no-follow、打开后类型检查和实际 byte bound 仍有效。
- 多故障、预算耗尽、目录单 entry 和非 Markdown 无正文需求，核对首错、逻辑计数和实际额外 I/O。

已有行为入口为 `local-resolver.test.ts`、`local-resolver.endpoints.test.ts` 和 `graph-behavior.test.ts`。
它们提供相邻回归基础；上面的访问轨迹、前缀替换等证明需要在候选实验中专门核对，本文不声称已有完整覆盖。
新增测试时按现有 Case owner 关联，证明需求由当前契约决定。

### 2．取消单独验收

由 timer 和真实 I/O 分别触发 abort，覆盖组件等待、symlink hop、节点间 checkpoint 与末次发布前边界。
同时记录 abort 请求、回调实际执行、Check 结束的时点，以及之后新发出的操作数，区分事件循环饥饿与取消传播成本。
验证普通 Records/final data 完整性、缓存 publication 的原有收束规则；C 另验证 worker 退出、无残留任务和资源回收。
用受控操作屏障构造时序，不只依赖固定毫秒 sleep；时间统计作为 observation，语义断言作为验收条件。

### 3．最后测量净收益

1. A、B、C 分别对照基线，一次只改变一个因素；固定源码/依赖、runtime、filesystem、选择与所有 limits。
2. 复用深度 4/22/26 的 1824-source 语料，各至少 5 对独立进程、AB/BA 轮转；冷启动的小规模场景单列。
   每进程保留相同缓存预热，正常耗时用无插桩单 Check Run；按 runtime 分组，不混合旧采样窗口。
3. 分别记录端到端、probe、source/target 阶段、CPU、分配/RSS，以及 metadata API 数和访问轨迹。
   本轮普通路径的预期组件 `lstat` 量仍是 `1984 × 深度`；源/目标正文读仍是 1856 次，logical direct 仍为 777。
4. 补稀疏分支、长目录名、symlink 密集、缺失路径、cache miss、I/O 竞争及较慢存储，观察性能和取消响应是否退化。
5. Bun 1.3.14 与项目固定 Node 24.18.0 分别取基线。C 还须以实际构建安装产物验证 worker 加载和退出。

采用依据是语义和安全证据完整、目标负载有可重复净收益、小规模与取消代价可解释。
本报告没有设定新的硬耗时门槛；方案实际收益、CPU/I/O 构成及更强平台级安全方案仍待实验。

## 已有深度实验的重跑命令

使用新的自有输出目录；生成语料和临时 bundle 由调用者管理，重跑不会改写历史附件：

```sh
out=.cache/vibe-check/performance-investigation/new-depth-run
res=docs/investigations/_resources/261021-profile-markdown-link-consumer-workload
mise exec -- bun run "$res/profile-links.ts" "$out"
mise exec -- bun run "$res/measure-path-depth.ts" "$out" explore 10,16,22 1
mise exec -- bun run "$res/measure-path-depth.ts" "$out" confirm 4,10,16,22,26 5
mise exec -- bun run "$res/measure-path-depth.ts" "$out" profile 4,22,26 1
mise exec -- bun run "$res/summarize-path-depth.ts" "$out"
```
