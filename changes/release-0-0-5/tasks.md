# Tasks

发布准备、交互发布、分发核验与 Git 交接均有证据；保存全勾完成态后按已获授权结项，暂留两个发布工作区与分支。

## Readiness

- [x] 0.1 核对 owner、活动 Decision、main 同步、版本观察和本轮授权边界，见 design 与 evidence。
- [x] 0.2 建立发布分支实现工作区，恢复既有全包与后续指南审查的可追溯基线。

## Implementation

- [x] 1.1 保存发布说明和 Plan，选择 clean S，建立独立 detached 冻结工作区并准备运行环境。
- [x] 1.2 从冻结 S 生成 version=0.0.5、tag=latest 的正式 tarball/receipt，记录身份与摘要。
- [x] 1.3 按固定位置保存正式产物、receipt、两轮 Gate 日志和非敏感完整审查快照，逐文件核对 bytes/摘要。
- [x] 1.4 用户交互发布成功；按追加授权 tag S 并推送、fast-forward 合回并推送 main，发布后快照已归档且 bytes 核对通过。

## Verification

- [x] 2.1 同 receipt 的完整 routine Gate 与 installed types/docs/runtime 验收通过，保存日志位置和结果；同时保留首轮冷缓存性能失败。
- [x] 2.2 独立完成最终包文档/JSDoc 清单与差异确认，`Manual CR:` 覆盖完整且无阻断缺口，见 review-final-package 与逐项清单。
- [x] 2.3 完成发布准备证据、Change/材料检查和精确人工发布交接；明确未发布与授权边界。
- [x] 2.4 匿名下载分发 bytes/version/latest 与 receipt 一致；本地及远端 v0.0.5 指向 S，main 交接 fe787ef0 与发布后快照可追溯，见 evidence。
