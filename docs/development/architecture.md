# 架构

Vibe Check 是可嵌入项目代码的检查运行时：项目声明要执行的 Checks，Product 负责把这些声明变成一次有约束、
可结算、可观察的运行。本文说明系统边界、能力分层、组件协作和顶层源码归属；具体协议与实现由各领域文档维护。

## 设计思路

架构围绕四个分离展开：

- **项目策略与通用机制分离。** 项目决定检查什么、怎样组合和怎样解释整体结果；Product 提供统一的声明、执行与结算机制。
  因而同一运行时既能服务本仓库 Gate，也能被其它项目集成，而无需识别项目文件布局或具体 Check ID。
- **核心机制与领域能力分离。** Core 理解普通 Check 协议，具体检查和可选工具通过公开契约接入。
  增加领域检查或替换策略实现，应主要改变该能力自身，而不是扩展 Core 的特殊分支。
- **执行权限与策略决定分离。** 策略提供选择，运行时掌握准入、执行和取消。可替换策略由此复用同一组合法性约束，
  而不是各自实现一套调度与资源控制。
- **执行事实与结果解释分离。** Check 结算形成稳定事实，聚合与输出消费这些事实。质量结论、呈现方式和输出失败可以
  分别解释，避免某种报表或缓存机制反过来定义检查结果。

这些分离决定组件边界；目录、公开 API 和依赖检查是对边界的表达与约束。

## 系统边界

系统有三个责任范围：

| 范围 | 责任 |
| --- | --- |
| 项目代码 | 拥有 TypeScript Project Definition 和绑定它的 Project Run，选择 Checks、工具与策略，并解释项目层结果。 |
| Product runtime | 接收 Definition 与本次 Run Controls，完成验证、调度、Check 执行、事实结算和结果交付。 |
| 仓库工具 | 拥有开发、验证、打包和 Gate 等工作流；本仓库 Gate 也是 Product 的公开 API 消费者。 |

Product 的正式集成方式是程序化 API，不提供 CLI/bin，也不负责发现或重新加载项目配置模块。
Check 和策略回调作为调用方的可信代码执行；运行时提供能力投影与协作取消，不提供进程级沙箱或强制终止能力。
公开集成契约见[API 机制](../api-mechanics.md)，仓库接线见[Project Gate](../tooling/project-gate.md)。

## 能力分层与扩展方式

**Core** 拥有普通 Check、Project Definition、Run、结算和输出所需的共同机制。**Core API** 是其中对外公开的契约，
既包括运行和编写入口，也包括可独立复用的 **Core 工具**。例如公开的数据工具与 Core 共用数据边界实现；
便利函数可以承接局部任务或常用组合，其实现仍由实际机制 owner 维护。

**随包 Check** 与用户自定义 Check 使用同一协议。每项 Check 拥有领域选项、测量、结果和不可用原因；
Core 负责通用生命周期。scanner 和共同的文件收集能力因此位于检查领域，而不是独立的核心执行体系。

