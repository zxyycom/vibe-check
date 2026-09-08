---
title: "Gate 单项与全量时长调查及虚拟负载波动校准"
id: "260908-calibrate-gate-duration-variation"
formedAt: "2026-09-08T08:17:29Z"
question: "当前 Gate 的单项执行与正式全量运行有多大时长波动，哪些数据可用来确定虚拟任务随机幅度，哪些仍不能解释为资源竞争？"
tags:
  - "admission-simulation"
  - "duration-variation"
  - "performance"
  - "project-gate"
relations: []
---

## 形成时背景

用户将 learned admission 工作拆成 Gate named-resource 配置、虚拟测量平台和算法调优三个 Change，要求先调查真实时长，再决定模拟 Check 的波动幅度。整体完成时间优先，其次是在该结果不更差时减少槽位累计占用和每种资源单位时间；不设置用户关键任务选项，不要求证明真实加速百分比。

用户进一步明确：应设置不同固定特征的 Check，不让一个 Check 随机切换特征。随机波动只发生在各自既定 profile 内；未声明资源不竞争、共享相同命名资源可能因并发减速，属于待验证模型假设，不是 Product 容量契约。

当前 Gate 为 root `maxParallel: 3`，保留现有 mutex，尚未声明 named resources。本轮不修改 Gate 配置、策略、Product、测试或 history 模型，不实施三个 Change，也不发布 package。

## 调查目的

1. 区分正式全量命令 wall time、Gate 内部阶段时长、全量中的单 Check 执行时长，以及隔离 payload 的时长。
2. 为几类固定特征的模拟 Check 提供初步经验波动输入，保留首轮/尾部异常，不统一套用任意的对称百分比。
3. 判断哪些数据不足以识别完整隔离 Check 的资源持有时间或共享资源减速系数，并交接后续校准要求。

## 调查范围与依据

### 对象、输入与方法

- 读取 [Gate owner](../tooling/project-gate.md)、[Gate 配置](../../scripts/project/gate/definition.ts)、[公开模拟器](../guides/simulating-admission.md)、[Check 执行计时](../../src/project-run/check-execution/resolved-checks.ts)及当前本地 Gate 日志；未读 Git 历史、未恢复暂停计划的 private 性能结论。
- 先审计已有日志：可解析 172 条完成计时记录，含 66 条 all、53 条 required、53 条 focused。all/passed/已知 candidate reuse 只有 28 条，按 candidate 分组最多 3 条；本次 candidate 原有可比 full 样本仅 1 条。该审计只用于确定补采必要性，不作为本轮分布样本。
- 预先固定 5 次串行 `bun run check -- --all`；随后 5 轮串行执行 `bun run typecheck -- product`、`bun run typecheck -- scripts`、`bun run lint -- product`、`bun run lint -- scripts`。不并行跑调查/审查负载，不按结果剔除样本。
- 成功采样窗口为 2026-09-08 08:11:33–08:13:34 UTC；Linux WSL2 x64、Bun 1.3.14，`nproc=4`。HEAD 为 `aaeddad9063b9f56366f9d500befb92ef0dcae06`；工作树含本次治理/Change 文档改动，采样前后 HEAD、status、staged/unstaged diff 与未跟踪文件内容摘要完全相同。不是 clean-HEAD benchmark；报告形成后的文档变化不属于该快照。
- 5 次均为同一复用 candidate `0.0.0-local.47404e90e692`，selection=all、package acceptance selected、passed、exit 0；精确 candidate SHA、25 项命令、原始时钟读数、来源与摘要见随附 observations。未清缓存/history，prepared strategy 的 history 可自然更新；背景系统负载未隔离。
- 首个采集脚本使用的 `/usr/bin/time` 不存在，25 项均在目标启动前 exit 127，未产生 Gate/代理 workload。保留该失败 manifest 后改用 `date +%s%N`，在新目录重新执行完整预注册 25 项，均 exit 0。这不是删去不利性能样本。

### 时间口径

