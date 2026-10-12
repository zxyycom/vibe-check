# 规范复核与当前复现入口

本目录保存本轮文档、代码规范复核及增量验证。产品整改已提交为 `435eb4dce09b65f1ef50b6139b20d54b8a53a738`；此前 37 行性能证据仍绑定原 after-final，不改写为当前源码的重新测量。
新版 helper 是当前复现入口；上一层原档案用于精确重放形成时过程，两者身份分别保存。

## 改动与规范依据

审查以完整[编码规范](../../../../docs/development/coding-style.md)为准，覆盖本批 14 个产品文件、12 个测试/支持文件，以及测量、模板、Shell、Python 和本轮新增转换/验证代码；相邻代码只用于恢复调用事实。

| 对象 | 最小处理与依据 |
| --- | --- |
| 产品 | 按 §6.1.4 删除 `matchesFlagEnablement` 的纯转发层，直接调用条件匹配器；条件、依赖闭包、错误和顺序不变。其它产品与测试无需规范整改。 |
| Workload 模板及生成物 | 按 §6.1–6.3 将 fixture 构造、图准备、history 和 IO 划为具名局部阶段，以字段表达 descriptor；保留登记顺序及计时 invoke。旧 `add` 拥有 push 副作用，问题不是无责任转发。 |
| 审计与转换代码 | Python 以具名阶段恢复源码、档案、输出与统计责任，显式绑定原 after-final；四个转换/验证 TS 补齐 `unknown` 输入收窄和完整静态检查。原计时循环与汇总器保持不变。 |
| 文档 | 采用结论、owner 和当前阅读路径前置；压缩重复统计和过程史，修正 history 索引的生命周期摘要，保留小输入成本、E1 和授权边界。 |

## 已执行验证

- 产品自验：14 项 flags/control/closure 测试、product typecheck/lint/format 通过；完整 [Gate](gate-all.txt) 为 **43/43、exit 0**，candidate `0.0.0-local.dbb0d18d75a0`，包含 package artifact 与外部 consumer。elapsed 38.3 s；mean 2,272.4 ms、p95 7,064.7 ms 超 advisory，不作为本批性能收益。
- [辅助静态复验](helper-validation.txt)：13 个 harness TS 和 4 个转换/验证 TS 使用同一 strict、type-aware lint、format；5 个 Shell 语法检查通过。初次把 pnpm shell shim 当 Bun 源码运行而失败，见 [attempt-1](helper-validation-attempt-1.txt)；改用 `bun run tsgo` 后通过，未改规则。
- 等价证明：18 组 descriptor 表达式及 timed invoke、模板展开、原双侧与当前源码的 37 行完整 smoke 输出/元数据通过；旧 raw 汇总 JSON/stdout 和新旧审计 44 行 stdout 逐字一致。smoke 的时间值仅证明执行，不作性能结果。
- 非实施代理分别复核[文档与产品增量](independent-doc-and-flags-review.md)及[辅助代码与证据](independent-helper-review.md)；具体独立执行与未执行项以报告为准。最终归档、交付页的状态与引用由主线程核对，未另作独立归档审查。
- 归档后的 validate、Case、15 个 Change、format 与 diff 检查通过；材料 Gate 的 7 个所选 Check 通过，36 个未选择。五个新档案逐文件与输入匹配，当前 src 及原三组 SHA 核对通过，见 `delivery-validation.txt`。

## flags 增量成本观察

仅比较旧优化后源码 `e44e06d4` 与当前 `435eb4dc`，不是原优化 baseline `b3c8fec`。固定 Bun 1.3.14 / Node 24.18.0，静默窗口为 2026-10-12 08:27:57–08:27:59 UTC；五对交错独立进程，每行每进程原 300/8 次迭代、三批 warmup、七批计时，保留全部 140 个样本。

| flags 数 | pooled before → after（ms/call） | pooled A/B | 五对 ratio 中位数 | after 更慢对数 |
| --- | --- | --- | --- | --- |
| 8 | 0.005900 → 0.005486 | 0.9298 | 1.0106 | 3/5 |
| 512 | 0.343614 → 0.335662 | 0.9769 | 0.9685 | 2/5 |

