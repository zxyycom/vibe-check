# 共享条件调查：证据导航与复跑

[调查报告](../../evaluate-scheduler-shared-condition-state.md)承接结论和适用条件。本目录保存形成时的隔离模型、样本与身份，用于复核方法和结果；这些脚本不属于 Product 或正式测试 Case。

## 按复核任务读取

| 复核任务 | 文件 | 内容 |
| --- | --- | --- |
| 完整签名分组 | `model.mjs`；`verify.mjs/json` | shared 与匹配职责的 eager 模型；独立全扫描 oracle、真实 Core 对照、七种 N1024 图的实际 delta 计数。 |
| 分阶段与完整轨迹计时 | `measure.mjs`、`measure-total.mjs`；`{node,bun}-timing.json`、`{node,bun}-total.json` | 各 runtime 84 条 phase rows、21 条 direct-total rows。total 直接测量 compile 到选尽下游。 |
| 公共 A＋Bᵢ 的 v1/v2 转折 | `partial-model*.mjs`、`partial-verify*.mjs/json`、`partial-measure*.mjs`；`{node,bun}-partial*-timing.json` | v1 语义检查通过，但 query 重复清理 stale roots；v2 仅让 transition 发布清理结果。两版原始证据分别保留。 |
| 内存口径与补证 | `{node,bun}-memory.json`；`memory-isolated.mjs`、`{node,bun}-memory-v2.json` | 前者为同进程观察；后者逐 row 使用 fresh process、强引用保留集合并三次 GC。 |
| 来源与冻结身份 | `source-identity.mjs`、`evidence-manifest.json` | 780 文件起止 inventory 一致的摘要，27 个 runner/raw 的 SHA-256；manifest 与本文不参与自哈希。 |

source-identity 脚本原字节来自 `git show 14a64e5e:changes/restructure-scheduler-incremental-state/evidence/source-identity.mjs`。资源默认供阅读，复跑的写入范围见下节。

## 样本与计量口径

- **环境**：Node 24.18.0、Bun 1.3.14、Linux x64、AMD Ryzen AI 7 H 450、6 逻辑 CPU；主线程协调独占，Node 后 Bun 串行。
- **计时**：每矩阵 3 warmups＋7 samples，变体交替先后，GC 在 span 外；N32/256/1024 每 sample 执行 8/3/1 次，raw 已除以固定次数。轻量 stats 一直开启，min/max 表示本机离散而非置信区间。
- **第一切片**：N 表示下游 Task 数。unique/overlap 有 N 个来源，其余有 8 个；overlap 是三来源循环重叠，不包含全局公共 A。`group.cells.includes` 在 cross 的二次编译上界原样计入 compile/total。
- **第二切片**：N+1 个来源 A、B₁…Bₙ；三种 A 完成顺序 × C4/C=N × 三个 N，共 18 cohorts/runtime。fixture 指定单公共 gate。
- **内存**：v1 的 Node signed 负值受行间回收/存活集影响；fresh-process v2 才用于报告的指定保留集合比较。Bun 两版 heapUsed 差值均全为 0，无法据此判断分配或 retained 大小。memory 独立于 timing，未运行 allocation sampling。

## 复跑步骤

前提是仓库 `src` 与 manifest 中的 digest 一致，依赖已安装；形成时 HEAD 为 `313c3830aa3af33c76131614776134f6a9dc60a9`。脚本保留原相对 import，复制到仓库 `tmp/<新目录>` 后运行。命令不自动 checkout 或安装依赖，输出写入新工作目录。

```sh
cd /workspace/vibe-check
resource=docs/investigations/_resources/261017-evaluate-scheduler-shared-condition-state
work=tmp/scheduler-shared-condition-replay-unique
mkdir "$work"                 # 必须成功；若已存在，换新目录，不覆盖
cp "$resource/"*.mjs "$work/"
NODE=/home/dev/.local/share/mise/installs/node/24.18.0/bin/node
BUN=/home/dev/.local/share/mise/installs/bun/1.3.14/bin/bun
SOURCE_REVISION=$(git rev-parse HEAD) "$NODE" "$work/source-identity.mjs" > "$work/source.json"
"$BUN" "$work/verify.mjs" > "$work/verify.json"
"$BUN" "$work/partial-verify-v2.mjs" > "$work/partial-verify-v2.json"
# 以下各行仅在协调取得独占窗口后串行执行；先Node再Bun，不与测试/Gate并跑
"$NODE" --expose-gc "$work/measure.mjs" timing > "$work/node-timing.json"
"$BUN" "$work/measure.mjs" timing > "$work/bun-timing.json"
"$NODE" --expose-gc "$work/measure-total.mjs" > "$work/node-total.json"
"$BUN" "$work/measure-total.mjs" > "$work/bun-total.json"
"$NODE" --expose-gc "$work/partial-measure-v2.mjs" > "$work/node-partial-v2-timing.json"
"$BUN" "$work/partial-measure-v2.mjs" > "$work/bun-partial-v2-timing.json"
# 单独memory pass（父runner为每row创建fresh子进程）
"$NODE" --expose-gc "$work/memory-isolated.mjs" > "$work/node-memory-v2.json"
"$BUN" "$work/memory-isolated.mjs" > "$work/bun-memory-v2.json"
```

复核 v1 转折时运行 `partial-verify.mjs` 与 `partial-measure.mjs`，后者保留已识别的 stale-root 缺陷。复核旧内存口径时运行 `measure.mjs memory`。新结果保存在工作目录，形成时 raw 保持原样。

## 材料归属与保留

形成时间为 2026-10-17，具体运行时点见 raw metadata。本目录随调查报告保留。
`tmp/scheduler-shared-condition-investigation/` 中的完整 source inventory、冻结清单和工作旁注用于短期审计；核对正式资源齐全后，可在覆盖该精确目录的删除授权下清理。
