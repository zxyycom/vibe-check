本 change 的目标是替换 TypeScript 产品人读报告中两类已过时的 Rust release-contract notice；本清单仅形成待审计临时计划，不修改其它文档、主规范或现有行为。

## 0. Blocking pre-implementation audit

- [ ] 0.1 **阻塞级门禁：审计完成前不得执行任何实现任务。** 审计 proposal、design、`output-contract` delta 和本清单是否都围绕开头核心句；确认复用的 capability ID 合法且没有遗漏或新增同义 capability；确认当前 change 仍只是 `openspec/changes/replace-retired-rust-report-notices/` 下的待审计临时计划且未修改其它文档或主规范；确认 `## Open Questions` 无未回答问题；确认测试与验证路径足以证明两类 notice 更新及所有报告结构不变量。审计通过并勾选本项后才可执行 1.1 及后续任务。

## 1. Focused behavioral evidence

- [ ] 1.1 在既有产品测试层增加聚焦失败证据，覆盖顶部与 footer notice 的当前 TypeScript/Bun 所有权、过时 Rust owner 文案消失，以及 artifact shape、字段、status、section 顺序、报告结构和机器可读输出不变；不得新增 snapshot 基础设施或报告抽象。

## 2. Notice replacement

- [ ] 2.1 只替换 `src/product/config.ts` 的 `report.nonBlockingNotice` 和 `report.footerNotice` 字符串，使其分别描述当前 TypeScript/Bun release contract 与 release gates，并保留 non-blocking development snapshot 语义。
- [ ] 2.2 用聚焦 diff 确认配置键、渲染路径和相邻报告结构未改变，且没有借此清理其它历史 Rust 提及或引入新抽象。

## 3. Verification

- [ ] 3.1 运行产品 import、typecheck、lint 和 test 检查，确认新增聚焦测试及既有产品测试全部通过。
- [ ] 3.2 运行相关输出契约、仓库 required verifier、文档/OpenSpec validation 和 `openspec validate replace-retired-rust-report-notices --type change --strict --no-interactive`，记录任何无法运行的环境限制。