完整分布见 [flags-summary.json](flags-summary.json)。配对方向混合、after 最大值也有上升；这些微观观察不证明新增提速或无回退。未重跑其余 35 行正式计时、Run 端到端或内存测量；本轮采用理由是消除无独立责任的间接层。

## 材料与身份

| 材料 | 用途 |
| --- | --- |
| `helper-source.tar.gz`、[helper-sha256.txt](helper-sha256.txt) | 当前 `harness/` 与 `audit-evidence.py`，共 25 文件；清单 SHA 为 `4145d5eba32bbd448df9d8d4c1b505783c1c48691520df730090f769dcc22299`。 |
| [src-sha256-relative.txt](src-sha256-relative.txt) | 当前 722 个 src 文件，清单 SHA 为 `5a5103d61d15cdbd353a21993fcdf16802c5c8e6d0bc06a8aabd312366c066bf`；与原 after-final 仅 `flag-controls.ts` 不同。 |
| `raw-flags.tar.gz` | 十个进程的全部样本、stdout/stderr、顺序、窗口及汇总；无排除或重采。 |
| `equivalence-and-validation.tar.gz` | 三组 37 行 smoke、旧统计与审计对照，以及实施代理实际保存的检查输出。 |
| `conversion-sources.tar.gz` | 四个一次性转换/验证 TS、统计复核 Python、配置及来源 SHA；保存形成过程，不是生成当前 helper 的执行前提。 |
| `independent-audit.tar.gz` | 非实施 reviewer 的独立审计脚本和实际执行日志；与实施自验分开。 |
| [archive-members.txt](archive-members.txt)、[artifact-sha256.txt](artifact-sha256.txt) | 本组档案成员及文件完整性；总清单排除自身，不改变原 44/10/16 组三份清单。 |

## 复现

1. 在独立临时目录解包 helper，先按 `helper-sha256.txt` 验证原字节；用只读 `git archive <commit> src` 建立同级 source roots：`before/` 为 `b3c8fec`，`after-final/` 与 `style-before/` 为 `e44e06d4`，`style-after/` 为 `435eb4dc`。逐文件核对原/当前 src 清单；`c05-candidate/` 从 before 加原 C05 patch 重建，详见[原复现说明](../README.md#reconstruct-and-replay-workspace-bound-not-fully-portable)。
2. 为独立源码根提供 ESM manifest 和匹配工作区的现有依赖。配置、脚本和 Python `AuditPaths` 绑定形成时路径，迁移时只在副本适配显式路径；保留固定 runtime、全部 strict/lint 规则。Python 的 source 指向原 after-final，raw 指向解包的原 37 行材料及原 helper；不能以当前 source 替换旧 SHA 对象。
3. 用[静态复验日志](helper-validation.txt)中的 `mise exec -- bun run tsgo/oxlint/oxfmt` 命令检查副本；先运行 `harness/measure.ts` 的 before/after smoke 与 `harness/measure-style.ts` 的 before/after smoke，再用 `verify-parity.ts` 核对完整输出。原 E1 计时解释继续适用，见[阅读入口](../reading-guide.md#组合-workload-的计时澄清e1)。
4. 核对原归档统计时，运行新版 `audit-evidence.py` 或对解包的原 raw 运行 `summarize.ts`；无需重新计时。需要重新测量时，原 37 行使用 `run-comparison.sh`，本轮两行使用 `run-style-flags.sh`；两者只在静默窗口创建全新的结果 namespace，分别解释 source 身份。

本组是当前 Change 的交接材料；不新增常驻 benchmark、依赖或发布内容。临时根 `/tmp/vibe-low-risk-style.9xQguq` 与 `/tmp/vibe-low-risk-style-validation.yYB1KC` 保留至本组归档、独立复核及提交完成后再按精确目标清理；旧辅助根仍按[验收交接](../../acceptance.md#下一动作与交接边界)处理。
