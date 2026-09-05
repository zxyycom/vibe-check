# 文档与包材料

本文拥有 package documentation projection、published material inventory 与 documentation validation mechanics。
正文、guide 和 example source 仍由其各自内容 owner 维护；本文不取代 consumer-facing documentation。

## Documentation, validation, and package material

package API 文档按下列 owner 维护：

| 内容                              | 可编辑事实源                                                                                                                                        | 投影或发布结果                                                                                               |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| README 与深入机制正文、标题和链接 | package root `README.md` 与 `scripts/docs/package-api/example-projections.ts` 显式 inventory 中的 API 专题 Markdown 的 projected example fence 之外 | 同一 checked-in Markdown 直接进入 package。                                                                  |
| Check guide                       | [package README 的随包 Check 索引](../../README.md#随包提供的-check)所链接的对应 guide                                                              | 同一 checked-in Markdown 直接进入 package。                                                                  |
| 可执行 API 示例                   | `docs/examples/package-api/*.ts` 的 allowlisted file 或 region                                                                                      | projection registry 指定的自然 Markdown heading 下的唯一 TypeScript fence，或 source JSDoc `@example` tail。 |
| declaration 说明                  | declaration owner 中 managed `@example` tail 之前的 source JSDoc prose                                                                              | emitted declarations 保留该说明和投影后的示例。                                                              |

每个 Markdown target 由 `scripts/docs/package-api/example-projections.ts` 中的自然 ATX heading path 定位。path 按
H2-H6 ancestor-to-target 的 heading text 排列；跳过数字层级不会产生空 path component。目标 section 必须
恰好拥有一个 `ts` 或 `typescript` fenced example。renderer 逐字更新整个 code fence，保留 heading、其它正文
以及按最终发布路径书写的普通 Markdown 链接。最终 Markdown 不保存 projection comment 或 target ID；heading
缺失或重复、section 中没有或存在多个 TypeScript fence、fence 未闭合以及出现以
`<!-- package-api-example:` 开头的 projection marker 都使投影失败。

按以下顺序修改和验证：

1. 正文或链接直接编辑最终 Markdown；Check guide 直接编辑对应 guide。
2. projected example 编辑 allowlisted TypeScript source；新增、移动或重命名目标 section 时同步 registry heading path 或 source JSDoc target。
3. 运行 `bun run docs:api:write` 更新 Markdown example fences 与 JSDoc example tails。
4. 运行 `bun run docs:api`；默认 check mode 不写文件，并在任一 checked-in projection stale 时失败。

`scripts/validation/documentation/workflow.ts` 在 `package-api-documentation` task 中调用 check mode。artifact audit
再次计算投影并要求 checked-in Markdown/JSDoc 与结果一致，再把同一 Markdown 交给 package material collector。

package README 是 consumer 文档的唯一总入口：它直接链接显式 API 专题 inventory 和 machine output 指南，不发布 `docs/index.md` 或 `docs/checks/index.md`。[随包 Check 索引](../../README.md#随包提供的-check)是 public package-provided Check functions 的唯一逐项 registry，并逐项直链其已注册的 Check guides；它不承接 API 专题入口。API 专题只由 explicit inventory 发布，而不是按篇数、关键词或目录遍历推定；每篇均反链 README。Check guide registry 必须与 public package-provided Check functions 完整闭合；collector 要求 published-path API Markdown 与 hand-written Check guides 使用 LF 且恰有一个 trailing LF，并拒绝缺失直链、额外 Check 页面和 package 内无法解析的相对 Markdown 链接。

current machine schemas 位于 `docs/schemas/`，唯一 artifact example 位于
`docs/examples/artifacts/mixed-outcomes/`；其中 `definition.ts` 是直接随包发布的可执行 Project Definition，
`scripts/docs/machine-artifacts/examples/**` 通过完整 public Run 执行其中的内置 Check 与自定义依赖 workflow，并生成同目录的
`run.json` 与 `records.ndjson`；
`scripts/validation/documentation/machine-artifacts/**` 独立验收已发布的 machine artifact。实现与材料维护边界见
[机器输出实现与材料维护](../development/output-maintenance.md)。
`scripts/docs/machine-artifacts/package-materials.ts` 是随 package 发布的 machine material 精确 registry：它只包含
`docs/output.md`、current v4 run / Record schemas 与这一组 Definition/output materials，并按原始 bytes 读取。package build、
packed tar audit、candidate reuse、installed package audit 与 ancestry-external consumer acceptance 都比较同一 registry 的精确
bytes；installed consumer typecheck 直接检查 Definition，documentation acceptance 用一个 consumer-owned Bun child 按确定顺序
执行全部 runtime examples 和 machine Definition。Example 或 Definition import 失败时，错误保留对应 source identity；执行成功后再核对
documented built-in/custom facts、RunResult messages 与 machine publication。legacy schemas、historical examples、generator sources 与 validation scripts 不进入
package。

Documentation validation library functions 返回 Promise，调用方必须等待 completion。四个 native Gate docs task（`json`、`schema`、`examples`、`links`）把可预期的内容 validation failure 返回为 task-owned、已排序的 safe diagnostics，而不从 Error text 恢复 machine 或 terminal facts；unexpected I/O、programming 或安全边界 failure 继续 throw。每项 diagnostic 都有 stable task-local ID、non-array Record data 和单行 presentation；`links` 对每个 missing local-link occurrence 保留 canonical repository-relative source / target、line、column 与 occurrence。`validateDocs({ report })` 只通过显式 reporter 发布 success；typed failed result 不调用 reporter。workflow 的 direct CLI 和 workspace caller 读取 failed result 后，逐条将 safe presentation 写到 stderr 并以非零退出。Project Gate 的 in-process docs Checks 不提供 reporter，而是把同一 diagnostics 交给 native Check Record adapter，从而不在 Product 拥有 TTY running region 时向 stdout 插入未登记内容。

`bun run validate` 先运行全部文档 task，再执行 repository layout characterization，最后运行
`git diff --check`；`bun run validate -- docs` 只运行文档 task，不执行 layout 或 diff 检查。

docs task 的唯一名称是 `json`、`schema`、`examples`、`links` 和 `package-api-documentation`。schema/examples
task 既检查 current published material 的 generation drift，也用 checked-in schema 和 raw example bytes 独立验证
完整 v4 two-file set；它不 import Product validator 作为 acceptance implementation。historical schema/example
materials 只走显式 historical validation path，不进入 current traversal 或 runtime input。
