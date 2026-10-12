# 性能测量协议与复测条件

[主报告](../../measure-product-performance-baseline.md)给出结论和数值，[覆盖矩阵](COVERAGE.md)说明逐域分支。
本页解释样本如何形成、如何读取原始证据，以及复测所需条件。

## 环境与统计口径

| 项目 | 形成时条件 |
| --- | --- |
| 源码 | `5cb448b23453edc90e02b25d003efd57dcdd3509`；测量期间 `src`、`scripts` 保持原样 |
| 运行时 | mise 锁定 Node 24.18.0／Bun 1.3.14；Bun 的 `process.versions.node` 为兼容字段 |
| 宿主 | Linux `6.18.33.2-microsoft-standard-WSL2`、x86_64、AMD Ryzen AI 7 H 450，6 个逻辑 CPU，ext4；共享宿主调度、JIT、GC、文件缓存噪声均保留 |
| 窗口 | `performance.now()` 计公开操作或完整 `await run(...)`；import、进程启动、声明构造、fixture／manifest 生成在外，Run 内 validation／normalization／prepare／execution 在内 |
| 主样本 | 新自然 Check、Core、工具均为首轮 `i0` 加 3 次同进程重复；显式路径四项为首轮加 2 次，前段普通 Bun Check 为首轮加 4 次 |
| 统计 | 串行、非随机交错，保留全部样本；主文取重复样本 median 与 min–max。`i0` 无 cold 保证；2／3 个样本的 `p95NearestRankMs` 实际为最大值，不估计总体尾延迟 |

Check 输入按 path、bytes、SHA-256 冻结，收尾核对无内容漂移；后续文档写入会改变自然 glob 语料，复测需重核清单。
普通 Check 关闭输出、并发 1，提供 20 秒 caller AbortSignal；输出矩阵、learned 和受控 command 的配置见各脚本。

被测 constructors／run 均来自 `src/index.ts`。取证时共享 candidate 为 stale / rebuild（`receipt-input-mismatch`）；
Gate policy 的静态依赖会导入 installed root，但它不承担被测调用，import 也在计时外。因此结果归属 source API。

## 关键样本条件

| 对象 | 解释条件 |
| --- | --- |
| Node 自然四项 | 原 Gate policy／glob；links 323、lint 559 文件，区别于前段 Bun 的 322／558 |
| Node 显式四项 | 冻结内容相同，数百个 exact patterns 改变了选择表示；归为诊断 |
| 其余五项与 command | Node/Bun options、manifests 相同；顺序与宿主因素仍影响比较 |
| file／JSON／schema | SCC 4.0.0；JSON 单文件显式 8 MiB；schema offline |
| secret／maintenance | 无秘密合成文本；Git 只读实际 first-parent 历史，30 entries、HEAD 后退 10／20／30 commits 的 3 个 base |
| command | Node eval，exit 0、stdout 2 字节、discard；5 秒 timeout |
| Git／flags | 实际 not-applicable／flag-condition-not-matched、duration null、strict aggregate failed；额外 readback 未计时 |
| learned | 正常 prepared 路径及本地 history 重复；raw 的 `firstemptyhistory` 标签缺少独立初态记录 |
| 输出 | machine／diagnostic 返回 succeeded，未另行 schema audit；progress 为 plain stdout |

## 样本恢复与选择等价性

- **Core 样本**：第一次 Node 进程完成前 14 组、至 JSON cache 后，harness 在 AdmissionGraph 结果读取处出错
  （`catalog.settledTasks` 应为 `inspection.settledTasks`）。前 14 组从 stdout 原样恢复，后 3 组在新进程执行。
  每组自己的重复仍同进程，一个 pack 包含多个进程的组。
- **Selection 对照**：初探拼接 area 正负 patterns 得到 789 路径，与 853 路径的显式侧不等价，退出正式比较。
  修正为 24 patterns 后重新采样 glob 侧，并保留有效的 explicit 侧；两侧最终均为相同 853 路径。
  对照对象是公开单次 collection，私有 Check 的分批选择另有调用形状。

## 原始证据路由

| 资源 | 内容 |
| --- | --- |
| `combined-evidence.json` | 元数据、清单核对、selection 对照、未计时 readback 与 `archiveLayout` 分片映射 |
| `node-evidence.json` | Node 自然 Check／Core 主基线及显式路径诊断 |
| `bun-check-evidence.json` | Bun Check／工具及 `earlierDevelopmentBaseline` 缓存对照 |
| `bun-scheduler-evidence.json` | Bun 大图与高并行样本 |
| `summary.json` | 新测量的派生统计；前段缓存与调度从对应 raw 读取 |

原合并包为 4,491,053 字节；按仓库 2 MiB JSON 单文件上限无损拆分，三片约 1.69／1.33／1.24 MiB。
`archiveLayout` 保存原包与各片 SHA-256、字段映射；恢复原键顺序和缩进后的重组结果与原包逐字一致。
6 个 helper 与统计文件保持原样，`assemble.ts` 仍表达当时生成完整合并包的做法。

## 历史 helper 的复测准备

脚本保存当时做法，依赖 `/workspace/vibe-check` 下的原临时目录层级和 mise 环境。
复测先准备独占目录，适配 import、root、输出位置并恢复冻结输入；保留正式证据。
脚本会覆盖临时 JSON、fixture 和部分同名输出，cache／history 初态也需重新记录。

| Helper | 原执行方式 | 用途 |
| --- | --- | --- |
| `checks.ts` | `mise exec -- node <path>` 或 `mise exec -- bun run <path>` | 五项 Check 与 command |
| `node-four-native.ts` | `mise exec -- node <path>` | 四项原 glob 主基线 |
| `node-four.ts` | `mise exec -- node <path>` | 显式路径诊断 |
| `core-tools.ts` | Node 或 Bun，同 `checks.ts` | Core、输出与工具；正常重跑省略恢复参数 `resume` |
| `selection-isolation.ts` | `mise exec -- node <path>` | 等价文件选择对照 |
| `assemble.ts` | `mise exec -- node <path>` | 合并原始样本与统计 |

原 `<path>` 为 `tmp/product-wide-investigation-20261012/performance/<helper>`。
`node-four.ts`／`assemble.ts` 所需前段 `*-samples.json` 可从 `bun-check-evidence.json.earlierDevelopmentBaseline` 恢复。
`core-tools.ts resume` 另依赖本轮 first-attempt stdout，仅用于原恢复流程。
复测运行资源目录副本前须完成上述路径适配；实体输出、缓存和 stdout 的临时留存由该取证目录的旁注说明。
