# 正文转移与 disabled-cache UTF-8 补证

本材料保存 2026-10-23 UTC 后续取得的字节处理证据，与先前 source 融合/cache 恢复窗口分开复核。
共同负载、公开 Run 定界和统计量解释见[先前方法](evidence.md)；本补证不包含那两个新算法，不能跨窗口相加收益。
资源是形成时方法与关键结果节选，不是 benchmark 工具归档或当前规范。

## 冻结身份与变化

相同 main `a9054d47f4fd341b760abece5c4fbc22a7aa7ff9`，四棵 `src/**` 各 803 文件（含测试）；baseline SHA-256 为 `840e1cd44828f45c89e3ba92cef629e26923cbd19277e2eb52c84adb4f19d966`，与先前窗口相同。
摘要沿用相对 src 路径 `localeCompare` 排序、路径/NUL/原 bytes/NUL 累计算法。副本沿祖先解析仓库依赖，不是独立 installed package。

| variant | SHA-256 | 唯一变化 |
| --- | --- | --- |
| transfer（A） | `73ae96d11047985d992126bd25159260e9d05c3ec849d1f8a6cf02ee892e9399` | io-worker：成功 read 回复采用 transferList |
| utf8（B） | `33f3f7800c641b0228e7cc035fb30d3cf146f99673d252531670c32fa5fa8408` | cache/session：disabled 支路交由既有 fatal decode 校验，移除其重复 isUtf8 |
| combined（AB） | `918a6f6233a4d337d794fdf74ec2f4cc4270e823cb8b829c45e905045200691f` | 仅合并 A+B 两处差异 |

A 保留 native reader 的精确长度副本；仅成功正文的独占 ArrayBuffer 加入 transferList，非正文、失败、cancelled、closed 回复不转移。取消 SharedArrayBuffer 不转移，发送后生产路径不再使用正文 buffer。
B 仍先检查 signal；cache enabled 的 isUtf8 早拒绝位置、cache I/O 顺序与解析流程不变。disabled 时继续使用既有 fatal UTF-8 decode，非法字节仍返回 unavailable。
两个 patch 为真实 plain 副本差异，采用 `a/src` / `b/src`、无临时绝对路径与时间戳，空行上下文规范为无前缀空行；改动内容保持，combined 不再重复归档 patch。

## 新增比较条件

- 主负载固定 D30、1824 源 / 3,320,000 bytes / 1193 occurrences，与先前生成规则和选集相同；公开 data 断言为 `1824/1193/777/0/0`。
- 每 sample 独立进程、先一次完整公开 Run 预热；测量新 resolver/session 的完整 `await run`，包含 Worker 启停、clone/transfer、解析/cache、finalize 与 drain/exit。import/config/生成/预热均在外。
- hit：同进程预热产生持久 cache，测前后大小与 SHA-256 相同。miss：预热后仅删除该进程独占 cache 文件，测量从无持久 cache 开始并包含 append/finalize，结果 cache 与预热 cache 身份相等；这是逻辑冷 cache，不是冷 OS。disabled：不产生 cache 目录，read/mkdir/append 均为零。
- 每 runtime/mode 六轮四变体顺序为 `baseline-A-AB-B`、`A-B-baseline-AB`、`B-AB-A-baseline`、`AB-baseline-B-A`、`A-baseline-B-AB`、`AB-B-baseline-A`。各候选相对 baseline 先/后各三轮，各位置出现一或两次；runtime 顺序逐轮交替，mode 轮转。
- 另设 byte 控制：D4、32 文档×256 KiB=8 MiB、32 occurrences/逻辑 direct targets，cache hit；Node/Bun 各六对 baseline/transfer，交替先后。这是字节敏感控制，不是 1824 源目标规模，也不是小文档常数开销矩阵。
- 本轮实测环境仍为 Node 24.18.0 / Bun 1.3.14、Linux x64 / WSL2 6.18.33.2、Ryzen AI 7 H 450、ext4；共享 cgroup 4 CPU / 6 GiB。不清 OS cache，无 RSS 采样。项目协调无重型并行工作不代表宿主/存储/cgroup 独占；零节流也不证明无外部竞争。

## 独立诊断工作量

