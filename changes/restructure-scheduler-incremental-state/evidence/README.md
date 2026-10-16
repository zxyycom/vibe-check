# Scheduler 重构验收证据

本目录保存本 Change 的源码实验、原始结果和采用依据，随验收提交保留；结项删除后从该提交恢复。
它不是新的运行入口、稳定规范或独立 Investigation。当前契约由 [Scheduler owner](../../../docs/development/scheduler.md)拥有，
测试由相邻源码与 Case 拥有；已安装产物验收见 [任务验证记录](../tasks.md)。

## 建议读取顺序

1. 先读[采用说明](adoption-evidence.md)，恢复最终采用模型、收益、回退与接受的代价。
2. 用[完整性记录](after-completion-check.json)核对最终矩阵、源码起止与采样覆盖；逐 cohort 数据见
   [504 个结果与 24 个操作 cohort](comparison-all-cohorts-v1.json)。这些材料证明已完成的源码实验，不自行宣布 Change 结项。
3. 核对[任务验证记录](../tasks.md)中的实际验收、Gate/candidate 与剩余事项。installed artifact 验收归该记录，
   不能由本目录的 source-level public Run 或性能结果替代；本 README 也不推断未勾选任务已验收。
4. 需要复现时，先读[恢复说明 v2](evidence-reproduction-v2.md)，再按[精确资源清单](managed-evidence-manifest-v2.json)
   核对原字节、相对路径、依赖和对应源码身份，最后才选择命令。不能只从旧交接记录复制命令。

## 历史材料如何使用

- [implementation-handoff.md](implementation-handoff.md) 与 [README.artifact-note.md](README.artifact-note.md)
  保存形成时交接。其 remaining/followup、尚未测量等状态，以及恢复协议中的未来时措辞，不代表当前仍未完成；
  实验完成情况按上面的采用说明和完整性记录核对，Change 验收另查 tasks。
- [数值证明原稿](numeric/accuracy-proof.md)保留冻结的独立误差基准与候选推导；其中 candidate/pending 不是当前采用状态。
  最终采用结论见采用说明，稳定不变量见 Scheduler owner；不要把原稿待办转成新的实施义务。
- 原 `query-candidate-benchmark.ts`、correctness/import probes 及其 raw 输出属于历史实验：它们曾把当时的 Product query
  当作 persistent control，不能对最终 Heap Product 原样运行后冒称复现旧对照。最终 helper 绑定的可运行查询对照是恢复说明中的
  `*-replay-v2` 入口；新 replay 结果须单独命名，既不覆盖旧 raw，也不代表重建了完整历史中间源码树。
- handoff 的主矩阵命令仍由恢复说明 v2 引用；上述限制不是将所有历史 runner 判为不可用。
  被拒绝的 lazy loader 只属历史取舍，不是应恢复的运行依赖。

## 恢复边界

按清单保留相对路径与原字节，将清单与资源复制回 `tmp/restructure-scheduler-incremental-state/` 后再按恢复说明执行；
不要直接从本目录运行实验，其相对 import 以该 tmp 位置为前提。before 绑定明确 Git baseline，after 绑定
源码内容 digest；HEAD 字符串相同不代表两次工作树源码相同。计时、分配采样、操作量与 installed Gate 分别提供证据，
不能相互替代；复测仍需独占计时窗口。
