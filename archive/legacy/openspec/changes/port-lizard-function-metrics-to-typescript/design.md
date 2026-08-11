> **核心句：**本设计只固定最终 runtime 方向和重新基线义务；parser 结构、迁移步骤与精确兼容契约必须等新基础落地且功能恢复排期后确定。

## Context

早期审计曾把 then-current port scope 收窄到 TypeScript/Rust function metrics，并确认产品仍依赖 Python/Lizard process、私有输出解析且没有 translated runtime。这些事实说明了迁移动机，但它们形成于旧 capability/output/config 架构下，不能作为未来实现的 current contract。

新的 `quality-checks` 与 `quality-records` 基础将 Check execution、CheckResult 和逐条记录分开；共享任务编排与 TypeScript Project Definition 也会改变运行和 authoring 边界。因此，本 change 当前只保留 future intent。

## Goals / Non-Goals

**Goals:**

- 最终由 Product-owned TypeScript implementation 产生 function metrics，不再依赖 formal runtime 中的外部 Python/Lizard execution。
- Backend replacement 不主动改变恢复实施时已经存在的 function-metrics 产品行为。
- 在实现前重新建立 parser compatibility、public identity、failure、performance、source provenance 与 test evidence 基线。

**Non-Goals:**

- 现在确定 parser 模块拆分、内部文件清单、exact API、切换步骤或测试矩阵。
- 借 port 增加语言、指标、记录类型、Check policy、并行模型或动态 provider。
- 修改三个基础 change、Project Definition、decision policy 或 output contract。
- 把历史审计的 selector、字段或失败模型继续当作当前规范。

## Decisions

### Decision 1: Port 在新基础落地后重新基线

实施必须等待 `establish-check-record-core`、`establish-check-task-orchestration` 与 `adopt-typescript-project-definition` 已实施或同步到可依赖状态，并由届时产品优先级明确恢复。恢复后的第一步是从主规范、源码和可重复运行中采集 current behavior，而不是沿用本 change 的历史快照。

重新基线至少要明确 supported inputs、function/record identity、measurement 与 ordering、CheckRun/CheckResult/QualityRecord failure behavior、parser edge cases、性能约束、source/license provenance 和证明策略。完成前不得翻译 parser 或切换 backend。

### Decision 2: TypeScript parser 是 function-metrics Check 的私有 backend

最终 Product-owned TypeScript implementation 通过届时 structural-scanning boundary 为 `function-metrics` Check 提供领域数据或执行失败。Check manager、Record manager、task scheduler 和 decision policy 继续由各自基础 owner 定义；本 port 不建立第二套 provider 或结果模型。

若届时 Check 使用 shared task orchestration，port 只消费已经落地的 planning/execution contract，不为 parser 工作单元创建公共 Check 或 Record identity。

### Decision 3: 兼容目标由 fresh product baseline 定义

Backend replacement 的行为不变目标以恢复时采集的 current `quality-checks` / `quality-records` 观测为准，包括输入选择、领域身份和值、稳定顺序、无结果情况以及失败如何进入 Check execution boundary。历史结果模型不能替代 fresh baseline。

具体 parser 内部结构不属于兼容面。只有会改变 CheckResult、QualityRecord、可观察诊断或受支持输入的差异才需要在切换前解决或通过独立产品 change 接受。

### Decision 4: 最终产品路径不依赖外部 Python/Lizard runtime

完成后的 formal product path 不启动或解析外部 Python/Lizard。是否使用 pinned implementation 作为迁移期 oracle、如何切换以及何时删除旧材料，由实现前审计根据届时测试与回退能力确定；本 artifact 不提前规定 exact cut sequence。

### Decision 5: 来源与许可证是实施阻塞证据

如果 TypeScript implementation 翻译或派生自 Lizard source，实施前必须确认届时采用的 upstream revision、实际 source responsibility、许可证义务和可追溯测试。当前不固定版本、文件清单或翻译方法。

## Risks / Trade-offs

- **[Tokenizer 或语言状态差异改变函数边界和指标]** → 重新采集代表性 corpus 与 edge cases，再为实际 parser contract 建立 differential evidence。
- **[Record identity、ordering 或 failure semantics 随基础重写而变化]** → 只以基础落地后的 current snapshots 和主规范作为 parity owner。
- **[同进程 parser 带来 CPU、内存或阻塞回归]** → 实施前测量 current baseline 并定义与调用场景相称的 performance acceptance。
- **[移植来源或许可证处理不清]** → 在任何翻译写入产品源码前完成 provenance/license 审计。
- **[未来 agent 将规划完整误读为可实施]** → `tasks.md` 1.1 保持未完成，并要求先重写全部 artifacts 到 apply-ready 状态。

## Open Questions

无待当前阶段回答的问题。Exact parser、identity、performance 与 test contract 是重新基线后的实施准备事项，不是当前已确认设计。
