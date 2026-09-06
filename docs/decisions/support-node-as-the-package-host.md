---
title: 公开 package 只支持 Node 宿主
status: active
alignment: aligned
createdAt: 2026-09-06T11:54:52Z
purpose: 让公开 package 由普通 Node consumer 直接运行，同时保持仓库工具宿主为独立责任。
background: Bun-only 产品宿主阻止 Node consumer 使用完整公开能力，而迁移仓库脚本不会改善已发布 Product 的运行边界。
decision: 公开 package 只承诺 Node 24.18 至 24.x 宿主；Bun 继续作为仓库 tooling，但不再是 Product runtime contract。
tags:
  - product-contract
  - product-priority
relations:
  - type: 替代
    target: support-bun-as-the-package-host.md
---

## 目的

- 让普通 Node consumer 能直接 import npm package 并运行全部公开能力，包括 Worker-backed function metrics。
- 将 Product runtime compatibility 与 repository script/build/test tooling 的宿主责任明确分离。

## 背景

- 既有决定只承诺 Bun 直接 import 和执行 package，并明确要求 Node 支持通过独立 Decision 和 Change 建立。
- Package runtime 主要使用标准 ESM 与 `node:*` API，但 function-metrics Web Worker globals 仍阻断普通 Node 运行。
- 仓库脚本、测试、Gate 和 package lifecycle 使用 Bun 属于开发交付工具选择；把它们迁移到 Node 不是解除 Product consumer 阻断的必要条件。
- 当前仓库锁定并实际验证 Node 24.18.0；尚未验证 Node 25，因此公开范围从 24.18开始并在 25前封闭。

## 决策

- 采用: 公开 package 的唯一受支持宿主为 Node `>=24.18 <25`；generated manifest、consumer documentation、diagnostics、formal receipt 和 exact-candidate runtime acceptance 必须投影同一范围。
- 采用: Product production runtime 使用 Node API，不建立 Bun/Node adapter 或 dual-runtime compatibility；在 Bun 中偶然可运行不形成产品承诺。
- 采用: Exact installed candidate 必须由真实 Node child import 并执行代表性公开 Run，覆盖 Worker、运行时依赖和输出契约；仅由 Bun 构建、安装或加载入口不能证明 Node host。
- 采用: Repository scripts、test runner、Test Evidence、Project Gate 和 package build/install tooling 可继续使用 Bun；这些工具事实不得写成 package consumer prerequisite。
- 采用: 不为尚未复现的平台差异建立 Windows专用分支或验收门禁；真实平台 Bug按后续证据单独修复。
