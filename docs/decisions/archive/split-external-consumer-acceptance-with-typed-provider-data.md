---
title: 以 typed provider data 拆分 external consumer acceptance
status: archived
alignment: aligned
createdAt: 2026-08-27T05:00:42Z
purpose: 让一次外部安装成为可审计的共同运算，并由独立 consumer Checks 并行验收类型、文档和运行时行为。
background: 单一 external consumer 测试进程同时安装 package 并串行执行多类验收，隐藏共同依赖、阶段失败和可调度的只读工作。
decision: 用带进程证据和清理生命周期的 typed provider Check 产生外部安装结果，下游按行为 owner 消费；Case 语义不由执行 DAG 决定。
tags:
  - configuration
  - testing
  - workflow-policy
relations:
  - type: 修订
    target: reuse-prepared-candidate-across-package-acceptance.md
---

## 目的

- 让 external consumer 的真实安装只执行一次，并以同次 Gate 可验证的 typed final data 明确连接 prepared candidate 与下游验收。
- 让类型、package 文档和运行时消费分别产生可定位的 Check terminal fact，同时复用静态 dependency graph、root capacity、timeout、transcript 与取消语义。
- 让 Test Evidence Case 继续按行为 owner 和可观察证明目的划分，不从 provider/consumer 拓扑、文件数量或性能目标反推语义边界。

## 背景

- Prepared candidate 已是 required typed provider；artifact acceptance 与 external consumer 可以消费同一个 exact artifact，而不需要从 ambient receipt 重新发现它。
- External consumer 的安装是类型、文档和运行时验收的共同物理前置工作。安装完成后，这三个消费者只读同一个 ancestry-external package tree，没有继续共享 mutation 的必要。
- 把安装和所有断言放在一个 Bun test process 中，只产生一个长阶段，无法分别呈现 install、type、docs 和 runtime 的运行中状态、timeout 与失败结论。
- Provider output 包含 invocation-local 绝对路径；必须同时绑定 exact prepared artifact、owned temporary root、closed data parser 和明确 cleanup，而不能成为跨运行缓存或 ambient path contract。

## 决策

- 采用: Project Gate 增加一个 package-tests-owned external consumer provider Check。它 direct-depend 于 prepared candidate，在真实 child process 中安装 exact artifact，并只在零退出、settled transcript 写入、closed typed stdout 解析和 provenance validation 全部成功后发布 final data。
- 采用: Provider data 使用版本化 closed shape，绑定 exact artifact path/digest、invocation-owned temporary root 下的 consumer directory、installed package containment 与 resolved public entry。下游在 child start 前重新验证当前物理 material；closed fact parser 不因 provider cleanup 变成时变解析器。
- 采用: Type acceptance、package documentation acceptance 与 runtime acceptance 使用三个独立 process Checks，direct-depend 于 provider 并只接收各自需要的受控 environment。它们可以在 root capacity 内并行，不共享 physical lifecycle mutex。
- 采用: Provider 与仍执行 build/install mutation 的 candidate lifecycle 共享 package lifecycle mutex；provider process 具有 package acceptance timeout、startup/settled transcript、取消和安全失败映射。Bound Gate Run 在所有 dependents settle 后清理 provider-owned temporary root，失败、取消和 timeout 也不能遗留该 lease。
- 采用: Artifact acceptance 继续直接消费 prepared candidate 的 artifact/staging 并保留独立 material audit；candidate lifecycle 继续在 test-local state 中证明 cold preparation、reuse 与必要 reinstall，不因 external provider 拆分而共享其故障注入状态。
- 采用: Test execution partition 继续覆盖 supported Bun surface 恰好一次；增加 provider 或拆分 consumer Check 不自动创建、合并或拆分 semantic Case。Case 只由稳定 owner requirement、可观察结果和独立证明信号决定。
- 不采用: 每个 consumer 重复安装、让下游读取 ambient receipt、共享 mutable failure-injection fixture、把 provider verdict 当作下游 acceptance verdict、在 native Check 中隐藏不可取消的同步 install，或按 Gate Check identity 机械生成 Case。
