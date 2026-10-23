# 形成时测量方法与关键证据

本材料节选 2026-10-23 UTC 的隔离实验，供复核比较条件与推理；不是当前规范或承诺维护的 benchmark 工具。
计时、诊断、安全分别执行；插桩结果不进入 plain 统计。两个 patch 各自从同一基线产生，没有 combined 变体。

## 对照身份与变化

基线为 main `a9054d47f4fd341b760abece5c4fbc22a7aa7ff9` 的冻结 `src/**` 副本，已包含串行 Worker、adaptive bounded reader 和 collection prefix memo。
每树 803 文件，**含相邻测试**，不是此前安装包 381 个 Product 文件的 inventory。
摘要算法为相对 `src` 路径按 `localeCompare` 排序，依次累计路径、NUL、原始 bytes、NUL 的 SHA-256。

| 树 | SHA-256 | 独立变化 |
| --- | --- | --- |
| baseline | `840e1cd44828f45c89e3ba92cef629e26923cbd19277e2eb52c84adb4f19d966` | 当前实现 |
| fusion | `50ad68bb93df299db90fc08292ea6855424dc49b1601be07309a2a4056e1bbbc` | io-protocol、io-session、io-worker、source-reader 四文件 |
| restore | `64d004b5df0b83c149dd906b7e786173a9c2c25bbdd7b1e00ef6939a2b26afd1` | parse-facts-cache/session、payload 两文件 |

fusion 的 `source-read` 在同一 Worker job 顺序调用既有 containment 和 bounded-read helpers；仍先确认 contained，再按其 absolutePath 读取。父端也校验响应路径位于 root 内。
target 流程、授权、计费、原生 syscall helpers 与传输未变。
restore 保留完整 UTF-8 decode、最后换行截断与 split，倒序扫描完整行；每行仍 JSON.parse 并验证 closed current header/digest。
只有同 digest 的后行已经构建出完整有效 facts，才跳过前行完整 payload 构建。无效后行不占 identity，因此继续回退到较早有效行。
不同历史 digest 均恢复，cache bytes、文法、容量策略与发布逻辑未变；私有 restored Map 插入顺序改变，当前消费者仅按 key 读取。

## 负载与测量口径

- 合成无 symlink 数据，沿用前序生成规则而非用户原语料：1824 源 / 3,320,000 bytes、1193 occurrences（777 direct / 416 HTTP）、296 逻辑 target / 136 source overlap、32 个纯 Markdown 标题读取。D 是相对 canonical root 的组件数，含叶名。
- `files.patterns` 为 `docs/testing/cases/**/*.md`、`docs/guides/**/*.md`，启用默认排除；纯目标不选为源。blocking；maxMarkdownBytes=1,048,576，maxOccurrences/maxTargetReads=false；同/跨文件 anchor 默认开启，HTTP 只分类，不做网络 I/O 或可达性判断。关闭 machine/progress/diagnostic 输出。
- 从各冻结树的 `src/index.ts` import `defineConfig`、`markdownLinkValidation`、`run`，依赖沿祖先解析到仓库 node_modules；未构建或真实安装独立 package。
- 每独立进程先执行一次相同公开完整 Run 预热，再测 `await run(definition, { projectRoot })`。每次新 resolver/session，包含 Worker 创建、clone/通信、cache finalize、Worker drain/exit；import、生成与预热在区间外。
- source 轴 D10/30/60，各用其 current warm parse cache；cache 轴只用 D30。每 runtime/scenario 六对，奇数轮 baseline-first，偶数轮反序，场景按轮次轮转。两个轴独立，不能相加收益。
- 每 sample 断言 completed/passed，公开 data 为 source/occurrence/targetRead/finding/rejected=`1824/1193/777/0/0`，并验证 cache 大小和 SHA-256 未变。777 为逻辑计费数，不是物理读取次数。
- 环境 Linux x64 / WSL2 kernel 6.18.33.2-microsoft-standard-WSL2、Ryzen AI 7 H 450、ext4；mise Node 24.18.0 / Bun 1.3.14。共享 cgroup 4 CPU / 6 GiB；项目内协调独占计时窗口，不代表宿主、存储或 cgroup 独占。不清 OS cache。
- wall 为 performance.now 区间，CPU 为同窗进程全部线程 user+system 增量，不是主线程 CPU；无 RSS 采样。共享 cgroup 节流只能提供环境线索，不归因于单 Run，不从 wall 扣除。
- 组中位数偶数取中间两值均值，MAD 为相对组中位数的绝对偏差中位数。配对节省先按同 axis/runtime/scenario/round 计算 `1-variant/baseline` 再取中位数；不等于两个组中位数之比。全部 plain 样本保留，包括慢值与负收益。

