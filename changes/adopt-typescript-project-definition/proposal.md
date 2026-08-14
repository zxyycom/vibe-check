# Proposal

本 Change 用项目持有的 TypeScript Project Definition 取代 JSON 配置，并建立一条明确调用链：

```text
其他调用方
  → 项目 Run
  → Package Run
  → 配置中的项目函数
  → 既有 Task 系统
```

项目只维护两个文件：项目配置文件和项目运行脚本。Package 提供配置定义函数和 Package Run；项目运行脚本把配置绑定到 Package Run，再向其他调用方导出项目 Run。

## Why

JSON 可以保存声明式政策，但不能直接组合项目函数或 `TaskPlan` factory。TypeScript Project Definition 可以同时表达政策、Checks、scheduler、effects、operational dependencies 和明确允许的函数槽位。

Check/Record、DecisionPolicy、`TaskPlan` 和 shared scheduler 已有当前 owner。本 Change 不建立另一套执行系统；Package Run 调用配置函数，并把产生的 direct work 或 `TaskPlan` 交给既有 Task 系统。Task 系统继续负责依赖、串并行、全局并行上限和命名资源。

项目运行脚本已经通过普通 TypeScript import 获得配置值，因此 Product 不需要发现、加载或重新执行配置文件。配置文件和运行脚本的路径由项目拥有；Package 只拥有自己的 public symbols、types、defaults 和 operational identifiers。

### Target Usage Model

| 对象 | Owner | 责任 |
| --- | --- | --- |
| 项目配置文件 | 使用项目 | 调用配置定义函数并 default export Project Definition |
| 项目运行脚本 | 使用项目 | 导入 Project Definition，调用 Package Run，导出项目 Run |
| 配置定义函数 | Vibe Check package | 提供类型推导并形成 plain Project Definition value |
| Package Run | Vibe Check package | 接收 Project Definition 与运行控制参数，执行完整产品流程 |
| 项目 Run | 使用项目 | 绑定 Project Definition，只向其他调用方暴露项目允许的控制参数 |
| Task 系统 | Vibe Check Product | 执行 direct work 或静态 `TaskPlan`，统一管理依赖、并行和资源 |

当前 public-contract source 确认配置定义 operation 为 `defineConfig`、Package Run 为 `run`；示例文件名仍不构成固定路径契约。

## Outcome

本 Change 在 `src/product/**` 建立以下可由下游单向消费的事实：

1. 一个 typed current public-contract source，拥有 package import、两个 operation symbols、必要 types、effect defaults、environment identifiers 和 operational dependency identifiers。
2. 配置定义函数的 authoring contract，以及 Package Run 在 work 前执行的 runtime validation。
3. Product 运行内核：接收一个 Project Definition value 和 closed run controls，返回 structured result。
4. Project Definition 到 declarative snapshot、public Check catalog、custom function bindings、`SchedulerPolicy` 和 `ScannerDependencySnapshot` 的确定映射。
5. 项目配置文件与项目运行脚本的 canonical usage pattern。
6. JSON reader/schema/init workflow 的 hard cut 和迁移诊断。

Project Definition 中的函数在项目调用 Package Run 的同一 Bun runtime 中执行。单个 Task 或 scanner adapter 可以使用自己的 subprocess/worker，但整次 Product invocation 不要求额外执行进程。

## Scope

纳入范围：

- 配置定义函数、Project Definition types、runtime validator 和 normalization；
- Package Run 的 Product 内核、closed run controls、structured result 和 cooperative cancellation；
- policy/gate、built-in/custom Checks、scheduler、effects 和 operational dependency configuration；
- custom runner、`TaskPlan` factory、`requiresChecks` closure 与 shared scheduler handoff；
- current public-contract source 及 consumer comparison；
- canonical 项目配置文件、项目运行脚本、fixtures 和 repository dogfood；
- JSON/schema/init hard cut、legacy diagnostics、owner docs 和 Cases；
- 向 API package Change 交付完整 definition/run/Task/dependency contract。

不纳入范围：

- npm staging、candidate manifest、public declarations、legal/release materials、pack 或 publish；
- Product CLI hard cut；该动作由下游 package Change 在 replacement acceptance 通过后完成；
- 固定项目配置文件或运行脚本路径；
- 公开 Core、manager、scanner adapter、scheduler、Task 或内部 execution binding；
- whole-invocation process isolation、permission sandbox、hot reload、plugin marketplace 或 custom-result cache。

## Success Criteria

- AI 或工程实现者能从 Design 独立恢复其他调用方 → 项目 Run → Package Run → 项目函数 → Task 系统的调用方向。
- 项目配置文件 default export 配置定义函数的结果；项目运行脚本绑定该值，其他调用方无需再次提供配置。
- Package Run 每次接收一个 Project Definition，并在任何 work 前验证 definition 和 controls；无效输入不产生部分执行。
- Package Run 直接调用明确函数槽位中的 custom runner 或 `TaskPlan` factory；函数不进入 declarative snapshot、fingerprint、machine output 或跨-runtime protocol。
- Shared scheduler 是 Product task dependency、bounded parallelism 和 named resource coordination 的唯一 owner。
- Run controls 只表达 invocation-scoped context 或允许的 operational overrides，不注册 Check、不改写 policy、不替换 scheduler，也不提升授权。
- Gate 只使用 Project Definition 中通过验证的 named policy；缺失 definition 不触发隐式 Product configuration。
- Operational dependencies 按既定 precedence 形成一个 `ScannerDependencySnapshot`，且不回退 repository state 或 ambient `PATH`。
- Current public-contract source 不包含项目文件路径，也不包含 version、host、legal 或 manifest placeholders。
- JSON config、schemas、init、dual source 和旧 dogfood 退出 active paths；legacy JSON 只产生迁移诊断。
- 下游能直接公开已验证的配置定义函数和 Package Run，而不恢复配置 discovery、loader 或另一套 execution model。

## Affected Owners

- `docs/decisions/configuration/**` 与 `docs/decisions/product-contract/**`：长期方向与理由。
- `docs/configuration.md` 与 `src/product/config*.ts`：Project Definition authoring、validation、neutral/gate 和 JSON migration。
- Check/Record、DecisionPolicy 和 orchestration owners：catalog、bindings、`TaskPlan` 和 scheduler semantics。
- `docs/scanner-dependencies.md` 与 `src/product/scanner-dependencies.ts`：operational dependency precedence 和 snapshot。
- `docs/output.md` 与 reporting/cache owners：effects、result projection、fingerprint 和 sensitive-material boundary。
- `scripts/**`：项目运行脚本模式、repository adapter 和 dogfood。
- `establish-api-only-npm-product-boundary`：public package projection、installed host、CLI hard cut 和 exact-tarball evidence。
- `docs/testing.md`、Cases、product tests、fixtures 和 workspace verifier：证明与迁移证据。
