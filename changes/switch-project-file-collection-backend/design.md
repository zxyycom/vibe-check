# Design

本 Plan 将纯磁盘文件范围落到同步枚举、进入前剪枝与完整迁移。Readiness、实施、独立正确性复核与最终优化验证已完成；可提交验收快照待协调者保存，证据由 tasks 跟踪。

## Context

- [文件范围决策](../../docs/decisions/unify-file-selection-with-default-excludes.md)拥有长期方向；
  [公开指南](../../docs/guides/collecting-project-files.md)与[内部 owner](../../docs/development/project-files.md)拥有本次迁移后的当前契约和机制。
- [后端选型](../../docs/investigations/compare-node-file-collection-backends.md)提出 fast-glob 候选；
  [职责调查](../../docs/investigations/fast-glob-git-collection-boundaries.md)证明最终过滤前仍会访问被排除子树。
  两份调查保存形成时认识，本轮实际接入、迁移和修正证据由[Readiness 报告](../../docs/investigations/project-file-collection-readiness.md)承接。
- [按需收集](../../docs/decisions/retain-on-demand-project-file-collection.md)约束调用与 Check 内共享；
  [0.0.x 策略](../../docs/decisions/keep-prestable-package-releases-on-0-0-x.md)要求完整迁移而非兼容期。
