# Design

让扫描输入表达扫描义务，让持久缓存身份只在 owning cache 路径形成。

## Context

实施前 `prepareExactInputSet` 无条件 fingerprint 当前全部内容并取得 Git identity，measurement 又把这些字段当作扫描必填值。
[Project files](../../docs/development/project-files.md#exact-input-fingerprint)已将 fingerprint 定位为内容 cache 隔离能力；
public Duplicate facts 不发布该私有 fingerprint。用户授权此次分离，main 基线为 `3f2aa722`。

## Goals / Non-Goals

- 目标：移除未消费的内容读取/hash/Git 工作，保持扫描与 cache 各自完整的边界。
- 非目标：新依赖、新 cache policy/格式、按文件 metadata 跳过 cache-on 内容校验，或减少 scanner 输入安全检查。

## Decisions

### Intended Change

`DuplicateDetectionExactInputSet` 只包含 `rootDir`、稳定 sorted/unique `approvedExactPaths` 与 `areas`。
`cache/identity.ts` 拥有完整 cache preparation，返回 `{ cacheRootDir, identity }`；纯 identity builder 显式接收
`commitSha` 与 `inputFingerprint`。measurement 分别验证扫描必需事实和完整 cache identity。

执行顺序为 collection → 少于两个输入时 not-applicable → 扫描输入验证 → 实际 availability/version
→ enabled 时一次 cache preparation → lookup → miss 时 scan/whole-input acceptance → 使用同一 identity write
→ 当前 area policy。disabled 用明确的 `null` prepared cache；availability 失败先退出。

identity preparation 使用原 `fingerprintProjectFiles` 的内容规范化、路径排序、commit 和 scanner configuration；
异常映射 `source-unavailable`。其 metadata 验证不是 readability preflight，scanner/read 边界继续承担真实读取义务。
cache-key/payload 实现与同步/awaited 写入保持不变。

### Resulting Impacts

- cache-off 路径的 I/O 减少，但 source collection、availability、scanner execution/parse、exact acceptance 的失败结算保持。
- 原 fingerprint 的不可读 sentinel 不是 readability preflight；移除 cache-off fingerprint 不代表移除有效读取校验。
- cache-on 身份取样时点不得无意越过 scanner execution；明确 lookup、miss、scan、write 使用同一身份。
- 内部说明交代新的责任边界；用户参数和结果未变化时不制造公开迁移说明。

## Risks / Trade-offs

调整私有模型和执行顺序可能改变 malformed input 或 cache-write failure 的优先级；只移动无消费者的工作。
cache 默认启用，因此不承诺所有现有调用或 Gate 更快。省去一遍完整输入处理是操作成本证据，端到端收益另测。

## Open Questions

无待决定的问题；私有 cache preparation 类型与调用点已收敛，实施、独立审查及组合验收完成，Plan 保留。

## Implementation Observations

以下实施与计时记录绑定 2026-10-13 本切面冻结镜像，不证明后续文档／等价代码整理后的源码重新测量；
上轮组合验收与本次整理后验收分别记录在 tasks 中。

实施自验证：Bun 1.3.14 / Node 24.18.0；18 个 Duplicate entities 行为通过，Product typecheck/lint
通过，Case closure 704/704 通过。没有新增 entity key。既有 direct callback entity 扩充独立子进程内置模块 spy，
直接观察 cache-only source reads/fingerprint hashes/Git invocation/cache-directory resolve；父 runner 不修改宿主模块。
同一 entity 另验证 scan 前身份取样、scan-source mutation 后 miss/unchanged hit、version/path/scanner 下界失效，
及 collection 后 version probe 删除源时 cache-off 仍由真实 scanner read 失败结算 execution-failed。

before 操作量（两个 source）：cache-off 2 reads / 3 fingerprint hashes / 1 Git / 1 directory resolve；
unavailable 同量；单 input no-eligible 为 1/2/1/1。candidate 三条非消费分支均为 0/0/0/0。
cache-on 两版均为 2/3/1/1，实际 availability/version 仍每次执行，scanner 自身读取未被移除。

性能辅助物在 `tmp/optimization-wave-20261013/duplicate-identity/`，源镜像位于
`node_modules/.duplicate-identity-{baseline,candidate}/src`；差分只含八个 Duplicate 源/测试路径，
20/20 public API cell smoke 通过。正式协议区分 small 2×4 KiB / large 64×512 KiB 与
cache-off/hit/miss/no-eligible/unavailable；custom synthetic scanner 真实读取 exact source，但不模拟 jscpd tokenization，
因此不得外推真实 Gate 收益。证据保留去向见辅助目录 artifact-note。

正式采样于 2026-10-13 04:53:47–04:55:13 UTC 独占完成，每 cell/variant 1 warmup + 10 正式样本、逐 replicate 交替版本顺序；仅计 public Run，排除 import 与 hit seed。root 与非实施代理各自复算 220 条 raw 的状态/reason/零 Records 和 summary，root 另验 source/harness/protocol hashes 全部未变。small cache-off median 90.13→84.19 ms，large 156.63→104.01 ms；no-eligible 两规模约 27.57/29.03→21.40/22.38 ms；unavailable small 28.50→21.91 ms、large 80.66→25.41 ms。large cache-off 及两规模 no-eligible/unavailable 的 10 对均 candidate 更快。

cache-on 操作量未减少，不把计时浮动作为采用理由：small hit/miss 配对 median 分别 +0.43%/+0.99%，large -6.05%/-5.88%；raw 保留全部样本，不用总体平均掩盖分支。采用依据是三条非消费路径消除完整输入读/hash与 Git 工作、保持最小 cache owner 分离；不是默认开启缓存的调用普遍加速。p95 在每 cell 10 样本下等于最大值，maxRSS 包含完整子进程/import/hit seed，不能冒充 timed-only 内存改进。独立 reviewer 复跑 Duplicate 18/18 通过且无实质阻断；最终组合 Gate 43/43 通过，含实际安装包验收，完整日志与告警边界见 [任务交付证据](tasks.md#delivery-evidence)。

## Historical evidence handoff

2026-10-17 补存：[本切面历史验收材料](evidence/historical-acceptance.json)承接仍需复核的样本、方法、身份与边界。
本页其余 `tmp/`、旧 `.log/` 路径仅标注形成时现场，不再承诺保留、读取或执行；历史 source digest 不等于
可重建当时全部未提交源码。源码镜像、fixture、生成 IO、完整 profile 与一次性工具退出，未重新采样或运行 Gate。
这些材料只解释本 Change 的形成时验收，不是永久 benchmark 或可重跑 SDK。
