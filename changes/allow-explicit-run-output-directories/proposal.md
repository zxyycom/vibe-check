# Proposal

本 Plan 统一 Run-owned machine publication与diagnostic logging的目录语义，允许调用方明确选择project root内外的相对或绝对目标。

## Why

当前文档声称两个output directory都必须是`projectRoot`内的相对目录，但实现只限制diagnostic logging；machine publication在Definition和RunControls中都可通过`..`写到root外。该不对称既不是可靠安全边界，也让调用方无法从文档判断真实能力。

Product配置来自受信任的TypeScript Definition/RunControls，项目Hook本身也可执行普通文件系统工作；现有lexical containment不处理symlink，不能宣称形成文件系统sandbox。真正需要的是两个output使用同一、明确且可验证的路径规则，并继续限制publisher只拥有目标目录中的精确文件。

## Outcome

machine publication与diagnostic logging都接受非空相对或绝对目录：相对值从effective `projectRoot`解析，绝对值直接作为目标。Definition和RunControls执行相同校验，文档不再宣称project-root containment；两项output保持独立配置，也可以显式填写同一目录。

## Scope

### Intended Change

- 用同一directory grammar校验Definition和RunControls中的machine/diagnostic配置，接受非空、无U+0000的相对路径、`..`和绝对路径；不trim或增加平台无关的字符禁用表。
- 明确relative-to-projectRoot与absolute-as-target的解析规则；diagnostic file readback继续等于`path.relative(projectRoot, resolvedFile)`，因此root外目标可含`..`，跨卷时可由平台返回绝对路径。
- 保留machine的`run.json`/`records.ndjson`、diagnostic的invocation-specific文件名、独立enabled/status/failure与publication原子替换边界。
- 更新README、Configuration、API mechanics与Output owner，移除不真实的containment表述并展示同目录配置。

### Resulting Impacts

- 现有拒绝diagnostic `../`或绝对目录的测试和文档必须迁移为接受证据；machine当前偶然接受的行为转为正式契约。
- Definition中的目录仍进入declarative fingerprint；绝对路径会使该Definition identity带有机器位置，文档应建议可移植Definition使用相对目录、invocation-specific外部目标优先放在RunControls。
- 允许root外目标后，publisher的精确文件ownership、失败清理和diagnostic `wx`创建必须保持局部，不能扩大为目录清空或retention协议。

## Success Criteria

- 两项output在Definition与RunControls中接受相对子目录、`../`和绝对目录，并从相同解析规则得到目标。
- 空字符串、含U+0000的字符串、非字符串和unknown keys在任何output I/O前返回configuration diagnostic。
- machine与diagnostic可写入同一目录且文件不冲突；独立enable、status与failure priority保持不变。
- root外临时目录中的真实publication/logging测试通过，且只创建/替换各owner声明的精确文件。
- package文档明确可信配置、可移植性、路径解析、文件名和非sandbox边界，不增加共享`outputRoot`。

## Affected Owners

- `src/project-definition/output-validation.ts`、`src/project-definition/project-definition.ts`：Definition directory grammar与defaults。
- `src/project-run/controls/outputs-override-validation.ts`、`src/project-run/output-configuration.ts`、invocation/completion：override、解析与readback。
- `src/machine-output/v4/**`、diagnostic logger：目标文件ownership与失败清理证据。
- `README.md`、`docs/configuration.md`、`docs/api-mechanics.md`、`docs/output.md`：公共路径契约与使用示例。
- `docs/decisions/**`：可信output target与非containment方向。
- `docs/testing/cases/scan-configuration.md`及相邻Definition/controls/output tests：validation、外部目录和同目录证据。