Node/Bun × 三 mode × 四 variant 的 24 次插桩公开 Run 均保持：3840 job（1984 containment + 1856 read）、59,520 containment lstat、body open/fstat/close 各 1856、read 3712、返回 3,320,800 bytes、一个 close 控制请求。
每次 exact slice 仍 1856 次 / 3,320,800 bytes。A/AB 将成功正文的默认 clone 形式发送从 1856 变为 0、transferList 形式从 0 变为 1856，senderDetached 1856；baseline/B 维持 clone 形式。
这些计数证明 API 发送形式、sender detach 与 exact copy 保留，不测量引擎内部物理 memcpy 次数，不证明所有复制或 RSS 归零。

| mode | baseline/A isUtf8 | B/AB isUtf8 | 四变体共同解析/cache 工作 |
| --- | ---: | ---: | --- |
| hit | 1856 | 1856 | source decode 0；cache JSONL decode 1；source facts hit 1856 |
| miss | 1856 | 1856 | fresh parse/source decode 1825；同 invocation dirty facts hit 31；cache read 1、mkdir/append 各 1 |
| disabled | 1856 | 0 | fresh parse/fatal source decode 1856；cache read/mkdir/append 0 |

1856 个正文仅 1825 个 unique digest，因此 miss 的 31 次复用是本 invocation 内合法 dirty-map 复用，不是遗留持久 cache 命中。
B 在 enabled hit/miss 没有减少扫描/解析工作量，其计时差异不构成 UTF-8 优化收益的机制证据。

## 正式样本与比较结果

新增窗口 UTC `2026-10-23T03:46:05.338Z`–`03:57:10.009Z`，全部 168 个 plain 样本保留：主矩阵 144（Node/Bun×三 mode×六轮×四 variant），独立 byte 控制 24。
结束后复核四树与真实 src 身份不变。每 sample 公开结果和 cache 大小/hash 不变量通过；主 enabled cache 为 999,473 bytes / 1825 行、SHA-256 `303663a753e220ff65ddef00c1561329be2e01777419d3ec5756a0ef792a62a1`。
共享 cgroup 节流增量全部为零，不据此排除宿主噪声，也未删除慢值。
Bun disabled 第六轮按实际顺序为 combined 3355.834、utf8 5961.870、baseline 4256.320、transfer 2580.258 ms；同轮仍有较大波动，全部原值留在 CSV。

下表 wall 为各组中位数 ms，节省为同 corpus/runtime/mode/round 的逐对 `1-variant/baseline` 中位数；正值有利于候选，“更快”均以六对计。组中位数之比不是配对节省。

| corpus / runtime / mode | baseline | A | B | AB | A 节省 / 更快 | B 节省 / 更快 | AB 节省 / 更快 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| main / Node / hit | 976.000 | 980.881 | 968.127 | 1004.749 | 0.67% / 4 | 0.73% / 3 | -1.54% / 1 |
| main / Node / miss | 1774.464 | 1796.547 | 1832.391 | 1710.189 | -0.69% / 3 | -2.96% / 2 | 3.78% / 3 |
| main / Node / disabled | 1684.333 | 1615.445 | 1627.369 | 1633.722 | 0.93% / 4 | 3.31% / 4 | 1.96% / 5 |
| main / Bun / hit | 979.556 | 977.746 | 981.992 | 992.135 | 0.83% / 4 | -0.24% / 3 | -3.99% / 2 |
| main / Bun / miss | 2000.596 | 2019.988 | 2021.749 | 2122.286 | -3.19% / 2 | -2.33% / 2 | -0.63% / 3 |
| main / Bun / disabled | 2023.786 | 2102.213 | 2074.549 | 1986.276 | 1.33% / 3 | -3.99% / 1 | 2.80% / 5 |
| byte / Node / hit | 86.219 | 76.719 | — | — | 7.53% / 6 | — | — |
| byte / Bun / hit | 65.892 | 62.150 | — | — | 7.66% / 6 | — | — |

A 在 main 六组配对节省为 -3.19%–1.33%，没有稳定收益；独立 byte 控制两 runtime 均 6/6 更快，支持通信正文规模会影响价值，但不能外推主规模或“所有复制消失”。
B 在 disabled 的 Node/Bun 方向不同；enabled 没有机制差异，不能把其波动归因于减少 UTF-8 扫描。
AB disabled 两 runtime 均 5/6 更快、配对中位节省为 1.96%/2.80%，但 hit/miss 混有负值且单项不稳定；该结果不足以承诺普遍组合收益或解释为已分离的协同机制。
同轮以 A 为基线观察 AB 的 disabled 增量，Node/Bun 配对中位节省为 -0.12%/1.68%，范围为 -15.11%–8.31% / -30.06%–13.43%；亦不支持 B 有稳定增量贡献。此为相同四元组派生比较，不增加独立样本。

