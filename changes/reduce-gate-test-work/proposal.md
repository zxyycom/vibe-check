# Proposal

减少测试的重复工作和 required 的无关执行，以受控前后测量交付，不降低完整验收覆盖。

## Why

现有日常 Gate 的累计执行成本主要在测试。包 manifest 测试重复计算未变化的指纹，编译器边界矩阵逐例启动进程；共享源码目录的测试正文变化还会带起无关测试组。

## Outcome

全部既有证明目的和完整验收保留，包测试少做相同工作，已审计的测试正文修改在 required 中只选择相关消费者，并有可复核的 before/after 数据。

## Scope

### Intended Change

先优化两个 package 测试，再收窄已知测试正文的 required regions。保留 helper、未知路径、非 import 文件读取和实际共享实现的保守输入；不改 Product、并发、预算、完整 lane 或 presets。

### Resulting Impacts

更新 region 矩阵、当前选择 Case 和 Gate owner。新增的测量脚本与数据只属于此临时 Change，不是根命令、产品 API 或第二个 Gate 入口。

## Success Criteria

- manifest 的每次输入变更仍导致独立指纹断言；编译器完整非法矩阵、真实 CLI version 与 TS6 API 证明不变。
- 每个当前测试文件仍选择其拥有的 lane；共享 helper、实现、未知路径与 function-metrics inventory 输入不漏选。
- `--test` / `--all` membership 和完整 Test Evidence 闭合不变，正式 complete Gate 通过。
- 相同环境和固定负载比较多次样本；明确区分局部、受控 Checks 和正式 Gate 耗时。

## Affected Owners

Project Gate、Workspace tooling、Package artifact、测试策略和 Case 维护；Change 协调仅登记当前串行执行范围。