**Non-core 工具** 提供可选算法、编写或呈现能力。其准入判据是：移除具体工具及其公开导出后，Core 的契约、
默认行为和机制仍完整，且无需替代实现。工具及其私有支撑归入独立工具层，Core 不得直接或间接依赖它。
工具只消费该层内实现、按公开身份确认的 Product 符号以及[依赖门禁](../tooling/workspace.md#package-tools-依赖边界)允许的外部模块，不能消费 Core-private helper。
Core 通过公共 Check/strategy 协议调用项目注入的能力，与依赖某个具体随包实现分别判断。

共同能力的归属由它维护的不变量决定。工具需要 Core-private 能力时，应先审查真实耦合；只有能力对外部调用方也有
可用契约时，才在原 Core owner 公开并复用单份实现。复制核心算法、增加私有例外或机械导出私有模块都不能替代边界设计。

**公开 API、随包交付与 Core 归属是不同维度。** 公开 API 包含 Core、工具和 Check 的公开面；“随包工具”可以是
Core 工具，也可以是 Non-core 工具。源文件中的 `export` 只声明模块导出，公共身份以 package root 为准。
具体使用从[用户指南](../navigation.md#随包用户材料)进入，可选工具的内部职责见[随包工具实现](package-tools.md)。

## 组件如何协作

正常执行的主链路把项目声明逐步变成稳定事实，再交付给调用方；配置错误等提前返回分支由[API 机制](../api-mechanics.md#runresult-分支)定义：

```text
项目代码：Definition + Run Controls
                  │
                  ▼
Product：验证与归一化 → Run（调度 → Check 执行 → 结算）
                                                │
                                                ▼
                                         冻结的 Check facts
                                                │
                                                ▼
                                      显式聚合 / 机器输出 / RunResult
```

**声明边界负责确定本次运行的合法输入。** Definition 表达项目组合，Controls 表达本次调用。
声明验证与归一化在执行工作前闭合；回调作为可信运行能力保留，而不是声明性数据。
详细规则由[Project Definition](project-definition.md)拥有。

**Run 负责一次调用的协调，Scheduler 是它的内部组件。** Run 建立调用上下文并完成统一的 flag control，
Scheduler 根据依赖和资源约束准入工作，Check execution 在被准入的任务中完成 preparation、执行和结算交接。
策略只提交决定，Scheduler 保留合法性、资源、取消与 drain 的权威。
调用接线见[Project Run](project-run.md)，调度机制见[Scheduler](scheduler.md)。

**Check settlement 是终态事实的唯一形成边界。** Check 提供自己的结果与 supplemental Records，Core 验证并封闭它们。
冻结快照只包含 Checks 与 Records；调度状态、回调、scanner 原始数据和 invocation-private 引用各留在其所属生命周期。
事实不变量由[Check 结果](check-results.md)拥有，调用内依赖交接由[Project Run](project-run.md#check-执行与依赖交接)拥有。

**聚合与输出是事实的消费者。** 显式聚合解释所选 Check 状态，机器输出投影已封闭事实；二者都不重算领域结果。
进度与诊断另从运行时观察自身拥有的过程事实，不经机器文件反推过程，也不回写 Check 结论。
这样，输出故障可以与质量结果区分，新增观察方式也无需改变 Check 模型。
具体接线见[聚合](check-results.md#explicit-aggregation-and-repository-gate-mapping)、[机器输出](output-maintenance.md)与[人读输出](human-output.md)。

## Source module boundaries

顶层源码按上述稳定责任组织。表中标为 Core 的六项中的生产模块构成依赖门禁使用的 Core roots：

| 范围 | 源码归属 | 架构责任 |
| --- | --- | --- |
| Core | `src/check/**` | 普通 Check 协议与身份。 |
| Core | `src/project-definition/**` | 项目声明、验证与归一化。 |
| Core | `src/project-run/**` | 一次 Run 的协调、调度与执行。 |
| Core | `src/check-settlement/**` | Check/Record 事实与终态闭合。 |
| Core | `src/data-boundary/**` | 跨 Core 组件共同的数据不变量。 |
| Core | `src/machine-output/**` | 已封闭事实的版本化机器投影。 |
| 随包检查 | `src/package-checks/**` | 领域 Checks、Check-owned scanners 及其共同能力。 |
| 可选工具 | `src/package-tools/**` | 可移除的工具及其私有支撑。 |

Project Definition 与 Check facts 不相互依赖，二者都依赖普通 Check 协议。Scheduler 属于 Project Run，
Check-owned analyzer 属于具体 Check；目录深度表达这种父子责任，同级目录表达同一父级下的不同职责。
私有实现跟随所属模块，共享实现按共同契约归属，而不是按函数形状集中到全局工具目录。

`src/index.ts` 是唯一 public package entry，只组合公开面；它不改变组件归属，也不形成 deep-import API。
源码模块默认通过具体职责文件协作，不额外建立 barrel 或 compatibility re-export。仓库脚本由 `scripts/**` 拥有，
Product 不反向依赖脚本、文档、fixture 或测试工具。文件命名与拆分原则见[编码规范](coding-style.md#8-目录文件与模块命名)，
具体 Run 子模块见[Project Run](project-run.md#run-子模块)，工具子模块见[随包工具实现](package-tools.md)，
脚本布局与机械约束见[工作区工具](../tooling/workspace.md#source-owners-and-dependency-direction)。
