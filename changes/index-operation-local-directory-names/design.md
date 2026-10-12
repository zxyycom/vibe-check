# Design

在一次文件收集中按名字索引已观察目录条目，减少宽目录精确路径查找的重复扫描。

## Context

用户已授权优先复杂度优化；本 Change 拥有独立 Check-local Outcome，第一批 Run 优化只作为测量基线，不与其收益混算。来源见[调查](../../docs/investigations/audit-checks-core-algorithmic-complexity.md)，当前稳定语义由 proposal 所列 owner 拥有。

## Goals / Non-Goals

公共文件收集保持完全相同的 selected paths、字节身份、安全与错误语义，目标查找不再反复全扫目录。

不引入新 API、limits、waiver、外部依赖或跨调用缓存，不扩大到其它复杂度候选。

## Decisions

### Intended Change

readDirectory 按原顺序 inspect→byte readdir→entry bridge→retainEntry，再构造 entries 与 entriesByName 的同源记录。targetEntry 的 candidate.isFile、目录 fidelity 检查与首个非 symlink 选择不变；不缓存跨操作 filesystem facts。

写入范围：src/package-checks/project-files/filesystem-collection.ts、必要相邻测试和 docs/development/project-files.md。

### Resulting Impacts

同 decoded spelling 可能对应有损 UTF-8 与真正 U+FFFD，必须保留全部候选和原次序；必要 I/O、no-follow、lazy lstat 和单次目录读取证据持续成立。新增索引 O(条目数) 内存随操作结束释放。

沿用 WB-SCOPE-FILE-COLLECTION-001 与 COLLECTION-PATH-IDENTITY-001 的既有实体，不新增无独立义务的 Case。

测量协议：公共 collectProjectFiles，平目录 N=32/1024 个空文件与同数精确 patterns，useDefaultExcludes=false；fixture 建立/断言在完整同步调用 timer 外。4096 pilot 停止后已在正式 before 前共同缩小 before/after size。全部使用锁定 Bun 1.3.14，3 warmups/9 samples，记录完整样本、median/MAD/range、源码与 fixture 身份；timing 只作 observation，不新增 CI SLA。完成后的单 run 样本须低于 10 秒，独立 pilot 进程另设 20 秒硬 deadline，整轮 5 分钟有界停止。

## Risks / Trade-offs

Map 不能覆盖同 spelling 候选；完整 pattern matcher 仍有自身成本，不能把 lookup 改进外推为整个 collector 线性。

## Open Questions

无设计或验收阻断问题。已完成的操作计数、完整路径 timing 与噪声边界见下节；后续扩展负载或优化范围须重新取证。

## Implementation Observations

最终 N=1024 名称比较从 1048576 降至 0，源码确认一次索引构建及逐路径 bucket lookup。
完整调用主 median 1223.450→1243.457 ms；最终同窗 control 为 2412.190→1866.548 ms，但宽范围重叠，
未证实稳定整体提速。broad `**/*.ts` control 的范围也重叠，没有可区分的回退或收益结论。
按预定成功标准接受目标重复扫描消除；matcher 等剩余成本保持本次范围之外，整个 collector 的线性或时间收益均未证实。

两项探索影响了协议与最终来源：4096 pilot 在 20 秒 deadline 后退出 124，没有合法 wall sample；
512 pilot 通过，1024 pilot 约 1139 ms，正式 before/after 共同冻结 N=32/1024。
初轮完整调用主 median 1223.450→1307.843 ms、同窗 control 1227.781→1257.068 ms，范围高度重叠。
首轮 Gate 的 `targetEntry` 圈复杂度超限后，提取 `validatedDirectoryEntry`，独立承接同名 bucket 的
完整 fidelity 验证与首个非 symlink 选择，外层保留逐段路径推进；随后补测得到上述最终结果。
独立复核与第二轮 43/43 Gate 通过，未调整阈值或 waiver。失败 pilot、初轮原始样本与最终证据分别保留在
[实施调查](../../docs/investigations/verify-priority-complexity-optimizations.md)。
