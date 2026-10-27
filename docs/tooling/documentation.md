# 文档与包材料

维护或审查 package 对外说明时，从本文确定编辑位置、开展使用者审查并核对实际包材料。本文拥有中文主叙述规则与审查方法；各专题仍拥有行为契约。实现校验器时另见[仓库材料验证](repository-material-validation.md)。

## 修改文档与示例

### 找到编辑入口

| 要修改的内容 | 编辑位置 |
| --- | --- |
| README、API 专题正文、标题或链接 | 最终 Markdown 中受管示例代码块之外的内容 |
| 发布范围、源文件或包内路径 | [发布映射配置](../package-documents.json) |
| Check 指南 | [README 随包 Check 索引](../../README.md#随包提供的-check)链接的对应指南 |
| 可执行 API 示例 | `docs/examples/package-api/*.ts` 中已列入白名单的文件或 region |
| declaration 说明 | 声明所属源码中，受管 `@example` 尾部之前的 JSDoc 正文 |

README、API 专题与 Check 指南都发布 checked-in Markdown。文件映射由 [package-documents.json](../package-documents.json) 拥有；
示例投影目标继续由 `scripts/docs/package-api/example-projections.ts` 维护。

可执行示例会投影到指定 Markdown 标题下的 TypeScript 代码块，或源码 JSDoc 的 `@example` 尾部。
生成的类型声明保留 JSDoc 说明和投影后的示例。

示例验收的共同输出策略、已完成 Run 读取与诊断断言可放在 `docs/examples/package-api-support/`；
支持源路径由同一 projection registry 的显式白名单拥有，既有 consumer fixture 原路径复制并由 artifact fingerprint 纳入。
这些源码只承接 region 外的验收职责，不投影、不随包发布，也不成为新的运行入口；教学 Definition、parser 和 adapter 仍在各独立 region。

### 修改与验证步骤

1. 修改正文或链接时，直接编辑最终 Markdown；修改 Check 指南时，直接编辑对应指南。
2. 修改受管示例时，编辑白名单内的 TypeScript 源文件。新增、移动或重命名投影目标章节时，同时更新 registry 的 heading path 或源码 JSDoc 目标。
3. 仅当受管示例或投影目标变化时，运行 `bun run docs:api:write`，更新 Markdown 示例代码块和 JSDoc 示例尾部；纯正文或链接修改无需运行写入模式。
4. 按[交付验证](../navigation.md#交付验证)选择检查。受管示例或投影目标变化时运行 `bun run docs:api`；默认 check mode 不写文件，任一 checked-in 投影过期都会失败。目标章节的精确语法与失败条件见[示例投影规则](repository-material-validation.md#示例投影规则)。纯措辞且不影响链接或投影时可只审查局部 diff 与语义。

新增、移动或改变发布项时，还需同步核对导航、README 和发布清单，并通过 package material / consumer 验收。
[文档导航](../navigation.md#读者发布范围与规则归属)映射读者和规则责任，不决定发布范围。

## package 对外说明的中文主叙述

本节是项目拥有、直接服务 package consumer 的人读说明的稳定语言规则 owner。修改或审查这些材料时必须适用；
产品契约仍由行为 owner 定义，受管投影和验证按本文执行。

### 适用范围

- 显式随包用户 Markdown：README、API 机制、任务专题、Check 与输出指南；精确发布项见[文档材料](#documentation-validation-and-package-material)。
- package entry 说明、public root JSDoc，以及 consumer 为正确使用 public API 必须读取的 supporting declaration 或字段 JSDoc。

### 判断标准

- 说明以连续、可理解的中文叙述承载用途、正确使用方式和边界。reader 无需依赖另一段英文说明，即可从当前中文叙述恢复这些主要含义。
- “中文为主”是编辑判断，不按字符比例计算，也不要求逐字翻译或双语镜像。
- 现有 public-root JSDoc 中文检查只提供局部证据；它不是对全部对外材料的语言门禁，也不应被扩展为全面 gate。

### 可保留原文与排除范围

- API identifier、代码与 code block、字面量、schema/协议字段、命令、路径、专有名、互操作材料和法律惯例材料可以保留原语言；需要时由周围中文说明其语义和边界。
- 内部实现注释、历史 provenance/归档材料、机器契约的 Schema/协议字段与数据文件，以及其它不面向 package consumer 的文档不在本节的机械整改范围；人读用法说明不因涉及机器输出而排除。

### 修改与验收路径

按[修改与验证步骤](#修改与验证步骤)处理正文、示例和投影；审查时确认适用材料满足本节判断标准，且未把语言规则误实现为全量字符检测或无差别翻译。

## 对外文档使用者审查

### 目标与适用场景

从实际取得 package 的使用者视角，判断说明本身是否足以让人找到能力、理解用途、写出正确用法并解释结果。
这项语义审查可独立用于文档专项维护，也是每次[正式发布](package-release.md#发布前对外文档复核)的必需验收。

### 从实际包确定对象

解包或安装待审包，记录版本、来源提交或构建指纹、tarball 摘要及查看位置。
以实际文件和公开导出确定对象，再用发布映射与 public inventory 核对覆盖：

- **页面与示例**：逐篇阅读 README、随包任务专题、Check 指南、changelog、输出说明及面向用户的示例。
- **对外 JSDoc**：沿包根导出和类型引用，检查 package entry、公开函数/类型及正确使用它们必需的辅助声明、字段与回调说明，以实际生成的声明和消费者可见说明为准。

正式发布覆盖上述完整集合，包括本版本未修改的内容；版本 diff 只辅助发现漂移。专项审查可限定范围，结论仅适用于该范围。
内部实现注释不因源码随包发布而纳入对外说明；法律原文、来源材料和机器数据仍由各自 owner 验收。

### 按使用任务阅读与判断

由非实施代理先仅凭随包说明、公开声明和示例，从 README 或 API 提示完成代表性任务，记录答案位置与信息缺口。
全包审查的任务至少涉及首次集成、选用与配置 Check、编写扩展回调、读取结果与处理失败，并按重要深入用法和本次风险补充；专项审查按限定范围选择相应任务。
范围内的任务演练与逐篇、逐声明阅读共同构成审查，按以下方面判断：

- **入口与重心**：读者、标题、开头与正文服务同一使用任务；README 路由和引用可用，内部维护流程留在维护文档。
- **用途与完整性**：交代选用场景、前提、最小完整用法、输入与默认值、返回作用、结果读取，以及失败、取消、I/O 和安全边界。
- **JSDoc 的局部可用性**：在函数、类型、字段或回调处解释含义、单位、可选与缺省语义、使用约束；复杂规则有消费者可访问的引用，说明提供类型签名之外的必要信息。
- **准确与一致**：文字、示例、声明与实际行为一致；术语和版本归属清楚，当前指南与历史迁移各有明确用途。
- **阅读与表达**：篇幅、段落和 Markdown 层级便于查找；清理重复否定、退场方案与无关背景，保留必要规格、安全禁止条款和兼容限制。

完成使用者阅读后，再查行为 owner、实现与测试核对真实性；用法疑点通过实际包复现或交给对应 owner 验证。
内部知识只用于核验，不能补齐用户实际拿不到的说明。

### 结论、修正与复核

1. **记录证据。** 在当前任务或已有 Change 的验证记录中用 `Manual CR:` 保存包身份、审查者、已读页面/声明范围、代表性任务、发现、处理与剩余限制；正式发布使用 release Change 的 current evidence。
2. **修正并复核。** 错误或矛盾承诺、关键用法缺失、依赖未发布说明等影响正确使用的问题，须在[内容 owner](#找到编辑入口)修正，由独立审查者复核；同时更新投影、生成声明和包材料，运行受影响的机械验收。
3. **形成结论。** 声明范围完成独立阅读、必要真实性核对且无影响正确使用的遗留问题，才可通过。覆盖不足、必要核对未完成或独立审查不可用时，记录未完成与缺口；不影响使用的纯风格偏好可说明理由后保留。

文案、声明、示例或相关行为变化后须评估影响并复核，即使文档 bytes 未变。发布者按发布流程确认结论适用于最终正式包。
语义结论与类型、链接、示例执行和同包验收分别提供证据；机械检查通过不能代替内容判断。

## Documentation, validation, and package material

[package-documents.json](../package-documents.json) 是随包文档的唯一文件映射入口，代码按本次 repository root 读取。
每项显式声明 `sourcePath`（仓库相对路径）与 `packagePath`（包根相对路径）；新增或移动发布文档时修改此配置。

| 配置组 | 附加身份 | 保留的内容规则 |
| --- | --- | --- |
| `markdownDocuments` | `id`，供示例目标引用 | 自然标题下的示例投影；README 直接链接各篇文档 |
| `checkGuides` | `checkId`、`exportName` | `docs/checks/` 源目录与公开 Check 函数完整闭合，验证固定指南章节与 README 索引 |
| `machineMaterials` | 无 | 原始 bytes、current schema 和可执行 machine 示例验收 |

当前映射保持源路径与包内路径一致；README 的源文件与包内路径均固定为 `README.md`。
配置只映射文件，不改写正文或链接，作者须维护源码与包内都有效的相对链接。当前映射未包含配置自身；它作为仓库构建输入维护。

### Markdown 与 Check 指南

package README 是消费者文档的唯一总入口。它必须直接链接每篇显式发布的 API 专题、changelog、machine output 指南，
并通过[随包 Check 索引](../../README.md#随包提供的-check)逐项直链已注册的 Check 指南。

只有已登记的示例目标参与代码投影，其余正文保留原始 bytes。README 的随包 Check 索引提供唯一逐项阅读入口；
JSON 的 `checkGuides` 拥有文件映射，两者与 public package-provided Check functions 完整闭合。

全包 Markdown collector 对已登记 Markdown 和手写 Check 指南检查以下要求；实现职责见
[随包材料验收](repository-material-validation.md#随包材料验收)：

- 使用 LF，且恰有一个 trailing LF；
- 不缺少 README 直链，也不存在额外 Check 页面；
- package 内的相对 Markdown 链接都能解析。

### 变更日志

`docs/changelog.md` 随包提供版本净变化、升级影响和相关提交，由 README 直链；具体用法与行为规范继续引用相应用户指南。
它与其它已登记 Markdown 共享 fingerprint、staging/tar/installed bytes 和链接验收。发布前核对目标版本内容和发布状态；
Change 中的计划、调查过程与运行日志继续留在工作区。

当前使用单文件，版本条目增长到影响阅读时再评估 `docs/changelog/<version>.md`，同步入口、显式材料清单和验收；不预建目录或自动收集历史文件。

### Machine 材料

`machineMaterials` 映射以下当前材料，由 `scripts/docs/machine-artifacts/package-materials.ts` 按原始 bytes 读取：

- `docs/output.md` 与 `docs/schemas/` 中 current v4 run / Record schemas；
- 唯一示例 `docs/examples/artifacts/mixed-outcomes/` 中的 `definition.ts`、`run.json` 与 `records.ndjson`。

`definition.ts` 是直接随包发布的可执行 Project Definition。生成器 `scripts/docs/machine-artifacts/examples/**`
通过完整 public Run 执行其中的内置 Check 和自定义依赖 workflow，生成同目录的两个输出文件。
legacy schemas、historical examples、generator sources 与 validation scripts 不发布。

实现与材料维护的责任见[机器输出维护](../development/output-maintenance.md)；精确 bytes、独立 schema 和安装后执行的
验收见[随包材料验收](repository-material-validation.md#随包材料验收)。

## 仓库材料验证

| 命令 | 执行范围 |
| --- | --- |
| `bun run docs:api` | 只读检查 API 文档投影是否与源一致 |
| `bun run validate -- materials` | 只运行全部 repository-material task，不执行 layout 或 diff 检查 |
| `bun run validate` | 先运行全部 repository-material task，再执行 repository layout validation，最后运行 `git diff --check` |

各 task 的结果、诊断与独立验收边界见[仓库材料验证](repository-material-validation.md)。
