# Proposal

本 Draft 计划让 Vibe Check 的产品宿主与仓库执行后端改由 Node 承接，同时只把 `bun run <script>` 保留为不参与正确性证明的可选前端启动方式。

## Why

**当前问题。** Bun runtime 在目标 Windows sandbox 中存在已报告的兼容冲突，使产品执行、项目脚本与 Gate 难以可靠使用。仓库虽然已经用 pnpm 管理依赖、锁定 Node 24、采用 NodeNext ESM、`node:*` API 和 `node:test` authoring，但正式 package contract、根脚本、candidate lifecycle、Test Evidence 与 Gate 仍把 Bun 同时作为产品宿主、脚本解释器、测试 runner 和 package manager。只改调用命令而继续让 Bun 执行实际 work，不能移除该失败边界。

**可行性依据。** Product production source 没有直接使用 `Bun.*` 或 `bun:` API；锁定的 Node 24.18.0 可以加载 public source entry，当前 Bun-built exact candidate 也能在 Node 下完成包含 duplicate detection、JSON Schema、Markdown Link、cache、machine publication 与自定义 Check 的代表性 Run。主要迁移成本因此位于宿主契约、脚本与证据 owner，而不是 Product 能力重写。

**变更边界。** 项目必须在未安装 Bun 的受支持环境中完成全部正式流程；已经自行安装 Bun 的调用者仍可用它触发 package script，但该便利不能重新成为运行时、工具或验收依赖。

## Outcome

完成后的可观察结果是：

1. **必需路径：** 未安装 Bun 的受支持环境仅用项目锁定的 Node、pnpm 与其余明确工具，即可自举、构建、安装、测试、运行和验收 Vibe Check。
2. **产品契约：** 公开 package 以 Node 为唯一承诺宿主，exact candidate 与发布证据在 Node 及目标 Windows sandbox 中通过。
3. **可选路径：** 已经自行安装 Bun 的调用者可以执行 `bun run <script>`；package script 随后显式启动 Node，且环境准备、Gate、测试证据和发布验收都不依赖 Bun 存在。
