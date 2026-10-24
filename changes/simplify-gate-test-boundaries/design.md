# Design

以最窄充分测试边界减少重复工作，以严格离线真实安装保留 package 验收；局部操作量收益与完整 Gate 结果分别取证。

## Context

前七版已保存至 `4cf52b42`。本次从 Bun 1.3.14、780 entities / 191 Cases / 16 topics 起点继续，完成预算矩阵、单次扫描、Bun 1.4.4/离线安装、断言兼容、Worker 代表场景和文件发现优化。末轮范围 guard、dependency 测试前提、文档整理与独立审查均完成，最终完整验收通过，证据见 [tasks](tasks.md#evidence)。稳定规则以 [proposal 的 owner 导航](proposal.md#affected-owners)为准。

## Goals / Non-Goals

保留真实行为观察，减少大 fixture、重复扫描、安装联网和无效文件遍历的成本。全新仓库外 consumer 使用缓存完成真实安装，缓存缺失明确失败，联网进入显式准备。

Product、公开 API、lint、其它依赖版本、Gate 资格、预算及 timeout 均保持。当前授权覆盖必要提交、既有 hook 推送和正常 Change 结项，不包含正式 package 发布。

## Decisions

### Intended Change

| 边界 | 方案与证明责任 |
| --- | --- |
| Markdown 预算 | 三条同目标引用，使用 `false/false`、`3/3`、`2/false`、`false/2`；成功分别计数三次，超限精确区分 occurrence/target-read 且无 Records/data。constructor 独立验证大安全整数。 |
| Static discovery | 同一文件集合经 sgconfig 扫描一次，封闭分类 native、alias、dynamic、parameterized 四种 rule ID；native 与独立 JUnit 闭合，unsupported 保留位置。进程异常、未知 rule ID、malformed 流或倒置源码/元变量范围拒绝整次结果。 |
| 扫描测试 | seam 证明调用次数、参数/取消透传及进程/输出矩阵；真实小 fixture 证明四规则配置、位置和 static-only/runtime-only，不需要完整仓库或依赖安装。 |
| 严格离线安装 | Bun 1.4.4 的原生 offline 安装 exact tarball，cache miss 失败；external consumer 每轮 fresh，copyfile 隔离缓存。private candidate 的 reuse/reinstall/rebuild 语义保持。 |
| 显式缓存准备 | `package:cache:prepare` 使用 artifact builder 的 release-manifest 投影，在一次性目录联网准备生产依赖；env:setup 在 build 前调用。临时安装始终清理，留下标准 Bun 缓存。 |
| 断言兼容 | JSON 内容调用点使用 test-only 严格值比较；默认 strict assert 和独立原型、冻结、字段、类型、顺序、引用观察保留。Product 数据不变。 |
| Case 查询 | 15 个已有包工具 Case 和本轮新增离线 Case 归入 package-tooling；ID、Owner、Entities、Proves 连续，文件行数门限保持。 |
| Worker 宿主 | 纯函数证明四种 input-type 拼写；真实 Node/Worker 用普通 V8 flag 和 alias split 分别证明默认继承/过滤，观察 preload、read、finalize 和无失败。 |
| 文件发现 | 每次发现内复用 glob；全部 include 已有真实匹配且 ignore 确定覆盖子树后才剪枝。保留 include 先于 ignore 的存在性诊断、supplemental、排序、符号链接边界及非排除树的重新读取。 |
| 最终代码复核 | 按完整编码规范审查全部变化 TypeScript 模块及直接调用边界；dependency 测试在读取前明确状态/引用前提，实体和 Case 保持。 |
| 文档收敛 | 当前范围与验收归 Change，稳定安装/测试规则归 owner，形成时认识归 Investigation；以阅读任务核对重心、状态和边界，再作机械验证。 |

### Resulting Impacts

1. Markdown 及 discovery/closure/cancellation Case 保持身份并同步实际证明；包工具新增稳定查询分类，不扩张测试义务。
2. [Case 维护](../../docs/testing/case-maintenance.md#全树闭合)拥有扫描与文件发现语义；[Package lifecycle](../../docs/tooling/package-lifecycle.md#严格离线安装与显式缓存准备)拥有安装策略，Workspace 和 Package release 只保留入口/前置摘要。
3. Product 和公开用户行为未变；README、Check 指南、schema、示例与发布映射无需更新。非实施代理从实际代码 diff 反查这一判断及测试/内部说明。
4. 局部测试、全树 Case、工程/材料检查、完整 all、cold integration 和 consumer types 分别覆盖对应边界。性能测量区分 fixture 减重、相同输入操作量优化与完整交付结果。

## Risks / Trade-offs

- 三条引用不再执行超过旧 10,000 阈值的专门回归；大整数 constructor 测试不是隐藏执行上限的等价证明。真实 Worker 也只运行两个分支代表，其余拼写由纯函数覆盖。
- config 扫描顺序可不同，实体身份通过既有规范化保持；位置与 unsupported 阻断仍须完整。
- 没有新增 consumer lock，semver 使用缓存 metadata，跨缓存依赖图和 registry 最新满足版本不保证一致；变更依赖或 cache miss 后显式准备。copyfile 的复制成本换取可变文件隔离。
- 文件发现剪枝同时放弃观察排除子树内部的读取错误；显式 roots/supplemental 仍严格验证，include 尚无见证或 ignore 不能覆盖整树时继续遍历。
- 第十版和末轮修正后的单次 all 均通过原三项预算，分别记录在 tasks。局部操作量收益与完整验收各自成立，跨轮耗时差不证明局部改动的因果收益或未来持续达标。

## Open Questions

无待决定的方案、授权或验收问题。按已有授权保存完成态并结项；未验证边界由 tasks 承接。