| 指标 | 本轮来源与边界 |
| --- | --- |
| 正式命令 outer wall | `date +%s%N` 在正式命令前后之差，包含 wrapper、Gate 与退出；realtime 而非 monotonic，未另监测系统时钟调整。小数位不代表测量精度。 |
| Gate elapsed-to-initial-result | Gate 自有单调时钟，包含 candidate preparation、adapter/setup、Product Run，不含 afterGate 与外层 wrapper。 |
| Product Run | 全量真实 Product Run 阶段时长，不等于纯模拟 makespan。 |
| core execution duration | `check.finished.durationMs` 从 ready preflight 后开始，到 callback settlement；不含 preflight 或准入前等待，不等于 admitted-to-settled。 |
| Task active duration | Scheduler admitted-to-settled；当前 summary 只保留 admission delay 排名前三项。本轮仅三个 Check 有该证据，其他不是零而是未知。 |
| 隔离 payload outer wall | 公开开发命令的总耗时，不是完整 Gate Check 的隔离基线。typecheck 使用相同 tsgo 参数但 wrapper 不同；lint 还存在默认输出与 Gate JSON 输出的差异。 |

Gate 唯一正式入口没有 single-Check selector，focused preset 也不是隔离单 Check。所有全量中的单项计时与代理计时都按上述口径标记，不用其比值冒充竞争系数。完整正式日志仍在对应 `.log/project-gate/`；报告只保留最小计时摘录、来源哈希和数值向量，不保存全部输出或可恢复的完整未提交源码快照。

## 调查结果与边界

### 正式全量运行

单位为毫秒；五行按实际执行顺序，均通过。

| 轮次 | outer wall | Gate elapsed | candidate preparation | adapter/setup | Product Run |
| --- | ---: | ---: | ---: | ---: | ---: |
| 1 | 21514.194 | 21243.9 | 172.1 | 386.2 | 20685.6 |
| 2 | 21643.672 | 21331.2 | 116.2 | 355.7 | 20859.3 |
| 3 | 19995.343 | 19687.8 | 116.4 | 358.5 | 19212.9 |
| 4 | 20427.854 | 20122.9 | 109.0 | 339.3 | 19674.6 |
| 5 | 22106.206 | 21782.6 | 124.9 | 406.5 | 21251.2 |

outer wall 中位数 **21514.194 ms**，观察范围 **19995.343–22106.206 ms**，相对中位数约 **0.929–1.028 倍**。这个 Run 级范围不能分摊为每个 Check 的随机幅度，也不能把各 Check duration 相加来重建并发 makespan。

### 单项隔离代理与全量中的同名单项

每类均为 5 样本。下表两组口径不同，只作并置观察，不作因果 A/B；单位为毫秒。

| 固定 Check profile 的校准来源 | 隔离代理 min / median / max | 全量中 core execution min / median / max | 隔离代理相对自身 median 范围 |
| --- | --- | --- | --- |
| typecheck-product-like | 341.841 / 356.199 / 384.565 | 331.709 / 740.793 / 1095.352 | 0.960–1.080 |
| typecheck-scripts-like | 353.968 / 357.398 / 419.722 | 442.152 / 579.498 / 638.829 | 0.990–1.174 |
| lint-product-like | 1106.781 / 1158.922 / 1636.350 | 1482.421 / 1674.461 / 1789.032 | 0.955–1.412 |
| lint-scripts-like | 732.513 / 830.416 / 1112.246 | 847.860 / 1169.944 / 1556.192 | 0.882–1.339 |

同一机器/代码下，不同 workload 的波动形状仍不同；未证明波动独立同分布、服从正态或均匀分布。所有 36 个实际 Check 的 core execution 五样本、min/median/max 与倍率向量均在 summary 资源中，摘录在 observations 中。几个与极端场景相关的额外观察如下：

| 实际 Check | 全量中 core execution min / median / max（ms） | 解释边界 |
| --- | --- | --- |
| prepared-external-package-consumer | 1124.791 / 1471.298 / 8077.291 | 首轮为自身五样本中位数的 5.490 倍；不能据此认定冷启动或竞争原因。 |
| duplicate-detection | 283.082 / 363.941 / 2029.592 | 首轮为 5.577 倍；完整保留，不裁剪进所谓日常噪声范围。 |
| tests-package-consumer-types | 5652.665 / 6794.305 / 7817.731 | 较长工作，不等于用户业务关键任务。 |
| markdown-link-validation | 4891.762 / 5725.068 / 6975.977 | 全量上下文中的执行时间，不是隔离成本。 |
| tests-scripts-validation | 4768.433 / 5640.975 / 6767.074 | 可能受本轮并发、缓存、history 顺序与宿主波动共同影响。 |

