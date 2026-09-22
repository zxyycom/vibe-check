# 仓库材料验证

修改文档生成器、repository-material 校验器或 Gate 的 native material adapter 时，从本文恢复投影语法、失败结果和验收责任。
编辑正文、示例与发布清单的日常流程见[文档与包材料](documentation.md)。

## 示例投影规则

### Markdown 目标定位

投影 registry 通过自然 ATX heading path 定位每个 Markdown 目标：

- path 按 H2–H6 从祖先到目标的标题文本排列；跳过数字层级不会产生空 path component。
- 目标 section 必须恰好包含一个 `ts` 或 `typescript` fenced example。
- renderer 逐字更新整个 code fence，保留标题、其它正文，以及按最终发布路径书写的普通 Markdown 链接。
- 最终 Markdown 不保存 projection comment 或 target ID。

下列任一情况使投影失败：

- 目标标题缺失或重复；
- section 没有 TypeScript fence，或包含多个；
- fence 未闭合；
- 出现以 `<!-- package-api-example:` 开头的 projection marker。

### 投影一致性验收

`scripts/validation/repository-material/workflow.ts` 在 `package-api-documentation` task 中调用 check mode。
artifact audit 再次计算投影，要求 checked-in Markdown/JSDoc 与计算结果一致，然后把同一 Markdown
交给 package material collector。

## 随包材料验收

映射 loader 从当前 repository root 读取 `docs/package-documents.json`，先验证结构、身份与安全相对路径，
拒绝目标冲突。配置原始 bytes、读取实现与所引用源文件参与 artifact fingerprint；fixture 与冻结工作区使用各自配置。
Markdown 的源码检查使用 `sourcePath`，包内链接和 staging/tar/installed 验收使用 `packagePath`。
包内链接检查也覆盖 machine 材料中的 Markdown 正文，避免 schema 或示例重定位后留下旧链接；其发布仍保留原始 bytes。

验收覆盖[文档发布映射](documentation.md#documentation-validation-and-package-material)声明的 README、API 专题、changelog、Check 指南、机器契约、current schemas 和示例。
`scripts/validation/repository-material/machine-artifacts/**` 独立验收其中的 machine artifact；验证区分三种证据：

1. **材料一致性：** package build、packed tar audit、candidate reuse、installed package audit 和 ancestry-external consumer acceptance 按同一 JSON 映射比较目标路径与精确 bytes。
2. **类型与运行：** installed consumer typecheck 直接检查 Definition；documentation acceptance 使用 mise 锁定、由消费者拥有的 Node child，按确定顺序执行全部 runtime examples 和 machine Definition。
3. **结果核对：** Example 或 Definition import 失败时保留对应 source identity；执行成功后，再核对文档承诺的 built-in/custom facts、RunResult messages 与 machine publication。

## material task

material task 的唯一名称是 `json`、`schema`、`examples`、`links` 和 `package-api-documentation`。
根 validation adapter 默认运行全部 task；显式 focused selection 原样转发，不静默扩张或跳过。

schema/examples task 同时检查 current published material 的 generation drift，并用 checked-in schema 与 raw example bytes
独立验证完整 v4 二文件集合；machine-artifact validator 不 import Product validator。历史 schema/example 材料只走显式 historical
validation path，不进入 current traversal 或 runtime input。

### 完成与失败结果

仓库材料验证库函数返回 Promise，调用方必须等待完成。workspace workflow 组合全部五项 material task；Gate 不调用这个 dispatcher：`jsonValidation` 直接验证同一 `docs/**/*.json` corpus，`jsonSchemaValidation` 直接验证注册 schema 与 report-example bindings，project-native schema-publication provider 负责 schema inventory/publication drift，machine-example provider 负责 machine artifact set，links provider 负责 links。它们都区分两种失败：

- **可预期的内容验证失败：** 返回由 task 拥有、已排序的 safe diagnostics；不从 Error text 恢复 machine 或 terminal facts。
- **非预期 I/O、编程错误或安全边界失败：** 继续 throw。

每项 diagnostic 都包含稳定的 task-local ID、非数组 Record data 和单行 presentation。
`links` 为每个缺失本地链接的 occurrence 保留 canonical repository-relative source / target、line、column 与 occurrence。

### Gate 增量选择

Project Gate 的 `repository-material` change region 是保守、可复核的材料输入 corpus：`AGENTS.md`、`README.md`、
`.oxfmtrc.json`、`.oxlintrc.json`、`changes/**`、`docs/**`、`mise.lock`、`mise.toml`、`package.json`、
`pnpm-lock.yaml`、`pnpm-workspace.yaml`、`tsconfig.json`、`scripts/**` 和 `src/**`。后两项有意宽于直接 validator：schema/example publication 会读取 Product 的 `src/index.ts`、
machine-output v4 schema、serializer 和执行模型，shared scripts 也会改变 provider 的输入或投影。它以
exclude-first 的 Project Definition region 产生同一 effective flag，因而 committed、staged、unstaged、untracked、
rename 和 deletion 都按同一 corpus 判断；Git evidence unavailable 时 Product 保守注入该 flag，不能把失败伪装成零变化。

`materials-json-validator`、`materials-schema-validator`、`materials-schema-publication-validator` 和
`materials-examples-validator` 的输入在此保守 corpus 中闭合。它们仅在 required 且 region changed 时增量执行；
`--materials` 和 `--all` 始终强制执行，已选 Check 的 `dependsOn` closure 仍由 Product 处理。
`materials-links-validator` 不采用该条件：Markdown source 对 repository 内任意 target 的反向依赖尚未建模，
所以 required、`--materials` 与 `--all` 继续完整运行它。此限制同样避免 `--quality` 的质量 Check 因材料零变化被抑制。

### 调用方如何呈现结果

- **`validateRepositoryMaterials({ report })`：** 只通过显式 reporter 发布 success；typed failed result 不调用 reporter。
- **workflow 的 direct CLI 与 workspace caller：** 读取 failed result 后，逐条将 safe presentation 写到 stderr，并以非零退出。
- **Project Gate 的 project-native material Checks：** 直接调用各自窄 provider、不提供 reporter，而是把其 diagnostics 交给 native Check Record adapter，避免在 Product 拥有 TTY running region 时向 stdout 插入未登记内容。公共 JSON/Schema Checks 使用其自身的 Records 与终态，不嵌套 workflow Run。

## 验证入口

运行目标校验器测试和 `bun run validate -- materials`；涉及 package 或 consumer 验收时运行 `bun run check -- --all`。