### 样本窗口与波动

144 个 measured Run 为 UTC `2026-10-23T02:35:38.893Z`–`02:42:29.183Z`，结束后复核三棵 source tree identity 未变。
主线程协调该窗口无项目内重型任务；宿主外部负载未独立监控。唯一共享 cgroup 节流记录为 source/Node/D10/round6 baseline：1076.772 ms，1 次 / 28,920 μs；不扣除、不删除。
全部 source 配对更快，两个顺序子组中位数也均正。
duplicate 两顺序子组中位数均正，但 Node round4 反慢 10.69%（baseline 1279.517、restore 1416.353 ms）。
Node history/duplicate 的长样本完整保留；缺少可见节流不等于证明没有外部竞争。

CSV 保留所有 144 原行、原顺序与所选数值字符串，删除可由 cpuMs 表达的 user/system 分项，以及每 scenario 不变的 cache 大小/摘要列（身份在本说明中给出）。
`order` 为本次两轴统一递增顺序；按 axis/runtime/scenario/round 配对。组范围与 MAD 可由 CSV 重算，正文只展示主比较，不另复制冗余统计 JSON。

### Cache 形状

| D30 shape | bytes / 完整行 | unique digest | 生成方式 |
| --- | --- | ---: | --- |
| current | 999,473 / 1825 | 1825 | 当前完整 cache |
| history | 8,995,257 / 16425 | 16425 | 8 代不同 digest 后接 current；每代文档 bytes 长度与 parser facts 均同当前 |
| duplicate | 8,995,257 / 16425 | 1825 | current 原文重复 9 次 |

1856 个当前正文对应 1825 个 digest，三形状都完整命中当前输入。每形状两变体读相同原字节；没有压缩 cache，也没有用丢弃历史代制造收益。
D30 current/history/duplicate cache SHA-256 分别为 `303663a753e220ff65ddef00c1561329be2e01777419d3ec5756a0ef792a62a1`、`fa933182bad533e1d31decb865be4826cce82700a3afd2e966376ad1da4c669d`、`7c75257490b70f1a4341ace9a671df5983d82cbdbb9e8d810abbc5f7c8ee0323`。
source 轴 D10/D60 current cache 同为 1825 行，分别为 934,908 / 1,096,608 bytes；SHA-256 为 `6856b5d2354a7697c072d80339aa9742ff16d3070ab8455d43a188ba988782f7` / `38b28b7e2abc5c8b8a147adab5dc23fe8c57c29a5c453f09ee1e01ed6946d799`。

## 独立诊断计数

Node/Bun × D10/30/60 × baseline/fusion 的 12 次插桩公开 Run 一致：

| 每 Run 工作量 | baseline | fusion |
| --- | ---: | ---: |
| containment job | 1984 | 160 |
| read job | 1856 | 32 |
| source-read job | 0 | 1824 |
| 总工作 job | 3840 | 2016 |
| containment lstat | 1984×D | 1984×D |
| body open / fstat / close（各） | 1856 | 1856 |
| body read / 返回 bytes | 3712 / 3,320,800 | 3712 / 3,320,800 |

会话收束仍发一个 close 控制请求。融合减少请求链交接，不减少安全路径观察或正文 I/O。
Node/Bun × 三 cache shape × baseline/restore 的另外 12 次公开 Run 保持 baseline jobs 与 I/O：

| shape | JSON.parse / current header（两者各自） | 完整 facts baseline→restore |
| --- | ---: | ---: |
| current | 1825 | 1825→1825 |
| history | 16425 | 16425→16425 |
| duplicate | 16425 | 16425→1825 |

六次纯 codec 控制另按 identity/facts deepEqual 比较完整 restored Map（忽略私有插入顺序），均相等。

## Source 安全与取消证据

Node/Bun 各 baseline 51/51、fusion 64/64 个辅助探针通过。每 runtime/variant 包含：

| 证据层 | baseline | fusion | 实际边界 |
| --- | ---: | ---: | --- |
| 真实 Worker resolver / 公开 Run | 28 | 28 | 正常与失败输入、路径/授权/预算、取消与终态 |
| 真实 Worker + 受控 fs wrapper | 16 | 16 | 9 读取变体、6 操作边界取消、1 prestart |
| 真实 Worker 协议 | 7 | 8 | 非法请求/init；fusion 另加 source-read 成功响应 |
| 父 transport double | 0 | 12 | 单独标注的 malformed union/id/path/bytes、unexpected exit |

