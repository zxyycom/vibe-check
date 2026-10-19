# Design

在使用者实际查看的声明位置补足关键事实，复杂规则引用已有随包专题，并以重新构建的包独立复核。

## Context

本 Change 从 main 的 `b83e21c3` 开始，初始工作区干净。前轮三个 `gpt-6.1-sol` 审查者分别覆盖核心 60、随包 Check 115、调度与工具 52 个根导出及必要辅助类型；installed 声明与 tarball 的 374 项文件比对一致。用户授权修复全部发现并再次独立复核，用户 Markdown 已另行审过。

## Goals / Non-Goals

目标是让局部 JSDoc 可恢复输入、默认值、结果、失败与安全边界，并能进入对应指南。只改注释和本次实施记录；不重写指南、改变类型或运行时，不用固定短语测试代替语义判断。

## Decisions

### Intended Change

- 三个实施切面按源码 owner 互斥写入。核心由主代理负责，其余分别由 Check 与调度工具实施代理负责；原审查者保持只读，复核重新生成的实际包。
- 必要条件直接写在字段、函数或回调处；较长协议通过带真实章节锚点的 Markdown 链接或 `@see` 展开。源码与 types 镜像深度下均须能定位随包指南。
- 两个无法解析的 symbol links 改为可访问的公开说明引用，避免仅为注释引入运行时依赖。保留受管 `@example` 尾部。

### Resulting Impacts

- 基于已确认的文档审查与中文叙述 Decision 落实既有规则，不新增长期方向或修改 Decision 生命周期。
- 用非注释 AST 对照确认行为与签名不变，再运行投影、材料、Case 与 package/Gate 验收。
- 记录新包版本、摘要、查看位置和 `Manual CR:` 结论，分别保存机械与语义证据。

## Risks / Trade-offs

过度扩写会形成第二份指南，过度压缩又会隐藏关键限制。局部说明以直接影响合法调用、错误解释或安全选型的事实为限，引用负责细节；相对路径和章节必须在实际生成声明中复核。

## Open Questions

无。当前授权包含注释整理、本地包验证、独立审查与 Git 提交；提交沿用已启用的有界自动推送 hook，不主动另行推送。正式发布与 Change 删除不在本次范围内。

## Implementation Observations

### 首轮修正与实际包

- 26 个源码文件仅修改 JSDoc。以 TypeScript parser/printer 移除注释后比较 HEAD 与工作区，26/26 非注释结构一致；类型、运行时和受管示例未改动。
- 核心 8 项、Check 7 项、调度工具 7 项均补足直接影响合法调用、结果解释或安全选型的事实；完整协议仍由既有公开指南拥有。
- `package:build` 重建并安装候选 `0.0.0-local.3d586a03e541`。tarball 为 `build/artifacts/zxyycom-vibe-check-0.0.0-local.3d586a03e541.tgz`，SHA256 为 `1e1d67f133fa167f405e4a7afa45248367ac2b508209369b12a2e46cb8c13fd3`。
- 查看位置为 `scripts/project/node_modules/@zxyycom/vibe-check/types/`。tarball 与 installed 的全部声明、docs 和 manifest 共 407 份文件逐字节一致；32 处新增 Markdown 引用均在源码与 installed 声明两侧通过文件和章节锚点核对，共 64 次目标检查。

### 首轮独立语义复核

Manual CR: 2026-10-19，三个未参与对应实施的 `gpt-6.1-sol` 审查代理以以上实际候选包为对象，先读生成声明及局部公开引用，再核对实现和行为 owner；原 22 项全部关闭，无相邻新增阻断。

| 审查者 | 已读声明与修正范围 | 代表性使用任务与结果 |
| --- | --- | --- |
| `audit_jsdoc_core_api` | 8 个核心声明 owner：Check/result、Record reporter、flags、change evidence、Definition/outputs、preview formatter、Controls/aggregation 和 Run；原 8 项全部关闭。 | 能区分聚合拒绝与 RunResult、正确发布 Records、关闭默认 I/O、使用 protected change flags、解释 evidence 与 formatter 失败；12 处包内引用独立核对通过。 |
| `audit_jsdoc_package_checks` | 14 个 Check 声明 owner：command、secret、files、schema identity、五处 constructor 措辞、lint defaults、link range；原 7 项全部关闭。 | 能判断 secret 覆盖、按顺序选择文件、注册合法 schema ID、处理 command 完成阶段、选定 lint 规则和解释坐标；14/14 声明另与 tarball 比对一致。 |
| `audit_jsdoc_scheduler_tools` | scheduler policy、learned strategy/contract、Finding presentation 四个声明 owner及必要辅助类型；原 7 项全部关闭。 | 能判断 wait 与 cleanup 保证、配置 history identity、处理异步观察和 Finding 数量；实包纯内存演练确认参数边界、observer 不等待及额外汇总行为。 |

