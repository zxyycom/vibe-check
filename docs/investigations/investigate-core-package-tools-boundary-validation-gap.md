---
title: "新 Package Tools Core 边界校验器的闭包漏检调查"
id: "260912-investigate-core-package-tools-boundary-validation-gap"
formedAt: "2026-09-12T08:12:45Z"
question: "在本轮尚未提交的 Package Tools 边界校验器候选中，Core 依赖闭包为何会漏掉绝对 workspace literal import，动态 literal import 的处理又是否符合预定边界；在修复与正反证据尚未完成时，Project Gate 能形成何种可信结论？"
tags:
  - "core-boundary"
  - "package-tools"
  - "project-gate"
  - "validation"
relations: []
---

## 形成时背景

本轮 Change 正把两个可选实现迁入 `src/package-tools/`，并新增 `scripts/validation/package-tools-boundary.ts`，以证明固定 Core roots 的生产依赖闭包不依赖该目录。该脚本及其接线是本轮工作树的未提交候选；形成时 `HEAD` 为 `3dc79bf275da3ea92dba56f4760c9a5ba8cabd15`，为 Plan-only 基线。本调查只记录本次候选及其形成时工作树，不审计或推断历史发布包。

独立审查发现候选的早期 `validateCoreClosure` 仅继续处理以 `.` 开头的 module specifier。一个绝对 workspace literal import 因而不进入 `resolveModuleName` 和后续的 `src/package-tools/` 禁止判断；闭包检查可能返回成功。该缺口会令计划中的 Core 独立性 Gate 对某些合法、可解析的依赖边形成伪成功，达到治理规则“Project Gate 或发布验收无法形成可信结论”的严重条件 2，故本轮按自动授权建立本报告。

同一审查还发现 Core 的 literal dynamic import 曾被与工具侧一起拒绝。该问题不是绕过：Core 闭包需要遍历可解析的 literal loading edge，工具侧仍应拒绝动态加载。设计的 Core 闭包说明要求遍历“可解析的 literal 加载边”，工具侧语法矩阵则要求拒绝动态加载。任务 owner 已确认前者可遍历、后者继续拒绝；候选的统一拒绝是实现偏离，后续实现和验证须使这一角色差异可复核。

## 调查目的

1. 确认绝对 workspace literal import 会被候选的 Core 闭包遗漏，而不是 TypeScript 无法解析或当前 Core 已有的真实依赖。
2. 确认此遗漏对 Gate 证明范围的影响，并把它与当前工作树的真实运行时耦合分开，且不把本轮调查伪装成历史发布或包消费者影响审计。
3. 记录 Core literal dynamic import 与工具动态加载的不同预期，避免以统一拒绝替代闭包遍历。
4. 记录定向修复需要的正反验证证据，并区分已完成的边界复核与尚待主线完成的完整 Gate、Change 和包验收；本报告不修改测试义务。

## 调查范围与依据

| 检查对象与形成时依据 | 方法与观察 | 能支持的判断 | 不能支持的判断 |
| --- | --- | --- | --- |
| `scripts/validation/package-tools-boundary.ts` 的候选早期 `validateCoreClosure` | 独立代码审查定位 `if (!edge.specifier.startsWith('.')) continue`；该条件先于 module resolution 和 `src/package-tools/` 目标检查。 | 非相对 specifier 可被静默跳过，故绝对 workspace literal import 不受该路径约束。 | 不证明后来工作树中的修复已经正确，或其它语法路径已覆盖。 |
| 最小 TypeScript probe | `import { presentCheckFindings } from '/workspace/vibe-check/src/package-tools/finding-presentation/finding-presentation.ts'; void presentCheckFindings;` 在当前 strict NodeNext 配置下为 0 diagnostics；`resolveModuleName` 确实解析到工具模块。 | 该绝对 literal 是当前配置下可解析的反例，不是无效输入。 | 不证明真实 Core source 包含该 import。 |
| 当前 Core roots 的生产集合和 Core-only no-emit 观察 | 形成时实际集合为 121 个生产 TypeScript 文件，0 diagnostics，且未发现上述绝对 import。 | 当前工作树的 Core 不能作为“已有运行时工具依赖”的证据。 | 不审计或证明任何历史发布；也不证明候选 Gate 对未来或构造的绝对/alias import 完整。 |
| `changes/isolate-public-contract-consumers/design.md` 的 Core 闭包和工具语法段落 | Core 闭包段要求遍历仓库内 import/re-export 与可解析 literal 加载边；工具侧语法矩阵拒绝动态加载。任务 owner 确认两种角色规则。 | 需要按 Core 与工具角色分别编码/验收 literal dynamic import；候选的统一拒绝是实现偏离。 | 不以本报告单独改变 Change 设计或长期 Decision。 |
| 其他 layout import-boundary 的相对路径筛选 | 审查发现其同样只检查 relative import，故不能替代本校验器对 absolute 或 alias workspace edge 的职责。 | 不能把已有 layout 检查当作本缺口的补偿证据。 | 不扩大为对所有 repository boundary 的完整审计。 |

