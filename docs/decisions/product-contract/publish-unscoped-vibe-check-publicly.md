---
title: 公开发布 unscoped vibe-check package
status: active
alignment: unaligned
createdAt: 2026-08-14T05:52:50Z
purpose: 让 package consumer 使用一个明确且公开可安装的 npm 产品身份。
background: Vibe Check 已是产品显示名，但 registry identifier、访问级别和 repository workspace name 具有独立契约成本。
decision: 正常公开发布 unscoped `vibe-check` package；发布前另行核验 registry authority、authentication 和目标版本可用性。
relations: []
---

## 目的
- 让外部消费者通过普通 npm registry 安装一个身份明确的 Vibe Check product package，而不是依赖私有 scope、仓库路径或未发布 staging artifact。

## 背景
- Vibe Check 已经是稳定的产品显示身份，但显示名、repository root manifest 和 Change 名称本身不决定 registry package identifier 或 access。
- 产品 owner 已确认 package 使用 unscoped `vibe-check` 并按普通公开 package 发布。
- Registry `E404` 只表示查询时未解析到公开 package，不证明名称控制权、私有占用、authentication 或未来发布权限。
- `0.0.x` prestable compatibility 由独立决策承接；公开访问不隐含稳定版本承诺。

## 决策
- 采用: Product package 的 registry identifier 使用 unscoped `vibe-check`，access 为 public，普通消费者无需组织 membership 或 private-registry credential 即可安装。
- 采用: Candidate manifest、documentation、provenance 和 exact-tarball acceptance 使用同一 registry identity，不从 root workspace name 或源码路径另行推导。
- 采用: 真实 publish 前必须重新核验 registry authority、authentication、目标 version absence 和外部写入授权；公开发布方向本身不证明这些执行前提已经满足。
- 不采用: 默认改用私有/restricted distribution，或仅因 registry 查询返回 `E404` 就声称名称已被控制。
