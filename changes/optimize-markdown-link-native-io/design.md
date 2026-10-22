# Design

首版在 Check 私有边界内改变执行粒度与纯计算复用，保持原生安全观察和结果责任。

## Context

依据为[已提交调查](../../docs/investigations/profile-markdown-link-consumer-workload.md)，不是外部使用者现场数据。
调查已证明执行后端/任务粒度与纯 prefix memo 的收益，并观察到自适应缓冲在 Node 上明显改善 CPU/次缺页；历史 Bun 慢尾原因仍未知。
Plan 的 Git 基线见 metadata；产品收益以实施时冻结的源码、产物与同窗口负载重新取得。

实施起点（`3693317e`）的入口与约束：

- `resolver-engine.ts` 持有图、批次计费和 cache；`execution.ts` 在 `finally` 调用 resolver finalize，随后才发布普通链接 Records。
- `filesystem-probes.ts` 为 async 路径；Markdown lint 也直接使用它，不能全局替换成同步或自动创建 Worker。
- `filesystem-collection.ts#createSubtreePruner` 重复计算多个路径共有祖先的纯排除结果，已存在的目录/entry 复用继续保留。
- package 显式编译 index 与 function-metrics Worker 两个 root；URL normalization、runtime audit 和 repository-layout 检查均有对应约束。
- 遵守[按需收集](../../docs/decisions/retain-on-demand-project-file-collection.md)、[Node 可读 ESM 交付](../../docs/decisions/publish-node-readable-esm-package-layout.md)及[规模收益权衡](../../docs/decisions/weigh-performance-costs-against-scaling-benefits.md)，不增加 Run-wide 输入机制或每规模必快的要求。

## Goals / Non-Goals

目标为原生 Node mdlink 的深路径收益、有界工作缓冲、可响应取消及可审计生命周期；Node 宿主须允许创建 Worker，Bun 保留仓库对照。
首版保持串行 I/O、probe/read 授权边界与公共 API；任务融合、通用 Worker 池、持久 filesystem 缓存及 parse/cache 格式重写不在范围内。

## Decisions

### Intended Change

#### 私有 I/O 会话

`LinkLocalResolver` 独占会话，并显式传给 source-reader/target-observation。会话绑定 canonical root 和当前 signal，只在首次必要 job 时启动一个 `node:worker_threads` Worker，最多一个在途 job。
根 canonicalization、目录单 entry 读取、解析/摘要、图授权、逻辑计费和结算仍归原 owner。未注入会话的共用函数继续使用 async 后端，mdlink 会话失败不切换后端。

job 仅包含 containment probe、endpoint probe 与 bounded regular-file read。父线程 await 每个完整 job；Worker 内以同步 native 调用驱动逐段检查或整文件读链，不逐组件往返、不在同步循环中 await。
抽取路径游标、symlink 目的地组合、越界与 endpoint 分类等纯判断供两种驱动共用，避免两套安全 policy；保留逐组件 lstat/readlink、40 hops、no-follow、fstat 与真实 EOF。

私有协议校验 job kind、单调 request ID、路径、bytes 上限与响应 union；返回 bytes 长度有界，错误只携带私有分类，由父线程映射既有 source/target unavailable。
Worker 创建、发送、协议、error/意外 exit 均关闭会话并结算 pending；不重试有副作用的观察、不静默切回另一后端。

#### 取消与收束

父线程 abort listener 写共享原子取消标记；同步 job 在 native 操作前后检查该标记。普通 abort 消息只能在 job 结束后处理，不作为中途取消机制。
观察到取消后停止新工作，已打开 descriptor 仍走 `finally close`；已进入的 native syscall 等待返回，不承诺抢占或固定取消延迟。保留阶段、每节点及每 256 边的真实事件循环 checkpoint。

会话 finalize 幂等：禁止新请求 → drain 当前 job/必要 close → 关闭并 await Worker exit → 移除 listeners。cache finalize 保持 best-effort publication 规则，两类收束通过 `try/finally` 保证彼此不会被跳过。
source/target 工作 job 失败按原调用阶段映射。execution 在全部收束后、普通 Records/final data 发布前按以下优先序结算：

