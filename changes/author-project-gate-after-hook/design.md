# Design

本设计把 `afterGate` 的项目策略放回中央 Definition，同时通过动态模块投影保持自举 Gate 的 candidate identity 边界。

## Context

`scripts/project/gate/run.ts` 先调用 candidate preparation，把当前 `src/**` 和 package 文档构建为 tarball并安装到 `scripts/project/node_modules/@zxyycom/vibe-check`。只有随后动态导入的 `runtime/bound-run.ts` 才按 package 名加载该安装结果；它公开的 `resolvedEntryPath` 必须与 preparation 返回的 exact entry 相等。

因此，`src/**` 虽然在同一工作区保持不变，正式 Gate Product Run 消费的并不是源码相对 import，而是 candidate consumer 下的 package entry。`definition.ts` 也包含 package runtime imports，不能由 `run.ts` 在 preparation 前静态加载。

当前边界和本 Change 的目标顺序如下；箭头表示前一步成功后才进入下一步：

```text
当前 src/** 与 package 文档
  → 构建并安装 candidate
  → 动态加载 bound-run.ts
  → definition.ts 按 package 名加载已安装 candidate
  → 校验 resolvedEntryPath
  → 执行 Product Run
  → 调用 definition-owned afterGate
  → 映射 transcript 与 process exit
```

这里需要延迟的是 `definition.ts` 的**运行时加载**，不是延迟读取其配置文本，也不是让 `run.ts` 直接执行 `src/**`。Change 完成后，维护者仍只在中央 Definition 编写 Hook；bound module 负责在正确时机把该函数交给 root adapter。

当前 active Decision `centralize-project-gate-definition-and-separate-adapters.md` 把中央 Check 配置交给 `definition.ts`，但仍把 `afterGate` owner 留在 `run.ts`；本 Change 需要演进这一分界。`monitor-project-gate-performance-advisory.md` 的 advisory、workload matching 与不改变初步 status 的约束继续有效。

## Goals / Non-Goals

**Goals**

- 让一个 project-owned `afterGate` 函数在中央 Definition 中显式可见和可编辑。
- 允许该受信任函数执行任意同步或异步项目逻辑，同时保持闭合结果和 fail-closed process boundary。
- 保持 candidate preparation、dynamic import 与 resolved-entry equality 的现有顺序。

**Non-Goals**

- 不把 Gate Hook 加入 `@zxyycom/vibe-check` package public API 或 Product Definition。
- 不建立 Hook registry、优先级、插件发现、配置序列化或 sandbox。
- 不增加 invocation-level `beforeGate`，也不替代 Check-owned `preflight`。
- 不改变 performance baseline、aggregate、Check facts 或 machine schema。

## Decisions

### Intended Change

1. `definition.ts` 导出一个具名 `ProjectGateAfterHook`。默认函数显式调用 `observeProjectGatePerformance`；维护者需要多个动作时在该函数内部按代码顺序组合，不建立通用 Hook 数组。
2. `runtime/bound-run.ts` 在 candidate 准备后动态加载，并把配置好的 Hook 与 `runProjectGate`、`resolvedEntryPath` 一并投影给 root adapter。`run.ts` 不静态 import Definition。
3. `run.ts` 先比较 module entry 与 prepared entry，再创建 invocation transcript、执行 Product Run并调用同一 module 提供的 Hook。Hook仍位于初步 Gate result 之后、最终 message/exit/transcript completion 之前。
4. Hook 是受信任项目代码，可以使用 Bun/JavaScript 的正常能力；框架只冻结/验证输入输出，不宣称限制其副作用。返回值继续经过 `parseProjectGateResult`，throw 或非法 shape映射为稳定 `unavailable` message。
5. 通过后继 Decision 演进中央 Definition 的 owner 边界；性能 advisory Decision继续约束默认函数的行为，不把 observer提升为公共能力。

### Resulting Impacts

- `GateRunModule` 的闭合契约增加 Hook，所有 production loader和测试 fixture必须提供它；entry mismatch测试必须证明两项行为均未调用。
- 原 `ProjectGateSteps.afterGate` 若只服务正式配置应移除；其余 clock、candidate、transcript seams保持局部，不建立第二个配置表面。
- Hook文档必须以“result post-processing”命名并给出精确时序，避免再被误称为 Gate 前处理。

## Risks / Trade-offs

- 受信任 Hook 可以产生任意副作用；这是显式项目代码的权限，不是 sandboxed plugin。文档必须把授权和失败责任放在项目 owner。
- Definition与root adapter之间增加一项动态模块契约，但它直接保护 candidate identity，优于提前静态 import或另建隐藏 Hook 文件。
- 单函数组合不提供自动隔离；换来顺序、异常归属和最终 result保持局部可读。

## Open Questions

无。用户已确认项目 Hook 应支持任意同步或异步函数执行，并继续由中央 Gate Definition 显式拥有。
