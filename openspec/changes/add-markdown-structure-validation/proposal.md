本 proposal 仅为 Markdown 结构度量与策略 finding 锚定临时变更范围，尚未完成实现前审计或获准实现。

## Why

本临时 change artifact 的目标是为项目 Markdown 提供基于解析语义的结构度量与阈值发现，使内容质量检查不再依赖脆弱的正则计数。现有产品尚无此能力，而仓库脚本中的局部校验不能构成产品行为或公共契约。

## What Changes

- 新增以稳定 Markdown 方言语义计算文档、section 与 paragraph 度量的产品能力，并为结构违规产生可定位 finding。
- 定义 heading depth、跳级与 H1 规则，以及 front matter、代码块、表格和列表对解析与行定位的影响。
- 使文档总量、section 与 paragraph 的 words/chars 阈值及`requireSingleH1`、`requireFirstHeadingH1`、depth-skip、maximum-depth规则可由文件政策覆盖，同时保持度量与 finding 分离。
- 为四个stable checks固定finding codes与closed typed evidence catalogs，使subject/rule/actual/threshold/expected/unit无需解析message即可消费，并保持location不参与identity。
- 本 feature 自行注册 stable capability/check/metric IDs、optional complete `checks.markdownStructure` config-v2 fragment、neutral contribution、profile/request semantics 与 overrideable leaves；依赖 `standardize-quality-capability-contract` 的 registry/observation/finding/output 挂点和 `add-file-policy-overrides` 的 typed patch/resolution 规则。

## Capabilities

### New Capabilities
- `markdown-structure-validation`: 对受批准 Markdown 输入执行解析驱动的结构度量和结构策略验证。

### Modified Capabilities

- `scan-configuration`: 组合 optional complete `checks.markdownStructure` section、neutral contribution、稳定 check/metric catalog 与 override metadata，而不修改 required core sections。

## Impact

- 预期实现归属为 `src/product/**` 的 Core/Scanner、Config 与 Output 接点，以及对应产品测试、schema/example 与文档 owner。
- 将需要一个不暴露具体 parser 的 Markdown AST/parser 边界；不复用或提升 `scripts/**` 的 repo-only 正则校验。
- 依赖 content-quality foundation 和 file-policy overrides 的最终契约；阻塞审计未完成时不得开始实现。