1. 最终 checkpoint 已取消：沿用 `cancelled` 语义。
2. traversal 已 unavailable：保留原 reason，清理故障不覆盖首错。
3. 没有既有 unavailable，但 Worker 关闭协议失败：`target-unavailable`，抑制普通 Records/final data，即使 traversal 原本因 Finding 而 failed。
4. 其它情况：发布完整 traversal 结算。cache publication 失败始终只退化未来复用。

正常取消等待读 job 的 `finally close`，不使用 terminate 强杀。突发 Worker 退出要求可观察退出、pending 恰一次结算和无部分普通发布；不将其宣称为已完成用户态 close。

#### 自适应 bounded read

初始容量为 `max(1,min(maxBytes+1,fstat.size+1))`；填满后倍增至 `maxBytes+1`，累计实际返回超限即 too-large。
fstat 非 regular 或 size 已超限仍按现行规则提前拒绝，不分配正文缓冲、不开始 read；合法 size 才是分配提示，而不是 EOF。
支持空文件、短读、fstat 后增长/缩小及 read 间增长。保留最终精确 bytes 副本，首版不另引入零拷贝传输。async/sync 驱动共用容量规则，错误与 best-effort close 语义维持。

#### 本次收集的纯 memo

`createSubtreePruner` 为每个固定 policy 持有 prefix→boolean Map，并复用同完整路径的纯 no-demand 结果。
先按原顺序编译 matcher，再按既有 policy/祖先顺序短路；缓存只保存纯布尔值，退出单次 collection 后释放。不同 policy、root、调用之间不复用。
filesystem 获取、路径身份、必要失败、最终原生列表匹配和排序去重照旧。复杂度改善仅针对 matcher；新增内存随本次不同 policy/prefix 数增长，祖先遍历和字符串成本另计。

### Resulting Impacts

| 边界 | 必需处理与验证 |
| --- | --- |
| 授权、计费与发布 | contained/external 分域、source facts 共享、目标首次观察固定；probe 在必要授权位置，read/目录 work 仍在整批计费后；保持首错、Records/位置及 cache bytes 校验 |
| 生命周期 | 空输入、提前取消不启动 Worker；双 resolver 取消互不影响；construction/post/非法响应/error/exit/重复消息及 finalize 重入均有直接证据 |
| 共用读链与收集 | Markdown lint 无会话调用保持 async；收集全部消费者覆盖混合 policy、默认排除、重包含、路径身份、symlink、消失/不可读与观察顺序 |
| 产物 | 增加显式 mdlink Worker compiler root；normalization 仅处理两个已知 owner 的 Worker URL，逐项检查唯一引用和包内目标；fingerprint/runtime inventory 同步，根 export 不扩张 |
| 仓库门禁 | 更新 `scripts/validation/repository-layout.ts` 的双 root 假设、相邻 test/support 与 `AUX-REPOSITORY-LAYOUT-001`；保留对多余 Product entry 的拒绝 |
| Node consumer | exact installed candidate 验证 mdlink 实际 Worker 加载、成功/取消/退出、打包字节与原 function-metrics Worker；源码/Bun 成功不能替代 |
| 文档与 Case | 同步 Markdown Link、Project files、package artifact owner；复核公开 I/O/取消说明和 JSDoc，新增直接行为测试按现有 owner 映射，不复制调查测试或引入新公共诊断 |

## Risks / Trade-offs

- Worker 引入启动、clone、线程和包材料成本；每 invocation 惰性单 Worker、串行单 job 控制资源。少文件/浅层与并存 resolver 需记录代价，不按深路径结果外推。
- Worker 同步 I/O 的在途取消仍受宿主限制；不复用 function-metrics 的 terminate-on-abort，也不扩大 hostile concurrent replacement 的安全承诺。
- 实验 close error 在真实 close 后注入、fault 在 open 前触发。生产验证需区分可捕获故障与突发退出，不能把旧证据扩大成任意故障零泄漏保证。
- 共享 owner 写入和 candidate build 使用串行窗口。原生 baseline 保全前可做只读、语料和脚本准备；保全后，无重叠实现可推进，仅命中共享范围的步骤等待隔离。提交按 hunk 隔离，性能采样另用独占窗口，规则见 [Change 协调](../../docs/governance/change-coordination.md)。