没有保存原始审查日志或 probe 文件：以上最小示例、其配置条件和结论已足以复核本轮判断，且临时材料不承担长期复现职责。

## 调查结果与边界

**已确认的形成时结论：**候选早期 Core 闭包的相对路径前置筛选会漏掉一个可由当前 TypeScript 配置解析为 `src/package-tools/` 的绝对 workspace literal import。若把该实现接入 Project Gate，Gate 的“Core 不依赖工具”成功结果不能覆盖该类边，因而不能作为完整独立性结论。该结论属于本次候选的仓库校验可信度问题；它不涉及历史发布或发布包。

**根因：**闭包遍历把 specifier 的书写形式（是否 `.` 开头）误作“是否应解析的仓库边”的判据；正确判据应是按当前 tsconfig/TypeScript resolution 得到的目标是否位于 workspace，以及目标的生产材料与 Core/工具分类。对可解析的绝对或 alias workspace literal 边，跳过 resolution 会丢失分类信息。

**修复后的本轮证据（已由独立审查复核）：**修复方已将所有 literal specifier 交给 TypeScript resolution；resolver 读取 root `tsconfig.json` 的 parsed options，只有无 config 的 fixture 才使用 fallback。解析到 workspace 的 relative、绝对和 `paths` alias edge 都进入 Core 闭包；Node/npm 是外部叶子，未知目标仍拒绝。Core literal dynamic import 会被收集、解析和遍历，工具 literal dynamic import 仍拒绝；nonliteral dynamic import 与直接 `require(...)` 继续 fail closed。实现方向不再以 specifier 是否 `.` 开头决定是否检查，而由实际解析目标和生产/Core/工具分类决定。

早期 direct-`require(...)` 证据不能覆盖 TypeScript 的 `import = require(...)`。最终独立 review 发现，Core 使用非 strict 语法策略时，后者曾被跳过，因而同样可能绕开 Core 闭包的拒绝。修复将 `import = require(...)` 明确列为 Core 与工具均 fail-closed 的 unsupported syntax，并新增 Core fixture 证明该形式报告违规；它不被当作可遍历的 literal edge。

新增 fixture 覆盖绝对 workspace import、`@workspace` alias、literal dynamic import、nonliteral dynamic import 与 Core `import = require(...)`；其中 Core → Core 为正例，Core → tool 为负例。Core-only no-emit 已从一次性命令接入 layout characterization test，当前仍为 121 files、0 diagnostics。最终子 review 已复核新增 fixture 与局部 diff，并验证 target/scripts typecheck。此前修复方报告的 layout test、scripts lint/typecheck、Test Evidence 603/138 和局部 diff 是本轮较早阶段的证据；它们不单独证明后来发现的 import-equals 语法已覆盖。本报告未自行重跑这些命令，也未将临时 fixture 或日志作为随附资源保存。

**独立复核与当前结论：**实施外 reviewer 已基于实际 diff 重跑并确认 layout test、Core no-emit（121 files）以及 absolute、`paths` alias、Core literal dynamic import 和 Core `import = require(...)` 的正反 fixture均符合预期。reviewer 还确认 `node:fs`、`immutable`、`typebox` 和绝对 `node_modules` 路径均正确归为 external，未发现新的当前可利用绕过。故本轮已证实的漏检及其后来发现的 import-equals 漏检均已由实际 resolution/classification 与 fail-closed 语法处理修复，且目标边界验证可再次支持该类 Core 独立性判断。

这一结论只覆盖本轮未提交 candidate 的定向修复与证据。完整 Project Gate、Change 验收、包 candidate 和发布验收仍由主线在同一 candidate 上完成；本报告不替代这些交付，也不将当前观察外推到历史发布。任一 root 集合、tsconfig resolution、加载语法策略或工具目录分类改变后，应重新调查或补充本轮认识。
