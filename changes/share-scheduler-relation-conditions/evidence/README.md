# Shared-condition candidate evidence：不采用

2026-10-17，本轮真实生产候选 B1 和一轮有界修正 B2 均不采用，停止调参。root 已恢复 Product、稳定 Scheduler owner 和 Case；本目录只保存可恢复候选及形成时证据，不定义当前产品规则。恢复后的完整 Gate 已通过 43/43，包含 dependency/入口及安装验收。

## 阅读入口与边界

| 材料 | 作用 |
| --- | --- |
| [B1](b1/README.md) | 独立正确性审查及优化后的完整候选；完整 timing、计数、内存、独立 profiles。 |
| [B2](b2/README.md) | 有界修正；局部正确性、语义、停走小矩阵和最小内存，不是完整验收。 |
| [候选可恢复性证明](restoration-verification.json) | 分别从 c45 基线应用完整补丁，runtime 全量 inventory 逐字相等，4 个新文件均包含；不是当前工作区基线恢复的执行记录。 |
| [已执行的基线恢复清单](b2/restore-targets.json) | root 已恢复的 18 个 tracked paths 和删除的 4 个本轮 untracked paths；不含 Change 或无关工作。 |
| `frozen-inputs.sha256` | 非 Markdown 输入、结果、补丁、原始 profile 压缩包与恢复证明的 SHA；说明文档可继续审阅，不改冻结数据。 |

## 采用判断

exact 共享确有结构性 source-write 减少，B2 在部分 exact Core 轨迹取得收益，retained snapshots 也可更小。
但 A+Bi、unique 和 deep 的 N1024 完整 total 仍明显回退；真实 public Run 的 exact 收益弱或接近持平，A+Bi 仍回退；
factored/unique/deep 的保留内存增加。大图净成本和新增维护责任不足以支持采用，不以局部计数或既有投入覆盖。
结论仅拒绝本轮实现，不宣称所有共享策略不可能，也不要求每个小图或每个 benchmark 都更快。

## 身份与验证范围

固定 A 为 Git `c45e549971813d7a01a89c89e75975b0530f1eb4`。B1/B2 各自 `identity.json` 记录补丁 SHA，
`build-manifest.json` 记录实际 bundle SHA；`source-A.sha256` / `source-B.sha256` 比较相同范围的全部 src 非 `*.test.ts` 字节。
该 runtime inventory 范围与原始 780-file Product identity 不同，不能把两种 digest 混用。测试、owner 和 Case 则包含在候选补丁中。

正式 runtime 为已安装的项目锁定工具：
`/home/dev/.local/share/mise/installs/node/24.18.0/bin/node`、
`/home/dev/.local/share/mise/installs/bun/1.3.14/bin/bun`。
Bun 输出的 `process.version=v24.3.0` 是内嵌 Node 兼容版本，不是另一个 Node timing。
每轮 A/B 在同 runtime、输入和窗口内比较；不得横比 B1 完整矩阵与 B2 小矩阵的绝对数。

B1 完成独立正确性审查、最终候选代码/文档优化及其 delta 复核；B2 仅完成局部测试/type/lint/Case 和双 runtime 214-cohort 差分。
B2 **未跑完整矩阵、独立 profile、独立产品审查、最终候选优化或完整 Gate**。
最终完整 Gate 和安装验收针对恢复后的实际保留 tree，不是 B2 采用验收。实际命令、candidate 和本地日志入口见 [Tasks](../tasks.md#validation-notes)。机械 Change 检查也不等于产品验收。

## 复现入口

先只读核对冻结材料：在本目录执行 `sha256sum -c frozen-inputs.sha256`。该清单不含可继续编辑的 Markdown。
补丁当前无损封装为各轮 `candidate.patch.gz`，复现先在隔离目录解压回 `candidate.patch`；`identity.json` 和恢复证明仍指解压后的原始 bytes。
`patch-compression-manifest.json` 记录原始/压缩 SHA 与 bytes；其余 56 项冻结输入不变，当前物理载体清单共 59 项。
需要重建候选时，先取得独立工作区及测量窗口的使用授权，再按各轮 README 操作：

1. B1/B2 的 `candidate.patch` 各自都是相对 c45 的完整补丁，包含 4 个新文件；B2 不是 B1 的增量补丁，不能叠加应用。
2. 在独立、已确认可覆盖的 c45 工作区检查并应用所选补丁；不要改写已恢复的当前 Product 或覆盖未知改动。
3. 将所选轮的 runner 复制到该工作区的 `tmp/scheduler-shared-condition-implementation` 后，从该工作区根运行其 `build.ts`。runner 按自身位置读取 bundle 并写结果，不能直接在本冻结证据目录运行。
4. 使用上节锁定工具和各轮声明的 suite；输出留在隔离 tmp，不覆盖冻结证据。计时与语义/计数/内存/profile 分开，正式计时重新协调独占窗口；不因有复现入口而自动重启本轮已停止的调参。

## 恢复与生命周期

**实际基线恢复已完成：** root 按 B2 完整补丁与恢复清单匹配路径，reverse-check/apply 后确认本轮目标恢复；非 Markdown 冻结证据的 58 项 SHA 核对通过。
文档收尾阶段只读确认 `src`、稳定 Scheduler owner 与 Case 相对 HEAD 无 diff，4 个本轮新增文件均不存在。随后完整 Gate 通过；文件恢复、候选可恢复性和恢复后产品验收是三个不同证据。

**候选可恢复性另有证明：** 实际执行的核对脚本为 `verify-restoration.py`，使用新建非 Git scratch tree、dry-run + apply，再比较完整 inventory。
核对后只移除本轮生成且已核对的 scratch 测试副本，避免 Bun substring discovery 污染；真实源码仍保留在补丁中。
该脚本保留形成时的绝对工作区路径并会写 `restoration-verification.json`；如需重验，先复制并调整副本的工作区/输出位置，不直接运行或改写此处冻结输入和证明。

file-lifecycle-hygiene：形成及状态确认日期为 2026-10-17 UTC。本目录随活动 Change 保留本轮候选、证据和复现输入；
不进入 src、发布包或测试发现，不修改历史报告。临时 bundle、基线及恢复核对树在 `tmp/scheduler-shared-condition-implementation`，
只作本轮隔离工作物；其余未知 tmp 不动。无 Change finalize/delete 授权。
