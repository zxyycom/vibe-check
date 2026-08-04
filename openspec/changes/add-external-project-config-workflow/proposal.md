## Why

External project 需要通用观察起点，也需要由项目自身持有阻断政策。产品因此提供两类明确
结果：调用者可以直接获得中性观察；阻断行为由项目持有的 complete policy 驱动。

长期选择记录在
[`use-neutral-default-for-observation-and-file-policy-for-gates`](../../../docs/decisions/configuration/use-neutral-default-for-observation-and-file-policy-for-gates.md)。

## Target Outcomes

- Ungated scan 在没有 config file 时使用 Product-owned neutral default，扫描全部受支持的项目
  文件并使用中性报告文本。
- Explicit `--config` 优先；省略 flag 时只发现 `.vibe-check/config.json`。选中的 file 是本次
  scan 的 complete policy。
- 任一 gate 使用 explicit 或 discovered file-backed config，并在 scan work 前完成配置校验。
- `init [project-root]` 确保 commented `config.json` 与 `config.schema.json` 存在；已有的 normal
  non-symlink target 保持原字节，缺失 target 由 neutral default 与 editor schema 补齐。
- Repository dogfood 把自身 policy 提交到 fixed discovery path，并继续通过正式 Product CLI。

## Scope and Boundaries

- Persisted config 继续使用 complete、closed semantic v1 document；default、generated config 和
  selected file 进入同一 runtime schema与 semantic mapping。
- Config content contract 支持 comments、trailing commas 和 strict JSON subset；optional
  `$schema` 只连接 editor schema。
- Discovery 只有 project-root-local `.vibe-check/config.json` 一个 implicit candidate。
- Scanner dependency、quality algorithm、gate evaluation、artifact format 和 machine v1 继续由
  现有 owner 承接。
- Complete-document workflow 是本 change 的 authoring model；project inference 或其它 authoring
  model 由独立使用证据与 change 承接。

## Compatibility

- Existing strict JSON explicit semantic configs 继续被同一 loader 接受。
- Ungated omitted-config scan 保持可用，但其 policy 从 repository-specific values 变为 neutral
  default。
- Gated omitted-config scan 需要先通过 `init`、fixed discovery 或 explicit `--config` 建立项目
  policy。

## Success Criteria

- Clean external project 可以直接运行 ungated scan，scope 和报告只使用 project-neutral values。
- Config validation 是 gate scan 的首个 runtime prerequisite；通过后才进入 dependency、scanner、
  baseline、cache 与 artifact work。
- `init` 新建的 config semantic value 与 in-memory neutral default 相等；两种 source 产生相同
  scope、checks 和 report settings。
- 首次与重复 `init` 都确保两个固定 target 存在：已有安全文件保持原字节，只补齐缺失文件；
  unsafe target、create race 或 handled write failure 保持 ownership safety。
- Product-owned schema 决定 runtime validation；sibling schema 由 editor/drift validation 独立负责。
- `quality:*` 通过 discovery 使用 repository policy，并保持 profile、gate、args 和 process outcome
  pass-through。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `scan-configuration`：neutral default、fixed discovery、Vibe Check JSON、initialization、selection
  context 和 gate config prerequisite。
- `cli-contract`：`init` routing、help 和 config-workflow error mapping。
- `scan-scope`：三个 config source 共用一个 complete-config pipeline。
- `test-fixtures`：external onboarding、gate prerequisite、schema authority 和 dogfood proofs。

## Impact

影响 Product CLI routing、Product Config、scan preflight、repository dogfood materials、fixtures、
owner docs 和 tests。Scanner adapters、Core metrics、warning/gate evaluation 和 stable machine v1
保持现有 contract。
