# 文档与包材料

维护 package 文档时，从本文确定编辑位置、更新投影并核对发布材料。正文和示例的内容规则由各自 owner 维护；实现校验器时另见[文档验证](documentation-validation.md)。

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

### 修改与验证步骤

1. 修改正文或链接时，直接编辑最终 Markdown；修改 Check 指南时，直接编辑对应指南。
2. 修改受管示例时，编辑白名单内的 TypeScript 源文件。新增、移动或重命名目标章节时，同时更新 registry 的 heading path 或源码 JSDoc 目标。
3. 运行 `bun run docs:api:write`，更新 Markdown 示例代码块和 JSDoc 示例尾部。
4. 运行 `bun run docs:api`。默认 check mode 不写文件；任一 checked-in 投影过期都会失败。目标章节的精确语法与失败条件见[示例投影规则](documentation-validation.md#示例投影规则)。

新增、移动或改变发布项时，还需同步核对导航、README 和发布清单，并通过 package material / consumer 验收。
[文档导航](../navigation.md#读者发布范围与规则归属)映射读者和规则责任，不决定发布范围。

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

`docs/index.md` 和 `docs/checks/index.md` 不发布。

collector 对已登记 Markdown 和手写 Check 指南检查以下要求：

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
验收见[随包材料验收](documentation-validation.md#随包材料验收)。

## 文档验证

| 命令 | 执行范围 |
| --- | --- |
| `bun run docs:api` | 只读检查 API 文档投影是否与源一致 |
| `bun run validate -- docs` | 只运行文档 task，不执行 layout 或 diff 检查 |
| `bun run validate` | 先运行全部文档 task，再执行 repository layout characterization，最后运行 `git diff --check` |

各 task 的结果、诊断与独立验收边界见[文档验证实现](documentation-validation.md)。
