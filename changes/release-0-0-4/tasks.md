# Tasks

先完成文档再复查及新候选验收，再重新冻结正式包；旧包已完成的验证保留在 evidence，不代表新材料已验收。发布与交接仍须取得授权。

## Readiness

- [x] 0.1 核对 owner、授权边界、起始 Git 状态、版本与 registry 观察。
- [x] 0.2 完成准备期整包文档/JSDoc 结论恢复，独立复核本轮版本说明与关联路径。
- [x] 0.3 按用户要求重新全文阅读 29 篇随包 Markdown，区分必要协议/安全说明与表达问题。

## Implementation

- [x] 1.1 整理 0.0.4 changelog、发布轨道、Change 与非敏感 current evidence。
- [ ] 1.2 保存包含文档优化的 clean S，建立对应 detached 冻结工作区并生成新正式 tarball 和 receipt。
- [ ] 1.3 将新原始产物、receipt、完整 Gate 日志和准备期 evidence 归档并逐文件核对摘要。
- [ ] 1.4 临发布重新核验 freshness、registry、publisher authority 和精确授权，由发布者交互发布同一 tarball。
- [ ] 1.5 发布与分发验证成功后，按授权将版本 tag 指向 S 并合回 main。
- [x] 1.6 完成正文组织与准确性修正，保留示例、历史事实、安全和兼容边界，更新当前证据。

## Verification

- [x] 2.1 新准备材料的文档投影、validate、Case、Change 和 diff 检查通过。
- [ ] 2.2 新正式 receipt 绑定的完整 Gate 及 external consumer 验收通过。
- [ ] 2.3 `Manual CR:` 保存新正式包身份与全部用户文档、示例、对外 JSDoc 的独立适用性结论。
- [ ] 2.4 发布后核对 registry 身份、dist-tag、下载产物 SHA-256/SRI 与 receipted tarball 一致。
- [ ] 2.5 保存发布、Git 交接与归档的最终证据，确认后续工作区保留或清理授权。
- [x] 2.6 文档优化后的 local candidate 通过完整 Gate，由独立 reviewer 复核实际包内差异及关联阅读路径。