输入涵盖 missing/directory/regular/invalid UTF-8/max/max+1；symlink contained/escape/re-entry/loop、40/41 hops、非目录中间组件；source facts 复用与逻辑 target budget、ignore/report/validate、首错与无部分发布。
28 项集成中的 8 项公开 Run 覆盖 prestart、timer、首 Worker reply、成功 read/source-read 返回至 parse 前、close-ack 取消，以及受控损坏真实 Worker close ack 的独立错误/原首错优先/取消优先。
取消与失败均无普通 Records/final data；每项在实际 Worker exit 后才返回。

原冻结相邻 Bun 六文件 suite 为 baseline 22/22、fusion 21/22；唯一失败是旧 finalization fake Worker 不识别 source-read，错误回复 read，得到 source-unavailable 而非预期 target-unavailable。
独立辅助副本仅补 source-read 回复分支与直接调用后，原七个 finalization scenario 及 zero-source/lazy Worker 原断言在 Bun 通过（exit 0）。这是额外适配证明，不将原 21/22 重分类成全过；冻结副本未改。
该辅助 helper 的 child eval 引用 bun:test，未在 Node 执行；Node 的真实 Worker 收束/优先级仍由上述独立集成矩阵覆盖。

受控 Worker 在首 path component、最后 containment lstat 到 open 之间、open、fstat、首 read、close 后暂停，以 shared atomic flag 注入取消。
已进入操作暂停时 finalize 等待其返回，取消后不再开始新的 open；所有实际打开的受控 descriptor 恰关闭一次，所有观察 Worker 正常退出且订阅 listener 清空。
这证明操作边界处协作取消和收束，**不是 native syscall 或 parse 可抢占**；timer 单列，不作为确定操作边界证明。

没有注入真实 OS close 失败：损坏 close ACK 是 transport 故障；unexpected-exit 探针也不证明强杀后用户 finally 能关闭句柄。
受控增长/缩小/短读与 pause 是可复核的注入，不等于任意 hostile replacement、OS sandbox 或全部 race 证明。

## Cache 语义与取消证据

Node/Bun 各通过 99 个 baseline/restore 比较场景（19 显式、80 seed=1729 受控生成），每场景查询全部六个当前 identity，比较 facts、finalize 后 cache bytes、标准化消息、递归 freeze 与同 identity 引用复用。
显式范围含重复有效、同 digest 不同有效 facts 的 last-valid-wins、无效 payload/header/version/digest/JSON/surrogate、partial tail、CRLF/unicode、空/缺失/目录读取失败、整体 invalid UTF-8、current 与 distinct history。
另查询全部 48 个历史 identity（8 代×6），验证完整恢复和 hit-only 零追加；覆盖容量 warning 实际 read bytes、仅一次恢复、tail-only dirty 追加换行、finalize 同 Promise 与取消后禁止 dirty 追加。
冻结副本的四文件相邻 Bun 测试共 18/18 通过，包含已进入 append 后的取消等待、公开 callback 结果、source/target exact-byte invalidation；不新增当前 Case 义务。

取消独立 probe 在两个 runtime/两个变体均通过：首读前已 abort 时零 read/warning/write；native read 完成、但 session 续接恢复前 abort 时，恰一次 read、无 warning/恢复产生的 dirty facts，后续用 live signal finalize 也不写。
这证明两个协作边界，不证明同步 JSON.parse/facts 构建中可抢占或有界 abort latency。

## 形成时执行入口与资源取舍

下列命令在仓库根执行，`<bench>`、`<restore-probe>` 分别指本轮临时 `fusion-bench`、`restore-probe` 目录；它们是形成时做法，不要求读者为阅读证据恢复脚本。

```text
mise exec -- bun run <bench>/measure.ts fusion restore
mise exec -- bun run <bench>/summarize.ts
mise exec -- node <restore-probe>/semantic-probe.ts
mise exec -- bun run <restore-probe>/semantic-probe.ts
mise exec -- node <restore-probe>/cancellation-probe.ts
mise exec -- bun run <restore-probe>/cancellation-probe.ts
```

measure 为各 sample 子进程选择 `mise exec -- node <bench>/sample.ts ...` 或 `mise exec -- bun run <bench>/sample.ts ...`。
诊断另由 `prepare-diagnostics.ts` / `diagnose.ts`、`prepare-cache-diagnostics.ts` / `diagnose-cache.ts` 在插桩副本运行；相邻测试用 `mise exec -- bun test` 指定冻结副本的目标文件，TMPDIR 限于实验自有 scratch。

两个 `.patch` 为 plain 副本差异，去除临时绝对路径与时间戳、统一为 `a/src` / `b/src`，空行上下文规范为无前缀空行；改动内容保持，未拼接两个轴。
长期仅保留本说明、全部 plain 的所选 CSV 列和两个 patch。大型 cache/fixture、完整副本、raw JSON、profiles、诊断副本与整套 harness 是形成时实验和交接核对的临时工作物，不属于长期仓库资源。