同一 candidate reuse 只说明 candidate 准备复用，不说明 external consumer、scanner 或 OS cache 都已热身。全量样本先于全部代理样本，未交错；叠加 wrapper/输出格式差异，不能用两个 median 的比值识别资源竞争，更不能由该比值确定 capacity/claim。

### 模拟 Check 的初始波动输入

**本轮建议采用四类独立、特征固定的 proxy-calibrated Check profile**。每类的名义时长取其隔离代理 median，只从该类的五个 `sample / median` 倍率中用固定 seed 等概率抽取；不设统一“±10%”，不在任务运行时切换 profile、资源声明、竞争特征或波动分布。精确值用 summary 中的未舍入向量：

| profile | 倍率向量（展示值） |
| --- | --- |
| typecheck-product-like | 1.000、1.080、1.058、0.960、0.976 |
| typecheck-scripts-like | 0.992、1.108、1.000、1.174、0.990 |
| lint-product-like | 0.986、0.955、1.412、1.150、1.000 |
| lint-scripts-like | 0.964、0.882、1.339、1.000、1.130 |

这只是四类合成任务的初始经验重采样方案，不是已经实现的配置、真实 Check 分布或总体边界。默认各任务独立抽样是简化假设，不是实测结论；可用明确的共同冲击场景检验该假设。seed 绑定场景、task 与 replicate，算法间共享外生输入，算法不得读取抽样真实值。

**另设固定的共享资源竞争型 Check 与长尾压力型 Check，不能把这些特征混入每个普通 Check。** 本轮未识别竞争系数，因此仅允许零/弱/强竞争的显式合成敏感性场景；具体参数须在平台 Plan 中标为实验假设。约 5.5 倍的首轮观察可作为独立慢任务压力场景的幅度线索，但不赋予重复概率，不命名为已证实的“冷启动型”或“竞争型”。模拟 running 集合变化时可按固定竞争函数更新速度，改变的是状态下的速度，不是 Check 的特征身份。

全量 core execution 向量只用于上下文回放/反例，不能当作无竞争的名义时长再叠加竞争减速，否则可能重复计算同一慢化。完整 Check 的 preflight、admitted-to-settled 与隔离基线尚不齐全，暂不把所有 Gate Check 参数化为“已标定”。

### 后续交接与重新调查条件

- [Gate 资源配置 Change](../../changes/configure-project-gate-named-resources/proposal.md)：调查显示应区分工作特征，但不足以选定资源 ID、units/capacity/claims。先取得同口径、可比隔离与重叠证据，再固定映射；不凭高方差直接限流。
- [虚拟测量平台 Change](../../changes/build-admission-simulation-workbench/proposal.md)：接入固定 profile 与经验向量；保持 legality、时间模型、随机源和策略可见信息分离。少量闭包 Check 只做真实集成，不能替代 Gate 单项时间校准。
- [算法 Change](../../changes/redesign-learned-admission-heuristic/proposal.md)：使用冻结场景与参数比较，主指标 makespan、资源占用次之；规则有依据且无明显退化即可，不承诺真实加速。完整单项计时/竞争参数缺口不通过扩大算法搜索解决。
- N=5 只描述本轮局部经验范围，不报告可靠 p95、置信区间、长期尾部概率、普适最优资源配置或加速结论。CPU/RSS 和宿主调度噪声未取得；外层 realtime 未校验时钟跳变，Gate 内部单调计时可作独立口径复核。
- Gate configuration、Check workload、candidate、工具/机器、缓存策略、history identity/model 或虚拟竞争模型发生变化后重采受影响部分；采用严格因果减速系数前，须用同一正式计时边界、明确单项采样入口、固定预测输入和配对/交错实验补证。本报告不新建 Gate selector 或公共测量 API。

## 随附资源

- [本轮采样脚本](./_resources/260908-calibrate-gate-duration-variation/measure.sh)
- [来源、时钟、状态与最小计时摘录](./_resources/260908-calibrate-gate-duration-variation/observations.json)
- [本轮日志统计脚本](./_resources/260908-calibrate-gate-duration-variation/summarize.py)
- [全部样本与经验倍率](./_resources/260908-calibrate-gate-duration-variation/summary.json)
