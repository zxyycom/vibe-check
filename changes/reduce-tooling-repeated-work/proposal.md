# Proposal

以保持现有工具契约的局部索引与单次构造，减少仓库工具同次工作流中的重复工作。

## Why

工具层普查发现合法 registry、文档多目标、tar 材料、测试分区和模拟工作流存在重复扫描；这些增长机制可从当前源码和操作量独立验证，不依赖推测端到端热点。

## Outcome

相同输入仍得到相同材料、完整审计和诊断，同时去除可证明的重复读取、membership、prefix 扫描及全文重建。

## Scope

### Intended Change

仅修改 scripts 工具实现与相邻语义测试：R03 registry prefix；R04/R05 文档目标定位、构造及 delimiter；R06 tar path lookup；R07 ESM 构造；R09 同 invocation 已读取事实；R10 lane membership；R11/R12 模拟观测与静态身份；R14 topic 计数；R15 missing-link 位置；R16 invocation-local 分析与符号查找；R17 独立 canonical 文本构造。逐项采用边界记录于 design。

### Resulting Impacts

必须覆盖材料 bytes、错误顺序、Unicode 位置、冻结 observation prefix、value/type identity 与 canonical 安全拒绝；测试正文变化按既有 Case owner 复核，不新增产品行为或持久 cache。

## Success Criteria

- 每项候选均有实施或不采用理由，复杂度降低以同输入操作量为证，不虚报未测的计时收益。
- 受影响语义测试、scripts 类型/lint 与 Change 检查通过；全局 Gate 与实际 package build 由主线程统一执行。
- 不跳过 hash、完整 tar/installed 审计、全树 Test Evidence 或 Core no-emit；不改变 Analyzer、预算、网络和发布契约。

## Affected Owners

docs/tooling/workspace.md、documentation.md、repository-material-validation.md、package-artifact.md、project-gate.md、docs/testing/strategy.md 与 case-maintenance.md。
