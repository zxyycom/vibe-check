---
title: "Change flag 调试工具接口与验收 Readiness"
id: "261011-change-flag-debugging-readiness"
formedAt: "2026-10-11T10:53:56Z"
question: "如何仅消费已验收公共能力，交付完整当前文件全集的 change flag 调试结果？"
tags:
  - "package-tools"
  - "product-contract"
  - "project-files"
relations: []
---

## 形成时背景

`add-change-flag-debugging` Plan 需要查看所选当前文件的零/单/多命中，而 Run evidence 仅含命中的实际变更路径。
本轮在干净分支 `codex/add-change-flag-debugging`、HEAD `41600617` 开展；2026-10-11 实际执行
`git merge-base --is-ancestor 2b2489cf HEAD` 与 `git merge-base --is-ancestor 7302349e HEAD`，两项均退出 0。
上游已验收实现已经进入实施基线，不以未提交工作树代替继承。起点完整 Case 检查为 680 实体/169 Case。

## 调查目的

收敛一个无需 Run/Check 的同步 Non-core 入口：完整保留当前所选全集，按公共 change token 双向查询，
提供可恢复范围元数据和按需纯 formatter，并固定相邻与安装后验收边界。公共能力不足时先报告缺口，不复制 private engine。

## 调查范围与依据

实际读取 AGENTS、navigation、完整 coding-style、当前三份 Change artifacts、collection/Core 公开指南及源码、
API mechanics change regions、project-changes closed parser、changeFlag、package-tools 和公共符号依赖规则、
文档/包 registries、测试策略与 Case owner、两条 effective flags/按需收集 Decision。
源码优先 CodeGraph node；该服务器不提供 explore，未收录路径和 docs/config 以 scoped 文件读取补足。
版本依据为 HEAD `41600617`；本报告是调试工具接口调查，不是对上游已验收能力的独立复查，因此 relations 为空。
同轮补充实施、独立正确性审查和最终优化证据；各结果以实际取得时点区分，不回填为 Readiness 起点事实。

## 调查结果与边界

### 接口选择与责任依据

公共能力足以兑现目标，没有新增依赖或 private engine 缺口。
采用 package root 的同步 `debugChangeFlags({ projectRoot, selection, regions })` 和按需
`formatChangeFlagDebugReport(report)`；regions 可直接传 Definition `changes.flags`。
完整输入、字段、双向查询、排序和失败契约已经交给[调试指南](../guides/debugging-change-flags.md)，
内部职责交给[随包工具 owner](../development/package-tools.md)。本报告保存选择依据与实际验收，不成为第二份规范。

公开依赖只有 `snapshotExactClosedRecord`、`snapshotClosedArray`、`createProjectFileRegionIndex`、
`collectProjectFiles`、`DEFAULT_PROJECT_FILE_EXCLUDES`、`changeFlag` 及公开 types；宿主仅 node:path resolve。
动态 region 字段表先用反射获取，再由公共 exact snapshot 验证 descriptor-safe closed 外层；不调用 getters。
selection 外层/数组固定并做 string/boolean 类型收窄后，将完整选择语义交给 collector；regions 转为 Core patterns regions，Core 验证非空 ID/patterns。
先构造无文件规则视图验证规则，收集后 `appendSources({ fileSources: [paths] })` 得到本次唯一用于查询/格式化的关系视图；不复制 matcher。
collector 仍拥有 root/selection 校验与普通 filesystem Error，合法空全集不被转换为失败。
映射只来自 collection 的完整 filePaths，而非 regions 并集，因而零命中不会消失。
token 只通过 changeFlag 投影，不改 Run/effective flags。region ID 保留任意非空字符串（包括 U+0000、`__proto__`），
不借用路径的字符限制；文件路径仍由 Core 拒绝 NUL 等非法 normalized relative path。

每次入口重新收集与重建；本次结果查询和 formatter 不再访问文件系统、Git、配置或输出设施。
formatter 返回含 scope、逐文件数量/flags、逐区域文件的中文文本，路径/ID 用 JSON 转义避免控制字符伪造行；
不是新机器协议，不自动打印、写文件、分享。它只消费本工具返回的报告。

### 本轮实施探索与阶段验收

2026-10-11 已实现入口、两项 public types、formatter 与中文指南/受管示例。输入没有借助私有 validator：
工具只检查自身 closed grammar 与最低字段类型，root 非空/no-NUL、选择和 filesystem 仍交给公共 collector，
region 非空 ID/patterns 与匹配交给 Core。最终一个关系视图同时生成 files、regions 与查询；未把 region 并集当全集。

