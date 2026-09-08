# 文档与包材料

维护 package 文档时，从本文确定编辑位置、更新投影并核对发布材料。正文和示例的内容规则由各自 owner 维护；实现校验器时另见[文档验证](documentation-validation.md)。

## 修改文档与示例

### 找到编辑入口

| 要修改的内容 | 编辑位置 |
| --- | --- |
| README、API 专题正文、标题或链接 | 最终 Markdown 中受管示例代码块之外的内容 |
| Check 指南 | [README 随包 Check 索引](../../README.md#随包提供的-check)链接的对应指南 |
| 可执行 API 示例 | `docs/examples/package-api/*.ts` 中已列入白名单的文件或 region |
| declaration 说明 | 声明所属源码中，受管 `@example` 尾部之前的 JSDoc 正文 |

README 与 API 专题使用同一份 checked-in Markdown 发布；Check 指南也直接发布其 checked-in 文件。
API 专题的显式清单和示例投影目标都由 `scripts/docs/package-api/example-projections.ts` 维护。

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

本节定义随包文档和材料的发布范围；发布事实由下列现有 registry 决定。

### README、API 专题与 Check 指南

package README 是消费者文档的唯一总入口。它必须直接链接每篇显式发布的 API 专题、machine output 指南，
并通过[随包 Check 索引](../../README.md#随包提供的-check)逐项直链已注册的 Check 指南。

两类文档分别按自己的清单发布：

- **API 专题：** 只按显式 inventory 发布，不按篇数、关键词或目录遍历推定。
- **Check 指南：** README 的随包 Check 索引是 public package-provided Check functions 的唯一逐项 registry；它不承接 API 专题入口。Check guide registry 必须与这些 public functions 完整闭合。

`docs/index.md` 和 `docs/checks/index.md` 不发布。

collector 对 published-path API Markdown 和手写 Check 指南检查以下要求：

- 使用 LF，且恰有一个 trailing LF；
- 不缺少 README 直链，也不存在额外 Check 页面；
- package 内的相对 Markdown 链接都能解析。

### Machine 材料

`scripts/docs/machine-artifacts/package-materials.ts` 是精确随包 registry，按原始 bytes 读取以下材料：

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
