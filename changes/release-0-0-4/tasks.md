# Tasks

本地准备、receipt 验证及同包一次完整 Gate 43/43、独立确认和准备期归档已完成。发布账号权限及临发布状态核验通过，发布者交互发布后已确认 registry 的 `0.0.4/latest` 身份，下载 tarball 与已验收产物逐字节一致；发布与分发核验完成，不重复 publish。已获授权继续 Git 提交、tag、合回并推送 main、推送版本标签及 evidence 归档；所有工作区、旧产物和 Change 保留，不清理。

## Readiness

- [x] 0.1 核对 owner、授权边界、起始 Git 状态、版本与 registry 观察。
- [x] 0.2 完成准备期整包文档/JSDoc 结论恢复，独立复核本轮版本说明与关联路径。
- [x] 0.3 按用户要求重新全文阅读 29 篇随包 Markdown，区分必要协议/安全说明与表达问题。
- [x] 0.4 恢复超时调查、严格 JSON owner、既有性能判断及试改授权，取得阶段与 CPU baseline。
- [x] 0.5 按 5 秒红线审查全量真实进程测试的独立义务、重复覆盖与反例，撤回加时方案并记录必要性结论。

## Implementation

- [x] 1.1 整理 0.0.4 changelog、发布轨道、Change 与非敏感 current evidence。
- [x] 1.2 保存包含文档优化的 clean S，建立对应 detached 冻结工作区并生成新正式 tarball 和 receipt。
- [x] 1.3 将新原始产物、receipt、完整 Gate 日志和准备期 evidence 归档并逐文件核对摘要。
- [x] 1.4 临发布重新核验 freshness、registry、publisher authority 和精确授权，由发布者交互发布同一 tarball。
- [ ] 1.5 发布与分发验证成功后，按授权将版本 tag 指向 S 并合回 main。
- [x] 1.6 完成正文组织与准确性修正，保留示例、历史事实、安全和兼容边界，更新当前证据。
- [x] 1.7 按用户确认收敛最小测试证明重分工；独立保存严格 JSON 优化 patch、原样文件与摘要，并从本轮工作树分离该草案。
- [x] 1.8 按 ai-ready-docs 与完整编码规范重新审查本次全部变更，完成必要优化、独立复核、局部验证与授权提交。

## Verification

- [x] 2.1 新准备材料的文档投影、validate、Case、Change 和 diff 检查通过。
- [x] 2.2 新正式 receipt 绑定的完整 Gate 及 external consumer 验收通过。
- [x] 2.3 `Manual CR:` 保存新正式包身份与全部用户文档、示例、对外 JSDoc 的独立适用性结论。
- [x] 2.4 发布后核对 registry 身份、dist-tag、下载产物 SHA-256/SRI 与 receipted tarball 一致。
- [ ] 2.5 保存发布、Git 交接与归档的最终证据，确认后续工作区保留或清理授权。
- [x] 2.6 本轮优化后的 local candidate 通过完整 Gate，由独立 reviewer 复核实际包内差异及关联阅读路径。
- [x] 2.7 按确认的证明分工调整必要测试及 owner/Case，在原 5 秒预算内通过直接证明、代表性并发及独立语义审阅；局部优化另以等价性和测量判断，不混同测试必要性。
- [x] 2.8 向用户说明最终建议、收益、代价与风险，并取得采用方案的定稿确认。
- [x] 2.9 在不改变预算或安装语义的前提下，定位 external consumer 安装阻塞的可证明责任边界，保存独立客户端证据、未知项和后续验收边界；此项不声明安装可靠性已修复。

已采用测试分工的九实体、六个应失败反例、37/37 回归及三轮竞争验证通过；原 candidate 的完整 Gate 为 43/43。测试已提交为 `8a503b16`，调查与准备记录为 `95488448`；严格 JSON 草案不在交付范围内。

2.9 只完成有界调查及证据审阅，不声明网络已修复。用户已决定停止专项排查，正式包安装验收要求保持。`95488448` 工作区继续保留；1.8 与 local candidate 的 2.6 已完成。2026-10-20 获授权从 `4e3294a9` 新建 detached 工作区，正式 prepare 与包含同包完整 Gate 的 release verify 均成功；发布与分发核验后已取得本轮 Git 交接授权。具体授权、日志、独立复核与归档结果见 [current evidence](current-evidence.md)。