新增 CSV 保留 168 原行原序及 13 个字段的原数值字符串；只删 user/system 分项（cpuMs 已求和）与不变/不适用的 cache 身份列。
按 corpus/runtime/mode/round 配对，sequence 给出整轮实际先后顺序；byte 与 main 分开统计。未另保留可由 CSV 重算的冗余统计 JSON。

## 安全、所有权与取消

Node/Bun × baseline/A/B/AB 各 130 个矩阵行通过，共 1040 执行行，不等于 1040 个独立语义 Case。每格为实际 Worker 29、UTF-8 70、手写 facts/ranges/slugs 18、回复/parse 取消边界 5、取消回复无 transfer 5、受控故障 close-once 3。
四个未插桩 plain 副本另各通过既有 Bun owner suite 44/44（13 文件，共 176 测试实例），无需适配；未新增当前测试或 Case。

- 所有权：实际 Node/Bun Worker 的接收 bytes 均 byteOffset=0、byteLength=背板长度，无多余容量；内容/长度覆盖 empty、普通、max/max+1、1/16 MiB、短读、增长/缩小与真实 EOF。A/AB sender 发送后 detached，空 buffer 也以 `new Uint8Array(buffer)` 抛错确认；baseline/B 保持 attached。后续另一回复不改变首回复内容，buffer 互异。
- UTF-8：独立 fatal TextDecoder oracle 与 6 个有效/10 个非法输入覆盖 ASCII/CJK/emoji/BOM/empty/CRLF、截断、overlong、continuation、surrogate、超范围与非法 lead；另以手写期望检查 slug、UTF-16 ranges/行列和 freeze。digest 独立核对精确原 bytes SHA-256。
- enabled invalid source：isUtf8 早拒绝，零 decode/cache read/warning/append；miss/hit 保留原顺序。invalid cache JSONL 的容量 warning、fresh parse、禁止发布和原文件保留一致；cache read 后 abort 则不再 warning/decode/restore/append。disabled B/AB 以 fatal decode 拒绝相同非法字节，零 cache I/O。
- 取消：prestart、between jobs、read reply 前/后、parse 前均可收束；actual native open/fstat/read/close 返回后 shared-atomic 暂停期间，abort/finalize 等待 release，无新 open、descriptor 关闭一次、Worker 退出和 listener 清空。cancelled/closed 回复无 transfer，取消 SAB 保持可用。证明 drain，不证明 syscall 抢占或有界取消时延。
- 故障：新增 post failure/bad reply/exit 在实际 Worker 受控注入，exit 在 native return/close 后发生；既有终态/协议 helper 的 transport doubles 单独解释。未证明任意强杀后 finally 执行、真实 OS close 失败、hostile replacement 或跨平台隔离。

所有权观测在独立插桩副本，plain 计时不插桩。Bun 原生 parentPort.postMessage readonly，辅助观察层采用局部 port facade 调用原 native postMessage 并传真实 transferList；没有用 clone 替代 transfer。
最初该观测层赋值失败、另一次 oracle 被计入计数均在完整重跑前修正，不属于候选行为失败。最终矩阵全部重跑通过。

## 形成时入口与保留范围

从仓库根以 `mise exec -- node <bench>/measure.mjs` 驱动正式样本，子进程为 `mise exec -- node <bench>/sample.ts ...` / `mise exec -- bun run <bench>/sample.ts ...`，汇总为 `summarize.mjs`。
独立诊断由 `instrument.mjs` / `diagnose-all.mjs` 执行；安全脚本分别为 `worker.mjs`、`utf8.mjs`、`contracts.mjs`、`boundaries.mjs`、`responses.mjs`、`fault-close.mjs`，两个 runtime 均运行。
既有 plain 测试命令为 `TMPDIR=<safety>/tmp mise exec -- bun test ./src/package-checks/markdown-link-validation`，cwd 为各冻结树。
上述 `<bench>`、`<safety>` 指形成时临时实验目录，脚本名说明当时做法，不承诺保留可运行 harness。

长期仅新增本说明、全部新增 plain 的所选 CSV 列与 A/B 两个 patch。先前 144 行 CSV、fusion/restore patch 和 evidence 原样保留；源码副本、fixture/cache、长 harness/raw logs 与统计 JSON 是临时工作物，不进入长期资源。