## Open Questions

无。

## Performance Acceptance

1. 在串行 candidate 窗口用 `mise exec -- bun run package:build` → `mise exec -- bun run package:status` 取得原生 baseline；将 exact tarball、源码/工具链摘要复制到本任务独占目录，再重建候选，避免 `build/package`、`build/artifacts` 被清理后丢失对照。运行时通过 mise 锁定，installed consumer 沿用 `VIBE_CHECK_NODE_CMD`。before/after 各自使用真实安装产物与同一份语料；安装、import 和一次 parse-cache 预热在区间外，Worker 创建/clone/退出均在公开单 Check Run 区间内。
2. Node 深度 10/30/60 各至少 8 对 before/after，平衡先后并轮转深度；Bun 同量级对照单列。补单/少文档及浅路径，保留全部样本，报告配对中位数、组中位数、范围/MAD、CPU、缓冲申请与采样 RSS。
3. 分阶段验证 memo、缓冲和 Worker，保留可解释各项成本的中间对照；plain 与成本/CPU 插桩分开，nested clocks 和请求差值不作 CPU 分解。另做少量并存 resolver 语义/收束 smoke，而非扩展为调度专项。
4. Node 深度 30/60 的正配对中位数与多数更快样本是本 Change 的采用证据；小规模有限回退按绝对成本和规模价值审查。未得到该证据则修订方案，不直接套用旧原型比例；不新增机器秒数硬 Gate。
5. 语料沿用调查的[生成规则与计数口径](../../docs/investigations/_resources/261021-profile-markdown-link-consumer-workload/measurement-method.md)：1824 源、3,320,000 bytes、1193 引用、296 目标/136 重叠和 32 个纯 Markdown 标题读取；默认不查目录非空、非 Markdown 不读正文、HTTP 零网络。无 symlink、等深正常语料的 containment lstat 为 `1984×深度`，正文 open/fstat/close 各 1856 次、read 3712 次、返回 3,320,800 bytes；工作 job 3840，控制消息另计。自适应工作缓冲累计申请 3,322,656 bytes、零扩容。额外标题密集与 near-limit/growing 文档用于退化验证。
6. 长 raw、bundle、CPU profile 留独占临时目录并核对后清理；交接只保留简要方法、计时必要列、关键计数和反例，短证据可原样保留。调查引用已有形成时结果，本次新数据明确另标来源和窗口。

## Implementation Observations

三项优化及真实安装包接线已实现；协议校验按 envelope/job/payload 职责组织，纯 memo 的独立测试归 `subtree-pruning.test.ts`，质量门禁保持原策略。
安装后文档验收发现 Node string-input 参数继承到 URL Worker 的故障，已补定点处理与真实 Node preload/V8 回归；没有该参数时维持默认继承。

原生 baseline 来源为 `3693317e`，最终采用证据对应 `0.0.0-local.5e80d3c05c27`；两份 exact tarball、源码摘要、152 个新窗口样本及必要计数见[稳定 owner 的性能采用证据](../../docs/development/markdown-link-resolution.md#性能采用证据)。
Node 深度 30/60 满足采用标准；接受单/少文档约 23–24 ms 的常数代价，不据两次 stage 控制宣称纯 memo 独立提速。

最终完整 Gate 为 43/43 passed，且总耗时、均值与 P95 预算均通过；Test Evidence 闭合 775 个实体、191 个 Case。
独立正确性审阅、ai-ready 文档优化与编码规范优化已完成；独占实验目录已清理，正式资源仅保留 22,027 bytes 的方法与计时列。
