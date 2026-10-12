# 本批证据阅读与复现入口

本文拥有当前证据解释与阅读路径；[验收交接](../acceptance.md)拥有采用结果和下一动作，[任务](../tasks.md)拥有当前进度。
原始测量、主线程验证及独立产品审查材料保留形成时字节；本轮规范复核与当前复现代码另存于 `style-review/`，各自按源身份解释。

## 按任务读取

| 阅读任务 | 入口与边界 |
| --- | --- |
| 恢复采用范围、小成本和当前状态 | [验收交接](../acceptance.md)，再按需读[设计](../design.md)。 |
| 使用当前复现代码或核对本轮规范整改 | [规范复核与当前复现](style-review/README.md)，含新 helper、flags 增量成本、当前 Gate 及独立审查。 |
| 查数值与分布 | [形成时结果](results.md)、[完整统计](summary.json)；同时应用下节 E1，逐行区分 pooled median 与五对 process ratio。 |
| 审计测量身份与全部样本 | [原始交付说明](README.md)、`identity/`、`raw-final.tar.gz`；下节列出冻结身份与 SHA 范围。 |
| 核对 Gate、失败及统计复算 | [主线程验证材料](root-validation/README.md)；日志反映前轮执行，其中 12/13 是独立审查前的状态。 |
| 核对产品和文档影响判断 | [独立审查](independent-review/review.md)、[定向复核](independent-review/review-followup.md)及[材料说明](independent-review/README.md)；对象为 baseline 至 `7b1ca20f`，不是本轮风格审查。 |
| 精确重放形成时实验或审计过程差异 | 按下文历史复现路径读取 README；[原始协议](protocol.md)保存 31→33→37 workload、runtime 修正等形成过程，旧的“待计时”描述不是当前待办。 |

## 组合 workload 的计时澄清（E1）

`T01-T02-public-prepare` 实际是 **prepare（包含空目录下 missing-history 的异步读取）+ 三次 decide**，分别使用 tightening、active continuation 和 wait context。
原始名称及 row `boundary` 未写全后续决定；512-task 的 19.174481 → 9.203477 ms 因而不能单独归因于 preparation。
原始 results/protocol 的统一 IO 不计时概括不适用于这个 workload 内部的 history read；它们排除的是证据读写、fixture 创建等工作，其它行按对应 invoke 和 row boundary 核对。

依据是 `helper-source.tar.gz` 中 `harness/after-workloads.ts:347–356` 与同义 before invoke，以及 `harness/measure.ts:40–52` 对整个 invoke 计时；产品 `duration-model/preparation.ts` 在 prepare 内读取 history。
原始输出、计时批次和统计仍有效，无需因 E1 重测。不同 workload 的中位数相减不能得到 isolated prepare，本批未单独测定该成本。
这些结果也不证明 Run 端到端、真实 scanner I/O、内存、所有小输入无回退或生产 SLA。

## 冻结身份与形成时材料

- before commit：`b3c8fecce5a2ff835948f76f9fd4fa5a8e2fe853`；相对 src manifest SHA 为 `a70cd0eda18639f14b09e3f2658029ebd3dfcff7f6488f8ea3d3968c661bd3d0`。
- after-final 相对 src manifest SHA：`8fe097928bef32df57b87a7414b7f80853acd968048d8229c5de881216478b40`；以 `identity/` 清单和 raw-text 中最终 patch 重建，独立产品审查已核对其与审查源码一致。
- 正式环境：Bun 1.3.14 / Node 24.18.0；37 rows × 10 processes × 7 batches = 2,590 批，顺序 B A / A B / B A / A B / B A，全部保留。ambient runtime 探索、before-only、C05 候选和首轮失败 after 均在 appendix，未混入 final ratios。

三组原始 SHA 清单分别核对各自目录，清单本身除外；不是覆盖整个 Change 的总清单：

| 形成时交付组 | 身份清单与数量 | 当前阅读注意 |
| --- | --- | --- |
| 测量 | [artifact-sha256.txt](artifact-sha256.txt)，44 文件 | 原 README/results/protocol 保持原样，解释适用 E1；当前 reading-guide 不在原清单中。 |
| 主线程验证 | [root-validation/artifact-sha256.txt](root-validation/artifact-sha256.txt)，10 文件 | Gate 与补验日志保留各自时点，原 12/13 不代表当前任务计数。 |
| 独立产品审查 | [independent-review/artifact-sha256.txt](independent-review/artifact-sha256.txt)，16 文件 | 原报告只评价其形成时对象；followup 中尚待生成 SHA 的描述保留原时点，清单随后已交付。 |

从仓库根用 `(cd changes/batch-low-risk-complexity-optimizations/evidence && sha256sum --check artifact-sha256.txt)` 核对测量组；另两组进入各自目录执行同一 SHA 命令。
`raw-text-evidence.tar.gz` 保存 2 份源码 patch 和 5 份原始 lint JSON，独立解包后按 [raw-text SHA](raw-text-original-sha256.txt)核对；这些字节的必要空白不作规范化。
本轮 `style-review/` 使用[独立清单](style-review/artifact-sha256.txt)，不扩写三组原始清单。其当前产品为 `435eb4dc`，原 after-final 与当前 source 仅 flags wrapper 一处不同，完整关系见[本轮身份](style-review/README.md#材料与身份)。

## 历史复现路径与后续动作

日常复核使用[新版 helper 与复现步骤](style-review/README.md#复现)。以下路径只用于保持原字节的历史实验重放：

1. 从[原始 README](README.md#reconstruct-and-replay-workspace-bound-not-fully-portable)进入，在独立临时根解包 helper/raw-text；从 baseline 的只读 `git archive` 重建 before，再应用最终 patch 重建 after-final，逐文件核对相对 src manifest。
2. 按 README 重建 C05 候选以满足 helper strict include；使用匹配 workspace 的现有依赖、固定 runtime、配置和 binary SHA。helper 绑定形成时工作区路径，迁移只调整独立副本的显式路径，保留原规则和编译选项。
3. 先重跑 strict typecheck、完整 lint、format 及双侧 smoke parity，再在单独静默窗口运行 `harness/run-comparison.sh`；它要求新的 comparison-results namespace，保留所有进程与样本。仅核对归档数值无需重跑 benchmark。
4. 复现依赖和环境就绪由实际核对确认，不安装新版替代、不覆盖共享工作树或原始材料；复现后的数据与本轮源修改分别说明身份。

本轮规范复核已通过，材料验证和提交进度由验收页与任务维护。集成、发布和 Change 删除各自取得当前授权；原始交付中的代理权限说明不替代当前任务授权。
