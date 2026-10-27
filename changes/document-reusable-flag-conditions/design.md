# Design

本设计在现有 flag 章节补齐命名与复用指导，以受管主示例和简短 helper 变体展示现有能力。

## Context

- [Check authoring 指南](../../docs/guides/extending-check-lifecycle.md#按-flag-选择-check)拥有条件 grammar 与 selection，
  也是命名复用指导的唯一落点，新增示例与精确规则在同一章节相邻。
- 命名条件和 helper 都提供普通 AST，沿用[Definition 的复制与验证](../../docs/development/project-definition.md#flag-enabled-checks)；
  [Run 的 effective flags](../../docs/development/project-run.md#change-preparation-and-flag-projection)保持现有语义。
- [派生 flag 评估](../evaluate-declarative-derived-flags/design.md)保存手动方案与基线核对；本 Change 独立改善用户指导。
- [文档维护 owner](../../docs/tooling/documentation.md)规定正文、示例源与投影的编辑入口。
- 用户已授权优化、Git 提交和本 Change 的正常结项删除；提交沿用已启用 hook 的限频自动推送，不另行发布或扩大外部写入。

## Goals / Non-Goals

- 目标：用户能够选择常量或 helper，跨 Check 复用条件，并正确理解条件与 token 的区别。
- 范围：现有指南中的短小使用指导；Product API、运行行为与 caller-token 计算教程保持原范围。

## Decisions

### Intended Change

在“按 flag 选择 Check”内增加命名条件复用小节：

1. 主示例将 `any` 组合提取为语义化 `CheckFlagCondition` 常量，在两个 Check 的 `when` 中复用。
2. 简短变体展示接收条件、返回组合条件的普通 helper：固定组合优先使用常量，输入变化时再参数化。
3. 说明也可共享完整 `CheckFlagEnablement`；propagation 应与消费 Check 的依赖语义一致。
4. 对比 `when: namedCondition` 与 `when: "namedCondition"`：前者复用 AST，后者测试同名 token presence。
   helper 构造 AST，变量名与函数名不会自动进入 `project.flags`。若使用 `changeFlag`，仍需同一 Definition 声明 region。

沿用现有专题与入口。主示例和 helper 使用同一 source file 的两个独立 regions，运行检查留在 region 外；既有 consumer 会复制并执行整份示例源。指南明确 helper 变体接续上例，避免重复完整 imports、Definition 和 grammar。

### Resulting Impacts

- 用户可观察变化仅为指导更完整；现有 grammar、API 与运行行为保持不变。
- 受管示例应编辑源与投影接线，再运行 `bun run docs:api:write` 和 `bun run docs:api`；非受管正文直接编辑。
- 实施时核对常量跨 Check 复用、helper 可组合与 flags 投影边界，优先使用已有证据及最小运行核对。
- 实施验收运行 `bun run validate` 与 `bun run test-evidence -- check --root .`，并由非实施代理反查：
  仅持随包材料的用户能否完成命名复用任务。
- 新增受管源码与投影接线后，执行 renderer 目标测试、完整 routine Gate 与显式 installed consumer types；不为示例新增名义测试 Case。

## Risks / Trade-offs

- “预定义 flag”容易被理解成预先生成 token；教学术语统一为“预定义条件”。
- 过多封装与重复 grammar 会遮蔽简单用法；正文以常量为主线，helper 作为局部变体，完整规则引用原章节。

## Open Questions

无。采用受管 source 与投影，沿用现有执行和类型验收，不改变长期决策。

## Implementation Observations

- 指南、两个受管 regions、运行对照和显式 consumer types 已完成；实际命令、包身份和独立 `Manual CR:` 见 [tasks](tasks.md#验收证据2026-10-27)。
- 用户仅可观察到指导更完整，普通 AST、token presence、传播、snapshot 与 Runtime 实现均保持；README 已有专题入口，因此无需新增索引、公开导出或 changelog 条目。
- 提交前再次按 `ai-ready-docs` 检查重心和阅读路径：Flag 段落收敛重复否定，另两项局部改进以正常 waiver 用法为主线、单列过宽审计并就近说明 schema 前提。更新后的材料重新验收，再保存完整 Plan 并正常结项。