复核认为局部说明与引用足够，未复制整篇文档。本轮是原发现及修正周边的专项复核，不重做已审过的全包 Markdown；未验收具体 IDE 的 hover 渲染或点击体验，不作为正式发布审查结论。

### 首轮机械验证

- `bun run docs:api`、`bun run validate`、`bun run test-evidence -- check --root .`、本 Change 的 `check` 和 `git diff --check` 均通过。Case 检查覆盖 756 个当前测试实体、188 个语义 Case、16 个 Topic；没有新增或修改测试义务。
- 同候选 `bun run check -- --all` 通过：43/43 passed，execution elapsed 35.4s，包含类型、lint、format、tests、package artifact 和 external consumer 的 types/documentation/runtime 验收。
- 本次 Gate 仅有非阻断耗时警告：Check mean 2124.8ms 超过 2000ms、p95 5081.2ms 超过 5000ms；未据单次数据推断性能回归。证据目录为 `.log/project-gate/2026-10-19T05-42-24.896Z-689168-1bc42a94-f3f6-4381-9984-1869abef8e3c`。
- 未运行独立的 `package:candidate:integration` 物理生命周期 target；本次未修改候选生命周期。

### 提交前表达整理

用户在首轮修复后要求用 `ai-ready-docs` 复看并提交。九个已有修改文件作局部整理：将 `CheckResult.data` 约束移回正文，按调用顺序组织 Run 和 command/Markdown link 构造说明；用当前任务用途与调用方责任替代 learned strategy 的特权对比、Finding helper 的否定清单和重复的类型对照。

保留非法输入后果、protected flags、取消与清理、Secret 覆盖、identity 保密及输出 I/O 等独立约束。原 `files` 数组措辞已改为当前 `files.patterns`，无需在注释中继续叙述迁移经过。只变表达，类型、运行时和示例保持原样。

### 最终验证与提交边界

最终候选为 `0.0.0-local.ce99cf444ac9`，tarball 为 `build/artifacts/zxyycom-vibe-check-0.0.0-local.ce99cf444ac9.tgz`，SHA256 为 `a384e106b2af99e1fffc6eca6bcd79c0845062c811d0f5fc82874fa80001f077`；installed 查看位置与首轮相同。

Manual CR: 三位原独立审查者复核九文件表达整理，并确认结论适用于最终包。核心原 8 项、Check 原 7 项、调度工具原 7 项保持关闭。复核发现 command 的“空环境、facts 不包含”措辞过强，已改为默认不继承 ambient environment、不持久化输出及 Product 不自动发布；保留固定环境变量和调用方主动发布数据的可能性。Check 审查者在最终声明中确认关闭。

- 最终 26/26 文件非注释 AST 与 HEAD 一致，`docs:api` 通过；新增指南引用共 33 处，在源码和 installed 声明两侧的 66 次目标/锚点检查均通过。tarball 与 installed 的 types、docs 和 manifest 共 407 份文件逐字节一致。
- `validate`、Case 账本、Change 检查及 `git diff --check` 通过。同包完整 Gate 为 43/43 passed，execution elapsed 32.5s，无耗时预算警告；证据目录为 `.log/project-gate/2026-10-19T05-52-35.046Z-705370-5e692449-e5de-4b4a-b717-491847d2e719`。
- 中间整理候选的 type acceptance 因既有 JSDoc 检查要求 `validation` 文字标记而失败；保留该领域术语后，对最终包重新执行完整 Gate 通过。没有修改测试或放宽验收。
- 本次提交包含 26 个源码文件的注释修复与本 Change 完成记录。保留前述 IDE、正式发布及独立物理生命周期 target 的未覆盖边界；不执行 Change 删除。