- 包验收遵守[最低宿主](../../docs/decisions/treat-node-engine-as-a-minimum-version.md) Node >=24.18；
  Bun 源树诊断另记实际版本。与索引、调试的合入边界见[Change 协调](../../docs/governance/change-coordination.md#文件关系与-change-flag-调试)。

## Goals / Non-Goals

### Goals

- 在进入无需求子树前控制访问范围，保持可信失败和稳定路径结果。
- 用统一原生规则与默认防呆范围驱动枚举、匹配和共享候选。
- 一起验收后端、公共输入、共同消费者与包材料迁移。

### Non-Goals

- 收集负责普通文件路径；内容安全、eligibility、阈值、Finding、Record 与结算归 owning Check。
- Run 拥有 Git 变更事实；收集采用纯 filesystem，不解释 ignore 或查询追踪状态。
- [Core 索引](../add-project-file-membership-queries/design.md)组合已提供的来源数据，
  [调试工具](../add-change-flag-debugging/design.md)消费公共能力；本项保持按需收集和 Check 内共享。

## Decisions

### Intended Change

#### 收集接口与范围

目标接口保持同步单份 `collectProjectFiles({ projectRoot, selection })`，
selection 为 `{ patterns, useDefaultExcludes?: boolean }`，完整校验与失败契约见文件范围决策。

有效范围为用户 patterns 的匹配结果，减去启用时的固定默认排除：

- 公开调用显式提供 root 与 patterns；Check constructor 物化省略的 patterns，显式数组替换该默认。
- 开关省略或 `true` 启用默认排除，只有 `false` 关闭；用户包含规则不能绕过这层防呆。
- 默认数组沿用当前公共基线，项目自有排除保留在用户负 patterns 中；关闭只移除默认数组。
- 枚举普通文件，不跟随文件或目录 symlink；子仓库按普通目录处理。内容安全仍由 Check 验证。

#### 后端与剪枝

| 职责 | 本次接入与边界 |
| --- | --- |
| 同步枚举 | fast-glob 3.3.3 加薄适配，覆盖 task base、静态正 pattern、root/base symlink 与 ENOENT 顺序。 |
| 纯匹配 | micromatch 4.0.8 整体解释完整正/负列表；collection 与 Run 共用参数，后续 Core/debug 须继承此边界。 |

[接入报告](../../docs/investigations/project-file-collection-readiness.md)核定 fast-glob 3.3.3 仅枚举正候选 superset，micromatch 4.0.8 整体解释完整列表。共同参数与安全剪枝范围见该报告；不得把 fast-glob 的负规则优先算法代替原生 micromatch 列表语义。剪枝根据本次共享候选的全部 selections 及各自开关决定：
只有全部无需求才跳过，无法证明时继续访问。task base、静态正 pattern 与子目录入口均须遵守；
某 selection 关闭默认排除且需要目录时，其它 selection 的默认排除不能全局剪掉它。
最终每份选择仍使用完整 matcher 和自己的默认排除状态。

#### 契约迁移

一次迁移公共 `source`、`include`、`exclude` 到新 selection，旧字段由 closed validation 明确拒绝。
退出收集专用 `ls-files`、子仓库递归获取、source 类型与分组接线；
先审计共享 Git helper 调用者，保留其它 owner 的使用。

现有公共默认排除移入固定数组，repository-owned archive/historical 及领域规则改用用户负 patterns。
逐项审查旧配置的匹配含义和候选集合变化；原 Git 收集与新磁盘结果不承诺等价，
默认开关也不代替这些配置迁移。

### Resulting Impacts

- **Product 接线**：同步 types、closed validators、默认值、Check constructors、workspace Gate 和 Run regions。
  Run 的 baseline、rename/delete、unavailable 与 Git 变更获取保持原义；
  扫描默认排除不隐式缩减 Run changed paths 或 Core 显式输入。
- **依赖与材料**：用 pnpm 维护依赖、lockfile、许可与发布清单；同步公开指南、示例、内部 owner、
  changelog 与 Case，证明支持宿主上的安装后消费。

验收按[文档导航](../../docs/navigation.md#交付验证)覆盖：

| 边界 | 证明内容 |
| --- | --- |
| 访问与失败 | root 缺失/不可读、空 patterns、范围外/范围内失败、目录消失、excluded task base、静态正 pattern 和多 selection 重叠；稳定结果及 exact-input handoff。 |
| 默认防呆 | 开关 omitted/true/false 及非法类型，宽/窄 patterns、用户负 pattern、包含/重新包含默认排除路径；固定数组修改隔离及混合开关下的剪枝与独立结果。 |
| Git 独立性 | 相同磁盘与 selection 在 Git 可用、不可用及非仓库目录中结果一致，收集零 Git 调用；ignore/追踪状态不改变其它候选，ignore 文件本身按普通路径处理。 |
| 链接与内容 | root/base、静态 pattern、文件/目录链接及断链符合 no-follow；选中路径仍服从 owning Check 的内容安全。 |
| 匹配与迁移 | 完整正/负列表、dot、brace/extglob 的共同匹配；旧字段拒绝、显式路径范围保持、公开材料与安装后 Node consumer。 |
| 成本 | 同一 filesystem workload 对比访问次数、耗时与内存；Git 到磁盘的候选变化另作迁移验收，局部 trace 不替代端到端证据。 |

实施时运行最窄 collection/matcher/changes/Check tests、typecheck/lint/dependency 校验、
文档与 Case 检查，再按跨边界和包改动升级到对应 Gate。

## Risks / Trade-offs

- fast-glob 默认忽略 ENOENT，task base 也可能先 stat；薄适配须证明剪枝和可信失败。
  若需重建递归引擎才能满足契约，应重新选择后端。
- 磁盘中被 Git 忽略的普通文件可能入选，子仓库、链接和 index/磁盘差异会改变候选；
  外部 Git 来源用量未知，须通过显式迁移与消费者证据处理。
- 默认数组按路径名防呆，同名业务目录也可能被排除；调用方可关闭该层并自行配置负 patterns。
  收集不是内容安全沙箱，单一后端也不自动证明更低成本。

## Open Questions

无已知待用户决定项。库/版本、普通校验和适配路径由下述 Readiness 调查核定；
不能满足已确认公开契约时，不把后端默认行为当作产品例外。

## Readiness 与交付交接

[接入报告](../../docs/investigations/project-file-collection-readiness.md)已闭合最低 Node/Bun 探针、迁移与共享 Git helper 清单、共同参数和同 filesystem 成本方法，支持薄适配进入完整迁移。随后独立审查发现的 `./` 候选拼写与有损 byte 身份问题已修复并通过复核；两宿主的单次 byte readdir 与 Bun lazy lstat bridge 属于必要身份边界，不以有损 string 读取降低成本。

稳定规则归[公开指南](../../docs/guides/collecting-project-files.md)和[内部 owner](../../docs/development/project-files.md)，形成时证据归报告，最终验证状态归 tasks。本 Change 不实现 Core/debug，也不将两条 Decision 标为完整对齐。完成迁移和最终验收后，由协调者保存稳定提交；Core/debug 实施基线须实际继承该提交，未提交工作树或 Readiness 通过不解除依赖。
