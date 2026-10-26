---
title: 用统一 patterns 与显式开关管理文件收集范围
id: 261010-unify-file-selection-with-default-excludes
status: active
alignment: aligned
createdAt: 2026-10-10T08:57:34Z
purpose: 统一文件范围表达，并以默认排除避免误扫依赖、构建和缓存路径
background: 双数组不是统一匹配的必要条件，单数组替换又可能丢失已有默认排除，需要独立的防呆开关
decision: 纯磁盘收集使用单份 patterns，固定默认排除默认启用，只有显式 useDefaultExcludes=false 才关闭
tags:
  - configuration
  - file-collection
  - glob
  - product-contract
  - project-files
relations:
  - type: 修订
    target: 261010-collect-project-files-only-from-filesystem
    summary: 保留纯磁盘边界，改用单数组并以显式开关关闭默认排除
---

## 目的

- 让收集、区域匹配与调试使用同一原生规则及匹配参数。
- 用默认防呆减少依赖、构建、生成物和缓存误扫，保留显式关闭的能力。
- 保持纯磁盘、同步按需收集及 Check 的输入与内容安全边界。

## 背景

- 前序已确认纯磁盘方向。单份 glob 数组足以表达用户范围，但整份替换可能丢失已有默认排除。
- 将默认防呆独立于用户规则，可以同时满足统一表达和显式控制。
- [公开指南](../guides/collecting-project-files.md)与[内部 owner](../development/project-files.md)拥有收集契约与机制，
  [Core 指南](../guides/file-region-index.md)和[调试指南](../guides/debugging-change-flags.md)拥有各自消费边界。
  本记录保留统一规则与独立防呆层的选择理由；完整方向的对齐核对覆盖实现、材料和安装后验收。

## 决策

- 采用: **磁盘候选。** 枚举显式 project root 下的普通文件，不跟随文件或目录 symlink；
  子仓库按普通目录和范围访问。收集不发现、解析或转换 ignore 规则，不查询 Git；
  tracked/untracked/changed、index、HEAD 或仓库身份均不影响候选。ignore 文件本身可作为普通文件入选，
  默认按名称排除 VCS 目录仅是路径规则。
- 采用: **统一用户规则。** selection 使用一份 `patterns` 数组，完整正/负列表按选定后端的原生语义解释，
  不自建顺序覆盖语言。候选相对 root、使用 `/`，点号路径参与显式匹配；
  collection、按规则计算的 Core、Run regions 与调试使用同一 grammar 和匹配参数。
- 采用: **默认防呆。** boolean `useDefaultExcludes` 省略或 `true` 都启用固定默认数组，仅 `false` 关闭，
  其它类型拒绝。有效范围为用户列表匹配结果减去启用的默认排除；替换、包含、重新包含或排列 patterns
  都不能绕过该层。关闭只移除默认数组，用户负 pattern、Check eligibility 与内容安全仍然生效。
- 采用: **默认数组。** 以决策形成时旧 `defaultProjectFileSelection.exclude` 的 VCS/Product state、dependencies、
  build/generated、cache、coverage、log、temporary 和 virtual-environment 项为迁移基线，维护固定、冻结的普通 glob 数组。
  精确列表归产品默认值与公开说明，不读取配置或目录内容动态生成，也不自动扩大到 archive/historical 或业务目录。
  默认数组整体由开关控制，项目自有规则写入 patterns，不增加逐项默认豁免或另一份用户 exclude。
- 采用: **输入与结果。** 保留同步单份 `collectProjectFiles({ projectRoot, selection })`。
  公开调用显式给出 root 与 patterns；Check constructor 物化省略的 patterns，显式数组替换该默认，
  空数组选择空集合。closed、descriptor-safe 校验形成 detached snapshot；`projectRoot` 非空且无 NUL，
  相对值从调用时工作目录解析，空 patterns 仍验证 root 可用性。
  非法输入抛 TypeError，必要读取失败抛带路径上下文的 Error；合法空结果返回冻结空数组。
  结果为相对 root 的 `/` 路径，稳定排序、去重并冻结，不承诺返回后存在性、内容可读性、原子文件系统快照或 sandbox。
- 采用: **剪枝与共享。** 读取子树前检查本次共享候选的全部 selections 和各自开关，只有全部无需求才剪枝，
  无法证明时保留访问。关闭默认排除且仍需该目录的选择不能被其它选择全局剪掉；
  最终每份选择应用完整 matcher 与自己的默认状态。候选共享限于 Check 本次操作；
  公开工具保持同步单份协议，不增加命名批量集合、Map、异步或 AbortSignal，
  也不增加 Product-wide file context、provider、跨 Check hidden cache、watcher 或 invocation barrier。
- 采用: **消费责任。** Check 保留领域策略、accepted/rejected、安全读取、阈值、Finding、Record、exact inputs 与结算。
  Run 保留 Git baseline、rename/delete、unavailable 和变更事实；扫描默认排除不隐式缩减 Run changed paths 或 Core 显式输入。
  Core 按[索引决策](provide-readonly-file-region-index.md)无 I/O 地建立关系，实际成员保持来源筛选。
  调试报告保留所选 root、patterns、开关生效值和实际默认排除项，区分未收集路径与零命中。
- 采用: **整体迁移。** 一起迁移 types、closed validators、默认值、constructors、Check/Gate 配置、Run regions、
  指南、示例、changelog 与安装后消费者。旧 `source`、`include`、`exclude` 明确拒绝，不保留 alias、双读、旧 matcher 或隐式映射；
  逐项审查旧配置的实际含义，关闭默认排除不代替迁移。具体库、版本、剪枝正确性和性能收益由接入证据决定。
