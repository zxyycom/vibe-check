# Design

本 Draft 在现有 flag 章节补齐命名与复用的指导，以一个主示例和简短的 helper 变体展示现有能力。

## Context

- [Check authoring 指南](../../docs/guides/extending-check-lifecycle.md#按-flag-选择-check)拥有条件 grammar 与 selection，
  当前示例以内联 `when` 为主，适合作为命名复用指导的唯一落点。
- 命名条件和 helper 都提供普通 AST，沿用[Definition 的复制与验证](../../docs/development/project-definition.md#flag-enabled-checks)；
  [Run 的 effective flags](../../docs/development/project-run.md#change-preparation-and-flag-projection)保持现有语义。
- [派生 flag 评估](../evaluate-declarative-derived-flags/design.md)保存手动方案与基线核对；本 Change 独立改善用户指导。
- [文档维护 owner](../../docs/tooling/documentation.md)规定正文、示例源与投影的编辑入口。

## Goals / Non-Goals

- 目标：用户能够选择常量或 helper，跨 Check 复用条件，并正确理解条件与 token 的区别。
- 范围：现有指南中的短小使用指导；Product API、运行行为与 caller-token 计算教程保持原范围。

## Decisions

### Intended Change

暂定在“按 flag 选择 Check”内增加命名条件复用小节：

1. 主示例将 `all` / `any` 的组合提取为语义化 `CheckFlagCondition` 常量，在两个 Check 的 `when` 中复用。
2. 简短变体展示接收条件、返回组合条件的普通 helper：固定组合优先使用常量，输入变化时再参数化。
3. 说明也可共享完整 `CheckFlagEnablement`；propagation 应与消费 Check 的依赖语义一致。
4. 对比 `when: namedCondition` 与 `when: "namedCondition"`：前者复用 AST，后者测试同名 token presence。
   helper 构造 AST，变量名与函数名不会自动进入 `project.flags`。若使用 `changeFlag`，仍需同一 Definition 声明 region。

沿用现有专题与入口；进入 Plan 时确定最小示例落点及投影方式。

### Resulting Impacts

- 用户可观察变化仅为指导更完整；现有 grammar、API 与运行行为保持不变。
- 受管示例应编辑源与投影接线，再运行 `bun run docs:api:write` 和 `bun run docs:api`；非受管正文直接编辑。
- 实施时核对常量跨 Check 复用、helper 可组合与 flags 投影边界，优先使用已有证据及最小运行核对。
- 实施验收运行 `bun run validate` 与 `bun run test-evidence -- check --root .`，并由非实施代理反查：
  仅持随包材料的用户能否完成命名复用任务。该验收要求适用于后续指南实施。

## Risks / Trade-offs

- “预定义 flag”容易被理解成预先生成 token；教学术语统一为“预定义条件”。
- 过多封装与重复 grammar 会遮蔽简单用法；正文以常量为主线，helper 作为局部变体，完整规则引用原章节。

## Open Questions

- 进入 Plan 前确定：示例使用现有非受管章节的手写代码，还是接入受管 source 与投影？
