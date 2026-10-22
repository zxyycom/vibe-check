# Proposal

收窄已确认无关的脚本测试 required 输入，并量化跨组加载和准备的剩余成本。

## Why

单个 Product 测试正文变化仍会触发四个不消费它的脚本组，required 预算余量很小。

## Outcome

已知 Product 测试正文不再选择无关脚本组；完整验收、未知路径回退和真实扫描保持，提供同 workload 前后测量及跨组重复工作的证据。

## Scope

### Intended Change

审计脚本 lane 的 import 与非 import 输入，只排除确认独立的已知 Product 测试正文；随后测量跨组加载/准备；采用其中确认无效的两次 tooling 测试指纹重算，不合并 runner 或调整调度。

### Resulting Impacts

同步 Gate owner、选择矩阵与现有 Case；使用同候选包比较固定路径实际 Checks，完整 test/all 清单不变。

## Success Criteria

四组窄化有直接依赖审计依据；各脚本 lane 自身测试仍触发自身；实现/helper/fixture/未知路径保持；目标测试、完整 Test Evidence、required/all 和独立文档影响审查通过；收益与未采用候选如实记录。

## Affected Owners

Project Gate、测试策略/Case、Change 协调；不改 Product API、测试分区、预算或调度。
