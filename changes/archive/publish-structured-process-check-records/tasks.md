# Tasks

按先固化 owner 与长期边界、再实施两个可证明协议、最后验证的顺序完成本 Change。

## Readiness
- [x] 0.1 创建并审核 owner-specific structured process Record 的 active Decision 与 Change Plan，确认只覆盖 oxlint / oxfmt。
- [x] 0.2 审阅 shared process lifecycle、development invocation、format targets、现有 process tests 与 Test Evidence Case，确定不复制 raw child material 的断点。

## Implementation
- [x] 1.1 为 settled、nonzero process result 增加显式 owner projection seam，保持 unavailable/success 与 generic fallback 的既有语义。
- [x] 1.2 实现 oxlint JSON closed parser 与 safe diagnostic Records，并让两个 lint entries 显式选择它。
- [x] 1.3 实现 oxfmt list-different closed parser 与 workspace target authorization Records，并让 format entry 显式选择它。
- [x] 1.4 更新 Process owner 文档、Case 与 Decision current-fact alignment，描述限定协议、fallback 与安全边界。

## Verification
- [x] 2.1 运行结构化 adapter 的最窄测试，覆盖完整 projection、parser/path/schema fallback、transcript 顺序、timeout/cancel 和 raw child text 不泄漏。
- [x] 2.2 运行受影响 scripts typecheck、lint、format 与 Test Evidence closure。
- [x] 2.3 运行 docs/Decision/Change Plan verification，并人工审阅 diff、owner scope 与长期 Decision alignment。
- [x] 2.4 用安装的 oxlint 1.78 probe 核对 label shape；为 safe rule/path grammar 补充 credential-like input 的 whole-projection fallback evidence。
