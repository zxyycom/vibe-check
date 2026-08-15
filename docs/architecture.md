# 架构

本文是 Vibe Check Product runtime 的组件职责与调用边界 owner。支持的调用方向是：

```text
其他调用方 → 项目 Run → Package Run → 项目函数 → Check/Task 系统
                                      → validated model → effects/result
```

本文中的 **Package Run** 是架构角色：当前由 `src/product/run/index.ts` 的
`run(Project Definition, Run Controls)` Product operation 实现。它不表示仓库目前已经提供可安装的
npm package；root manifest 仍是 private workspace，installable projection 由下游
`establish-api-only-npm-product-boundary` Change 交付。

项目 Run 已绑定一个项目拥有的 TypeScript Project Definition；其他调用方只提供该项目允许的
Run Controls。Product source 拥有 definition/run operations 和 runtime behavior；下游 package 只能
投影这些 operations，不能重新定义它们。Product 不拥有项目 module 路径，也不发现或重新加载配置文件。

## 核心定位

Package Run 在任何 project function、dependency preparation、cache、scanner、reporter 或 output work
之前验证完整 Project Definition 与 closed Run Controls。验证成功后，它把 frozen declarative data 与
trusted function bindings 分开：前者参与 catalog、fingerprint 和 machine projection，后者只留在当前
Bun runtime 的 execution owner 中。

现有 Check/Task foundation 是唯一执行系统。Package Run 不建立第二个 scheduler、manager、worker
protocol 或 custom-result cache。

## 调用链

1. 项目配置 module 调用 `defineConfig` 并 default-export plain Project Definition value。
2. 项目 Run 普通 import 该 value，调用 Package Run，并决定向其他调用方暴露哪些 controls。
3. Package Run 验证 definition/controls，将 authoring-only Check tree 归一化为 flat public Check catalog、
   resolved dependencies/mutex/caps、policy、effects、scheduler 与 operational dependency inputs。absent leaf
   不进入 catalog；tree group 不进入 CheckRun、Record、policy 或 machine output。
4. Package Run 直接调用 applicable custom runner 或 applicability-time `TaskPlan` factory；not-applicable
   Check 不调用 factory。
5. Check adapter 把 direct work、Task leaves 与 completion work 交给 shared scheduler。
6. Final Core snapshot、reference facts 和 validated named policy 形成 decision 与 publication model；
   logs、progress、cache、files 和 structured Run Result 都投影自同一次 invocation facts。

## 组件职责

### Package Run

- 要求每次 invocation 恰好一个 Project Definition；缺失或无效输入返回 typed configuration result。
- Run Controls 只拥有 project root、changed files、一个 explicit comparison、cancellation、effect override
  和 operational dependency override；不能注册 Check、替换 scheduler 或改写 policy。
- 只允许 Project Definition 中已经验证的 `selectedPolicy`；neutral observation 使用 `null`。
- 在 selected built-in work 前解析 dependency snapshot，并在所有路径上返回 distinct result variant 与
  effect status。

### Check/Task system

- Public catalog 只含 Check/record metadata；bindings、TaskPlan、Task value、ports、scheduler state 和
  executable 不进入 public data。
- Project Definition 直接组合 frozen built-in descriptor 和 custom leaves。leaf presence 表示选择；tree
  array order 不表达执行顺序。group/leaf 的 `dependsOn` 与 `mutex` 向下追加、去重；只有前者表达
  Check prerequisite，后者表达 named resource。
- Built-in descriptor values own immutable `.replace()` / `.append()` authoring conveniences. Product
  materializes only its own descriptors back to closed data before tree validation, so these methods do
  not enter fingerprints, Core, bindings, scheduling state, or output.
- `requiresChecks` 在 execution 前闭合 Check dependency。合法 `passed`、quality `failed` 和
  `not-applicable` 可满足 prerequisite；execution/result/record/ack failure 会阻断 dependent user work。
- Shared scheduler 使用一个 root `SchedulerPolicy.maxParallel`，同时管理 direct work、Task leaves 和
  completion work；task dependencies 决定等待，named resources 决定互斥。一个 resolved Check 可从最近
  group/leaf `maxParallel` 按最近值继承或覆写 root budget；整条路径未声明时才使用 root。它从 first executable direct/leaf admission 到
  direct/terminal completion settlement 期间临时收紧整个 invocation，所有 active caps 与 root 取最小。
  低 cap ready 时同一 scheduler reservation 后非抢占 drain；active constrained Check 的 ready task 优先。
  cap 只存在于 private scheduler handoff，不进入 CheckDefinition、TaskDefinition、policy、Record 或 output。
- `FinalCoreSnapshot` 是 definitions、runs、records、integrity 和 completeness 的唯一 Core facts。

### Scanner adapters

Adapter 只消费 Product 批准的 exact inputs 和自己的 dependency slice。它隔离 availability、subprocess、
parser、private payload、cache/backend identity 和 raw material；越界 source batch 在 record conversion
前整体拒绝。单个 adapter 可以使用 subprocess 或内部并行，但不能改变 Product task graph、shared
scheduler，或 Check-scoped cap 所管理的 Product Task slots。

### Output and effects

Output 从 validated snapshot、reference facts 与 decision 构造一个 publication model。Machine set、
`report.md` 和 console 不重新计算 Check、record、policy 或 gate facts。Output failure 使用 typed effect
result；pre-work configuration failure 不产生 output I/O。Machine schema 与 artifact lifecycle 的精确
契约见 [Output](output.md)。

## Runtime 边界

- Project functions、imports 和 closures 在调用 Package Run 的同一 Bun runtime 中执行；Product 不通过
  source serialization、module reload、IPC 或 whole-invocation worker 重建它们。
- Project functions 是 trusted project code。Product 不承诺隔离 `process.exit`、同步无限循环、global
  mutation 或 non-cooperative work；cancellation 只在 Product 拥有的阶段边界被观察。
- Product runtime 不 import `scripts/**`、docs、fixtures 或 toolkit gitlink。Repository dogfood 由
  `scripts/quality/project-run.ts` 单向调用 Product。
- Project module paths 只是各项目 convention，不属于 current public contract 或 discovery protocol。