初次工程校验暴露 consumer glue 的 TypeScript 类型收窄与工具边界 lint 要求，已改为显式 string/boolean checks；
示例 JSDoc 不能出现 `*/`，故 root 临时 fixture 的 selection 用 `*`（示例只创建根文件），不改变 matcher grammar。
文档操作还须登记 NON_CHECK_OPERATIONS，避免将新工具误分类成 Check；已补齐两项注册。

首次完整 Gate candidate `0.0.0-local.e9768767551f` 为 41/43：测试单文件超过 300 code lines，
且新增文档插在 registry 首位使既有 README-first 测试失效。
按证明边界拆出 `.boundary.test.ts` 与共用 `.test-support.ts`、更新原 Case entity 路径（目的和 ID 保留），
并将新增 guide 置于既有列表末尾；没有门限豁免、测试目的拆分或放宽 validator。
修正后的完整 Gate 通过 43/43。随后将“无自动输出”的封锁提前到入口调用前，并补充 getter 调用计数为零断言，
避免仅靠 getter 抛错被 helper 捕获而误证明“不调用”；原 Case 目的不变。
这些修正后的完整 Gate candidate 为 `0.0.0-local.4155a7c5b518`，43/43、27.6s，日志
`.log/project-gate/2026-10-11T11-07-00.745Z-1234657-a7c9431f-35aa-4d98-92ca-c36fc6fdac15`。

主线程随后汇合非实施代理的独立正确性审查，确认无 blocker；安装后 Node 独立探针验证特殊 path/ID、零命中、
reverse 查询与转义。该证据由主线程交接，不冒称为优化代理亲自运行。

### 最终优化与交付边界

独立优化依据 ai-ready-docs 与完整编码规范：收敛指南的重复负向说明，明确结果数组排序而 patterns 保留原规则顺序，
区分公开契约与内部实现 owner，压缩本报告的重复接口与逐次运行流水；保留上游继承、工程失败及修正原因。
协调入口转向稳定能力 owner，文件范围 Decision 消除未实现与旧 default.exclude 的当前时叙述，保留形成时基线和取舍。
代码的 closed snapshot、Core 验证、磁盘收集、关系追加与 token 投影责任连续可见，没有具体规范问题，故不为风格重构。

代表性阅读恢复由优化代理从最终指南与 owner 路径核对：规则数组保留顺序而结果排序；
零命中 `[]`、未收集 `undefined` 与非法路径失败分离；每次重新调用刷新、旧报告查询无 I/O；
任意非空 ID 与受限制文件路径不混用。读者可从公开指南完成消费，不依赖本报告或待删 Change。

随包材料冻结后，优化代理实际运行 `mise exec -- bun run check -- --all`，最终 candidate
`0.0.0-local.af431b9f93b1` 通过 43/43，27.4s；日志为
`.log/project-gate/2026-10-11T11-15-59.916Z-1243969-ea395481-628c-40e0-9eae-751835a55ad6`。
该 Gate 覆盖同候选安装后的 artifact/types/documentation/runtime、Product/脚本类型与 lint、两向依赖、
format、全部行为、材料与 Case。锁定宿主实际为 Bun 1.3.14、Node v24.18.0；
`mise exec -- bun run package:status` 确认为 current，tarball 为
`build/artifacts/zxyycom-vibe-check-0.0.0-local.af431b9f93b1.tgz`，安装入口为
`scripts/project/node_modules/@zxyycom/vibe-check/index.mjs`。
独立运行相邻测试 6/6、docs:api、validate、Case 全树 686 实体/173 Case（15 topics）、Decision、Investigation、
Change 与 diff 检查均通过；两上游 ancestry 再核对均为 0。其后仅更新治理证据，不修改产品或随包材料。
Git 保存、Decision alignment 与 Change 结项由主线程随后执行。
当前文件可能缺删除/rename 旧路径；假想映射不证明实际 Git delta、effective flags、Check 覆盖、返回后的存在性或原子快照。
未运行 routine 外的 package:candidate:integration 物理生命周期专项目标（本项未改变 build/install/receipt 机制），
没有性能 benchmark 或优化收益结论，也未执行正式发布。完整 Gate 证明现有候选消费边界，不替代这些独立义务。
