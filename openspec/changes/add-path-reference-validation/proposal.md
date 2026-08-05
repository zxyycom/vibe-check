本 proposal 仅为文本路径字面量政策检查锚定临时变更范围，尚未完成实现前审计或获准实现。

## Why

本临时 change artifact 的目标是检查文本中泄露或禁止的文件系统路径字面量，明确把“核心路径”收敛为文本路径引用，而不把它扩展成 import 或依赖图分析。现有产品没有这一可配置能力，且简单字符串搜索无法可靠控制代码样例和跨平台误报。

## What Changes

- 新增对文本中绝对 filesystem/workspace 路径与配置化 forbidden path literals 的解析、脱敏和 finding 生成能力。
- 定义 Markdown 代码块/示例的检查政策、项目根表示、POSIX、Windows 与 file URI 形式，以及 allowlist 与 false-positive 控制。
- 为两个stable checks固定exact finding codes与closed typed evidence，使classification、policyRule与sanitized display无需解析message即可消费，且raw root/absolute/literal不穿过machine boundary。
- 明确初始范围不解析 import、模块解析、包依赖或架构依赖图；这些问题由其它能力拥有。
- 本 feature 自行注册 stable capability/check IDs、optional complete `checks.pathReferences` config-v2 fragment、neutral contribution、profile/request semantics 与 overrideable leaves；依赖 `standardize-quality-capability-contract` 的 registry/finding/output 挂点和 `add-file-policy-overrides` 的 typed patch/resolution。

## Capabilities

### New Capabilities
- `path-reference-validation`: 对受批准文本输入检查绝对路径和禁止路径字面量，并产生经过项目根脱敏的 finding。

### Modified Capabilities

- `scan-configuration`: 组合 optional complete `checks.pathReferences` section、neutral contribution、稳定 check IDs 与 override metadata，而不修改 required core sections。

## Impact

- 预期实现归属为 `src/product/**` 的 Core/Scanner、Config 与 Output 接点，以及对应产品测试、schema/example 与文档 owner。
- 需要稳定的文本/Markdown 解析边界和跨平台路径分类，不以 import graph 或依赖分析替代文本检测。
- Markdown destination与autolink metadata由canonical `add-markdown-link-validation`独占，本change只检查可见label/text。
- 依赖 `standardize-quality-capability-contract` 和 `add-file-policy-overrides` 的最终契约，并与 `add-markdown-link-validation` 固定 destination ownership 边界；阻塞审计未完成时不得开始实现。
