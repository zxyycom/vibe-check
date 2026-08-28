# Tasks

任务先固定公共语义，再实施 scanner/measurement，最后同步证据并完成分层验证。

## Readiness

- [x] 0.1 恢复 configuration、scan scope、scanner dependency、测试策略和相关 active decisions。
- [x] 0.2 确认工作区已有改动边界并建立 prestable hard-cut 设计与回退范围。
- [x] 0.3 根据用户复核把配置责任收敛为 area-owned files/thresholds，并识别重叠 area 与无隐式 fallback 的影响。

## Implementation

- [x] 1.1 重构 duplicate-detection options、command resolution、阈值与 worker preflight。
- [x] 1.2 将 measurement 改为单次 exact-scope 扫描、raw cache 与跨 area 阈值过滤。
- [x] 1.3 同步默认值、repository Definition、稳定 owner 文档和 package Check 指南。
- [x] 1.4 更新直接测试、fixtures 与语义 Case 账本。
- [x] 1.5 按完整编码规范复核并收敛 duplicate-detection 的职责、命名、边界校验与 scanner 失败表达。
- [x] 1.6 按 AI-ready 消费契约优化 package Check 指南、配置 owner 与 scanner/scan-scope 说明。
- [x] 1.7 将公共 options 硬切为 `{ cache, codeAreas, scanner }`，让每个 area 拥有完整 files 与 line/token 阈值。
- [x] 1.8 重构 exact-input union、重叠 area annotation、双阈值过滤与 raw cache 后处理。
- [x] 1.9 同步 repository dogfood、external consumer、稳定文档、长期决策 candidate 和 Case 证据。
- [x] 1.10 获得明确决策归档授权后，激活 area-owned 后继并归档其直接前序。
- [x] 1.11 将 `duplicateDetection` 改为补齐 cache/scanner/area/file/threshold defaults 的 specialized constructor。
- [x] 1.12 从 public custom command 移除 scan/availability args，并让 adapter 固定直接 executable 协议。
- [x] 1.13 同步 repository/isolated consumers、public inventory、AI-ready 文档、长期决策和 Case 证据。
- [x] 1.14 删除 public `scanner.workers`，固定沿用 jscpd auto worker policy。
- [x] 1.15 将 private command arguments 按 scan-prefix/version 职责命名，并同步文档、决策与 Case 证据。
- [x] 1.16 将 jscpd 版本责任拆为 repository 测试基线、package v5 compatibility range 与 runtime provenance。
- [x] 1.17 同步 candidate 安装验收、external consumer、AI-ready 文档、长期决策与 Case 证据。

## Verification

- [x] 2.1 运行 duplicate-detection 与相邻 package documentation 最窄测试。
- [x] 2.2 运行 Test Evidence、typecheck、lint 和 docs validation。
- [x] 2.3 运行 `verify:vibe-check-workspace:required` 并审阅目标 diff 与 Change 完成条件。
- [x] 2.4 重跑目标测试、Test Evidence、typecheck、lint、文档检查和 full workspace verification。
- [x] 2.5 运行 `package:build` 与 `package:verify`，核对 current candidate 的 unpacked、tarball 和 installed-entry 产物。
- [x] 2.6 运行 area-owned 配置的目标测试、Test Evidence、typecheck、lint、format、docs 与 decision/change 检查。
- [x] 2.7 运行 full workspace/package verification，执行 repository quality 并核对新 tarball。
- [x] 2.8 运行 constructor/custom-command 目标测试、Test Evidence、typecheck、lint、format、docs 与 decision/change 检查。
- [x] 2.9 重建并 full-verify constructor API package，复跑 repository quality 并核对新 tarball。
- [x] 2.10 运行 no-workers/adapter-protocol 目标测试与治理检查。
- [x] 2.11 重建并 full-verify 最小 scanner API package，复跑 repository quality 并核对 tarball。
- [x] 2.12 运行 version-provenance 目标测试、Test Evidence、typecheck、lint、format、docs 与 decision/change 检查。
- [x] 2.13 重建并 full-verify v5-range package，复跑 repository quality 并核对 tarball。
