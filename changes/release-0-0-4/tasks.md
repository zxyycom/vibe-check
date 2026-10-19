# Tasks

先完成本地准备与冻结验收，再在取得授权后执行发布及交接；未发布时保留未完成事项。

## Readiness

- [x] 0.1 核对 owner、授权边界、起始 Git 状态、版本与 registry 观察。
- [x] 0.2 完成准备期整包文档/JSDoc 结论恢复，独立复核本轮版本说明与关联路径。

## Implementation

- [x] 1.1 整理 0.0.4 changelog、发布轨道、Change 与非敏感 current evidence。
- [x] 1.2 保存 clean S，创建 detached 冻结工作区并生成正式 tarball 和 receipt。
- [x] 1.3 将原始产物、receipt、完整 Gate 日志和准备期 evidence 归档并逐文件核对摘要。
- [ ] 1.4 临发布重新核验 freshness、registry、publisher authority 和精确授权，由发布者交互发布同一 tarball。
- [ ] 1.5 发布与分发验证成功后，按授权将版本 tag 指向 S 并合回 main。

## Verification

- [x] 2.1 准备材料的文档投影、validate、Case、Change、Decision 和 diff 检查通过。
- [x] 2.2 正式 receipt 绑定的完整 Gate 及 external consumer 验收通过。
- [x] 2.3 `Manual CR:` 保存正式包身份与全部用户文档、示例、对外 JSDoc 的独立适用性结论。
- [ ] 2.4 发布后核对 registry 身份、dist-tag、下载产物 SHA-256/SRI 与 receipted tarball 一致。
- [ ] 2.5 保存发布、Git 交接与归档的最终证据，确认后续工作区保留或清理授权。
