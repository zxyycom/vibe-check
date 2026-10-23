# Markdown Link 解析与目标授权

本文拥有 `src/package-checks/markdown-link-validation/**` 中引用图、source parse facts、direct-target 授权与 parse-facts cache 的内部不变量。修改执行阶段、resolver、parser adapter 或 storage lifecycle 时使用；公开配置、occurrence 和安全承诺由[Markdown Link Check 指南](../checks/markdown-link-validation.md)定义。共享 source 收集和 exact membership 见[Project files](project-files.md)。

## Markdown Link source occurrences

Link Check 先将 project root canonicalize 一次。失败即为 `unavailable`；只有 root 已 canonicalize 且没有 eligible
Markdown source 时才是 `not-applicable`。每个 eligible source 只 decode 和 parse 一次，得到 Link-private facts。
受支持的 occurrence 是 inline link/image、在 use site 已定义的 full/collapsed/shortcut reference、explicit autolink
和选定的 GFM autolink literal。YAML front matter、code/fenced code、HTML attribute、prose URL 和 undefined reference
不创建 occurrence。

这些 facts 是 immutable 的 Link-private adapter output。decode 或 parser 失败使 Check 结算为 `unavailable`，而不是发布
partial occurrence set。anchor lookup 时，每份文档以 ATX 和 Setext heading 创建新的 GitHub-priority slugger。source
navigation range 使用 decode 后 JavaScript UTF-16 position，line/column 为 one-based、end-exclusive；parser offset 和
dependency AST 保持 private。

resolver 仅在启用的 anchor lookup 首次需要某份 immutable facts 时构建 heading slug Set，并在本次 invocation 内按 facts 身份复用。
Set 直接索引 parser 已生成的 slug，保留 GitHub slugger 的重复 heading 规则。该索引不进入持久 parse-facts payload，
也不缓存 target 授权、Finding 或结算结果。

