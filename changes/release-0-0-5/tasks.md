# Tasks

先完成本地发布准备与同包验收；发布和 Git 交接保持显式未完成，直至有对应授权与事实。

## Readiness

- [x] 0.1 核对 owner、活动 Decision、main 同步、版本观察和本轮授权边界，见 design 与 evidence。
- [x] 0.2 建立发布分支实现工作区，恢复既有全包与后续指南审查的可追溯基线。

## Implementation

- [ ] 1.1 保存发布说明和 Plan，选择 clean S，建立独立 detached 冻结工作区并准备运行环境。
- [ ] 1.2 从冻结 S 生成 version=0.0.5、tag=latest 的正式 tarball/receipt，记录身份与摘要。
- [ ] 1.3 按固定位置保存正式产物、receipt、Gate 日志和非敏感快照，逐文件核对摘要。
- [ ] 1.4 发布者完成临发布核验与交互 npm publish；成功后按授权 tag S、合回 main 并补齐归档快照。

## Verification

- [ ] 2.1 同 receipt 的完整 routine Gate 与 installed types/docs/runtime 验收通过，保存日志位置和结果。
- [ ] 2.2 独立完成最终包文档/JSDoc 清单与差异确认，`Manual CR:` 覆盖完整且无阻断缺口。
- [ ] 2.3 完成发布准备证据、Change/材料检查和精确人工发布交接；明确未发布与授权边界。
- [ ] 2.4 公开分发 bytes/version/tag 与本地 receipt 一致，Git 标签/交接及最终归档结果可追溯。
