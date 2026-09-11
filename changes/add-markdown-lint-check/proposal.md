# Proposal

本 Draft 起草一个由 Package 提供、使用闭合规则策略检查 Markdown 结构与明确内容缺陷的 ordinary Check。

## Why

当前 Package 能验证 Markdown 本地链接与锚点，但标题层级、代码围栏语言、图片替代文本、未定义 reference 和表格列数尚无随包 lint Check。由 Package 固定高信号默认规则并规范化结果，可以让消费者直接组合这项能力，而不必自行承担第三方配置与诊断契约。

本 Change 只交付 Check 本身：Package 提供默认规则和有界的规则启停配置；Markdown Link、缓存和修复能力继续由各自 owner 承接。

## Outcome

Package 消费者可以从公共程序化 API 构造一个默认可用的 Markdown lint Check，通过 Product 拥有的闭合配置选择受支持规则，并从普通四态结果、稳定 Records 与消息中读取有界诊断。现有 `markdownLinkValidation` 的本地 target 与 anchor 语义保持不变。