这些 immutable facts 可由本 Check 的[parse-facts cache](#markdown-link-parse-facts-cache)复用；
cache 的恢复、当前 bytes 校验与 terminal publication 仍由同一 Link-private owner 承接。

## 单次引用图与观察

`resolver-engine.ts` 拥有一次 invocation 的图会话、逻辑计费与观察调度；`reference-graph.ts` 承接节点身份、目的地分类和逐边判断，
`target-observation.ts` 承接授权与按需 I/O。这个私有有向多重图不进入 Core、公共模型或持久图。
节点身份绑定 canonical root 基准的归一化逻辑绝对路径与 contained / explicit-external 授权域；
不以 realpath、存在性或 inode 合并别名。节点可同时拥有 source facts 和 target observation，重复边与循环保留。

`source-traversal.ts` 先串行读取全部 sources 并登记 occurrence 与位置；正文与 AST 随解析释放，不全量保留。
resolver 再独立分类每条目的地，聚合节点存在性、类型、标题及目录单 entry 需求；远程及 external ignore/report
不创建目标 I/O。目标按首次引用顺序观察，最后按原 source / occurrence 顺序结算每条边。
`execution.ts` 在完整结算后发布普通 Records。
同域已加载源 facts 直接提供文件/标题观察，不重读也不重复 containment；target-only facts 不扩展 source 集合。

完整成功或缺失的首次观察固定；后续创建、替换及目录变化留待下次 invocation。不同逻辑别名和授权域仍独立观察。
失败立即 unavailable，不发布部分普通 Records 或 final data。每边独立 Finding / 位置和 logical targetReadCount 不因复用改变；
必要授权分类后、额外正文/目录 I/O 前，节点全部计费边整批预检预算，source facts 命中也计费。
两项总量预算 `number | false` 及阶段化首错的完整用户契约见[公开指南](../checks/markdown-link-validation.md#工作原理)。

阶段边界、每 source / target 节点及每 256 边由私有 `setImmediate` Promise 交还真实事件循环，前后检查取消；
不能以 `Promise.resolve` 代替。节点 I/O 串行，单次同步 parse 不可抢占，正常 Records 完整发布区间不让步。

## Markdown Link direct targets

Markdown Link Check 只能对 source occurrence 的 direct local target 做 bounded work。lexically 位于 project root 内的
target 即使不属于该 Check 的 source selection 也可被检查，但绝不成为 source input。启用 cross-document fragment 后，
只有可读取的 regular Markdown target 才提供 heading facts；directory 永不接受 anchor lookup。配置 directory
non-empty checking 后，最多读取一个 entry，绝不递归枚举。

relative lexical escape、host-native absolute path 和接受的 raw host-native empty-authority `file:///` local URI，在
target I/O 前进入 Check 的 `rootExternalTargetMode`。`ignore` 不产生 finding，也不做 root 外 work；`report` 产生安全的
`target-outside-project-root` finding，也不做 root 外 work；只有 `validate` 可对该 target 做 bounded direct work。
lexically root-in candidate 只能使用 component containment probe。若某个 symlink hop 越出 root，除 `validate` mode 外，
该 probe 不授权触碰 root 外 referent。

source 与 regular Markdown target 的读取共用[有界容量与真实 EOF 规则](#私有-io-会话与收束)；更换同步或异步驱动不改变此授权边界。

component probe 以 segment cursor 消费当前路径；普通目录推进复用同一 segments 数组，symlink hop 则将
link destination 与尚未消费的后缀重组，并从 root 重置 cursor。每个 component 的状态检查、symlink hop 上限
与越界判定仍逐次在授权边界执行；数组复用不跨不同逻辑节点缓存 filesystem 状态；同节点固定观察由上文图 owner 承接。

containment guarantee 依据操作期间观察到的 host filesystem state 判断。Node path/filesystem API 不提供 portable dirfd/openat
traversal，因此 component probe 成功后的 hostile concurrent replacement 不在本 Check 的 authorization proof 范围内。
regular-file read 仍使用 no-follow final-leaf opening 和 byte bound；需要 hostile-filesystem isolation 的调用方应使用
OS-level sandbox。

HTTP(S)、`mailto:`、protocol-relative URL、UNC path、带 authority 或不受支持的 `file:` form 以及其它不受支持的 target
form 只分类后停止。它们不产生 Product-owned DNS、HTTP、TLS、redirect、subprocess 或 filesystem I/O，也不产生
external reachability verdict。本 Check 没有 target discovery、crawler、shared resolver 或 general file-policy surface。

## 私有 I/O 会话与收束

`io-session.ts` 为每个 resolver 维护一个惰性 `node:worker_threads` Worker，绑定 canonical root 与本次 signal，
最多一个在途 job。source 读取必须使用该会话，职责依次为：

1. `source-reader.ts` 检查 root-relative source path，再提交一个 `source-read` job。
2. `io-worker.ts` 在同一 job 内先完成 component containment probe；只有 `contained` 才对
   `probe.absolutePath` 执行 bounded regular-file read。其它 probe 结果直接返回，不开始正文 I/O。
3. 父线程的 `source-reader.ts` 映射 source 读取结果，再将成功返回的 bytes 交给 parse-facts session 解码、摘要与解析。

target 按需使用独立的 containment、endpoint 与 read job。Worker 用同步 filesystem helpers 驱动这些操作，
containment probe 的全部路径分量观察在 Worker 内完成。root canonicalization、目录单 entry 读取、解析/摘要与上述引用图职责留在父线程。

文件 Worker 默认继承父进程参数；仅当存在 string-input-only 的 `--input-type`（含 `--input_type` 别名、split/等号形式）时，
剔除该选项及其值，其余参数原样保留，以支持 Node eval/stdin 宿主且保留 preload 上下文。
其它 Node flags 组合的 Worker 创建失败按下述 unavailable 边界处理。

`filesystem-policy.ts` 共享纯路径游标、symlink 转移、endpoint 分类与读缓冲规则；同步和异步驱动各自执行 I/O。
`filesystem-probes.ts` 的 async 后端供 Markdown lint 等调用方使用，不创建 Worker。
mdlink 的 Worker 创建、发送、协议、error 或意外 exit 故障使会话失败，不重试观察或回退到 async 后端；
父线程按失败发生的 source/target 阶段映射既有 unavailable reason。

regular-file read 保留 no-follow open、fstat regular-file/字节上限检查和真实 EOF；fstat size 只作为容量提示。
初始容量为 `max(1, min(maxBytes + 1, size + 1))`，读满后有界倍增至 `maxBytes + 1`，实际读到该上限即 too-large。
fstat 已超限或不是 regular file 时不分配正文缓冲、不开始 read；短读、增长与缩小仍按实际读取判断。
最终返回精确 bytes 副本，已打开 descriptor 在可捕获失败与协作取消时仍经 `finally` 尝试 close。

取消由父线程 abort listener 写共享原子标记，Worker 在 native 操作前后检查；已进入的 syscall 等待返回，
不承诺抢占或固定取消延迟。正常取消不 terminate 在途工作。突发 Worker 退出只能证明 pending 结算与退出被观察，
不能宣称用户态 `finally close` 已执行。

幂等 finalize 禁止新 job，drain 当前工作，发送关闭请求并 await Worker exit，最后移除 listeners。
私有请求身份和响应 union 的验证使 pending 恰一次结算；会话失败后不再接收新工作。
resolver 用 `try/finally` 确保 Worker 与 cache 两类 finalize 都执行。`execution.ts` 在普通链接 Records/final data 发布前按以下顺序结算：

1. 最终 checkpoint 取消：保留 `cancelled` 语义。
2. traversal 已 unavailable：保留原 reason，关闭失败不覆盖首错。
3. 其余情况下 Worker 关闭失败：返回 `target-unavailable`，即使原 traversal 已形成 blocking Finding，也不发布普通结果。
4. 否则发布完整 traversal 结果。cache publication 失败始终只影响未来复用。

## Markdown Link parse-facts cache

`src/package-checks/markdown-link-validation/parse-facts-cache/session.ts` 拥有每次 resolver invocation 的恢复、命中与
publication；payload grammar 由同子模块的 `payload.ts` 拥有。调用方配置、收益和存储安全边界见
[Markdown Link Check 指南](../checks/markdown-link-validation.md#parse-facts-cache)。

启用后，session 首次需要 facts 时只读取一次 `<directory>/markdown-link-parse-facts-v1.jsonl`，以同一个 Promise
串行化恢复。完整、有效的 JSONL lines 恢复成 invocation-local Map；malformed、unknown-version 和未以 newline
结束的尾行不进入 Map，同 identity 以最后一条有效 line 为准。missing file 等同空 cache；其它整文件读取或 UTF-8
解码失败同时关闭本次 publication，防止在未知材料后继续追加。

容量提醒消费首次 restore 的 readFile 已读 bytes，触发条件与配置由[公开 cache 契约](../checks/markdown-link-validation.md#parse-facts-cache)拥有。
session 在 read 返回且未取消后、UTF-8 decode 前判断容量并保存冻结 Check warning；所以成功读到超阈值的无效 UTF-8
也可提醒，而 decode failure 仍关闭 publication。首次 read 的 Promise 保证每 invocation 至多一次判断，
容量判断没有独立扫描、stat 或读取路径。

session 只保存 message，由 resolver 交给 execution，再通过 `appendCheckMessages` 随成功或正常 unavailable 返回输出。
该路径与 cache failure 退化、链接 Finding/Record 及 settlement 分离。append 只发布 dirty facts；
未调用 parse 或 disabled branch 不创建 restore I/O。

每次 lookup 前仍按当前授权读取 source/target exact bytes 并验证 UTF-8。identity 绑定 source bytes 的 SHA-256，
payload 验证绑定 parser contract 与版本；命中只复用 Link-private occurrences、headings 和 decoded ranges。
input discovery、图节点授权/观察、Finding/Record 与 settlement 每次 invocation 重新执行；同 invocation 的源事实和节点观察按上文复用。

fresh parse 成功后将 facts 放入 dirty Map；terminal boundary 调用幂等 `finalize`，至多一次 awaited append 发布
完整 dirty block。开始 publication 前和 mkdir 后都检查 cancellation；append 一旦开始就等待完成，不启动后台写入。
观察到旧 partial tail 时先追加 newline 隔离它。publication failure 被包含，只影响未来复用，不改变 Check facts。

此 session 是 best-effort 单次调用状态，不建立跨进程锁、原子事务或持久性保证。并发 append 的损坏或重复 lines
依照相同恢复规则退化为 miss；目录容量与清理由调用方管理。修改 storage 时同步核查相邻 lifecycle 与 payload tests。

## 性能采用证据

以下 2026-10-23 的形成时证据解释当前机制的采用依据，具体身份、方法、全部样本与适用边界留在附件；
它们不是 timing 硬 Gate，也不是跨平台、冷盘或任意规模的性能保证。

- **私有 Worker、自适应缓冲与收集纯 memo**：[真实安装包对照](_resources/markdown-link-native-io/evidence.md)的
  1824 源合成语料中，Node D30/D60 配对 wall 节省中位数为 85.98%/89.14%，各 8/8 更快；Bun 三个深度各 4/4 更快。
  Node 1/8 文档接受约 24.0/22.8 ms 的配对常数代价；收集 memo 只承接纯计算增长改善，独立 wall 控制为 1/2 更快。
- **`source-read` 融合**：[源码副本公开 API 对照](_resources/markdown-link-source-fusion/evidence.md)的
  1824 源语料 D10/D30/D60 中，Node 配对 wall 节省中位数为 28.42%/23.93%/15.31%，Bun 为 31.09%/23.01%/15.75%，各 6/6 更快。
  独立三源诊断的工作 job 从 8 降至 5，路径观察和正文 I/O 计数不变；真实安装包 smoke 验证功能与收束，不提供安装包计时收益。

## 验证

修改 parser/probe/cache 或 I/O 会话时运行相邻单元与 Check integration tests，分别核对 immutable occurrence/range、两种驱动的 no-follow/containment/真实 EOF、当前 bytes 校验、恢复/终态写入、取消与 drain/exit。Worker 的实际包内加载还须通过[installed consumer 验收](../tooling/package-artifact.md#pack-前后验收)。cache 命中不能跳过授权或改变 Findings/settlement；共享收集测试不能代替这些 resolver 证据。
