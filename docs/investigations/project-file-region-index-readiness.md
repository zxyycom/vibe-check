---
title: "文件—区域索引 API、消费与重建准备"
id: "261011-project-file-region-index-readiness"
formedAt: "2026-10-11T10:09:50Z"
question: "如何以最小无 I/O Core 值数据 API 提供安全双向关系、追加重建和必要内部复用？"
tags:
  - "files"
  - "product-contract"
relations: []
---

## 形成时背景

本轮为 Change `add-project-file-membership-queries` 的 0.3 工程准备。2026-10-11 工作树干净，HEAD 为
`0aeb0d0efa514d165c07edfe8e3771e209593515`；`git merge-base --is-ancestor 2b2489cf HEAD`
实际返回 0，已继承收集完整迁移。两条 active Decision 保持 unaligned，不能用本报告代替验收。
前序[收集调查](project-file-collection-readiness.md)回答磁盘获取与路径身份；本轮回答纯值关系 API，
两者是不同问题，旧报告仅作背景，故没有认识演进边。

## 调查目的

确定不引入获取框架、路径策略或复杂增量的公开签名、校验、存储、最小消费与成本验证方法，解除实施门禁。
关系必须保存来源实际成员，规则参与全量文件域重建，旧视图隔离，所有动作无 I/O。

## 调查范围与依据

读取 Change 三份 artifacts、两条 Decision、完整编码规范、Architecture、Project files、公开收集指南、
`src/data-boundary/{closed-values,project-path,config-glob}.ts`、file-metrics execution/records、duplicate area-policy
及 Run changes/git。CodeGraph 确认 `collectAreaScope`、`matchedProjectChanges` 位置；反向属性查询没有结果，
以限定 `src/package-checks/file-metrics` 的 rg 补齐消费者。未调查 function analyzer 算法。

当次完整 Test Evidence 起点为 670 entities / 164 Cases，locked Bun 下通过。读取公开 root、示例 registry、
package mapping 与 artifact owner，确认新增公开工具需包根、中文 JSDoc、随包专题、受管 runtime 示例和安装后验收。

## 调查结果与边界

### 精确 API 与校验

选择 `createProjectFileRegionIndex(sources?: ProjectFileRegionSources): ProjectFileRegionIndex`，
sources 为 `{ fileSources?: readonly (readonly string[])[], regionSources?: readonly (readonly ProjectFileRegion[])[] }`。
每份源直接是值数组，不需要名称、回调或 provider。省略整个 sources 得到空视图；显式非法值拒绝。
region 为判别联合 `{ kind: "patterns", id, patterns }` 或 `{ kind: "members", id, files }`。

| 边界 | 选择与理由 |
| --- | --- |
| 文件域 | fileSources 与所有 members.files 的稳定去重并集；实际成员本身就是文件来源，避免无必要的跨源子集约束。 |
| 路径 | 直接接受已规范 root-relative slash path，复用 `isNormalizedProjectRelativePath`；拒绝 absolute、backslash、drive、NUL、空段和 dot/dotdot，不纠正别名、不检查存在性。 |
| region ID | 非空字符串，按原值保留（包括 NUL），不套用路径/进程参数限制；全域重复 ID 均抛 TypeError，包括相同定义，避免静默覆盖或暗示合并。此行在同轮独立正确性审查后纠正，依据见下节。 |
| patterns | closed dense 非空字符串元素数组，数组可空；整体复用共同 micromatch 参数与原生列表，不应用默认排除。 |
| 结构 | 每层 plain/null-prototype closed record 与标准 dense array，拒绝未知/symbol/非枚举/accessor 字段；复用 closed-values 后逐字段 detached 冻结。反射 Proxy trap 不是沙箱。 |
| 查询 | `regionsForFile(path)` / `filesForRegion(id)` 返回 frozen sorted unique array 或 undefined；合法未知键 undefined，已知空键 []，非法查询键 TypeError。 |
| 枚举 | `filePaths` / `regionIds` 为冻结排序数组，让消费者不保留额外 universe，也不暴露 Map。 |
| 追加 | `appendSources(sources)` 返回独立新视图；合并既有已校验值与新 detached 值，重建，不修改旧视图，不重新执行来源。 |

Core 归 `src/data-boundary/project-file-region-index.ts`。普通私有 Map 维护双向关系，冻结外层对象和所有公开数组，
Map 仅留闭包；不公开可写 Map、不使用 class/global cache。保留已校验规范数据供追加，追加仅解析新增值。
按 region 批量调用 `selectConfigPaths`，members 只使用自己的 files，因此新文件参与规则但不扩大 actual members。
成本为文件/区域/边复制与规则计算，O(F+R+E) 存储，不作 matcher 复杂度保证。

### 同轮审查纠正：身份契约不继承路径字符限制

实施初稿把 region ID 误设为“非空且无 NUL”。2026-10-11 独立正确性审查发现该约束收紧了真实消费者：
合法 `nul\0id` 配空 patterns，在 Run 被误分类为 `git-changes-unavailable` 并保守启用 flag，
在 fileMetrics 被误分类为 `source-unavailable`，而不是可信零匹配或无适用输入。
此后限定读取 `src/project-definition/project-changes.ts` 的 `parseFlags` 与
`src/package-checks/file-metrics/options-validation.ts` 的 `isValidCodeAreas`，确认两处作者契约都只要求非空字符串。
这是同轮 API 准备认识的纠正，不改写前序收集调查，也不把原错误隐藏为形成时已确定的契约。

按 common-denominator-design 核对场景与义务：

| 场景/责任层 | 身份与合法状态 | 操作与边界 |
| --- | --- | --- |
| Core 区域值 | 非空 opaque 字符串；NUL 是身份的一部分 | 私有 Map 建立、查询与追加；不传给 OS，不解释为路径。 |
| ProjectChanges flag | 作者 key 非空，保留原字符串 | 规则匹配后添加 protected token 前缀；获取 Git 的 revision/path 另行校验。 |
| fileMetrics codeArea | 作者 key 非空，保留原字符串 | 实际成员映射和 policy 查找；scanner 接收路径，不接收 area ID。 |

选择一个非空字符串身份公约数，直接透传，无信息损失。按消费者拆分身份契约没有稳定语义差异；
维持更窄 Core 加 opaque 映射只增加往返状态，收紧既有消费者则改变合法作者输入，均不采用。
路径和 Git revision 的 NUL 禁令是各自边界义务，继续保持。新增 Core 身份测试验证 NUL 的枚举、双向查询、
追加及冲突；两处真实消费回归分别验证空选择不误入 unavailable，且匹配结果保留 ID 与 policy。
校验表、设计、中文 JSDoc、公开指南和 Case 同步此纠正；重建算法及历史 workload 样本未改动。

实际短暂恢复原 NUL predicate 运行三个定向回归，均失败：Core 拒绝合法身份、fileMetrics 出现
`source-unavailable`、Run 出现 `git-changes-unavailable`；随后恢复修复，Core/两消费的 16 tests 全过。
初稿 SCC 测试替身未提供 `--version` 响应，matched 分支得到 dependency unavailable；补齐相邻 fixture
相同的 version 响应后通过，未改 scanner 兼容性。完整 Gate 与账本的修复后结果见下文验收快照。

### 最小内部消费

- file-metrics collection 继续一次 Check-local batch，转换为 members regions；exact paths 用 filePaths，records
  用 regionsForFile，删除纯反向 Map。阈值、waiver、blocking 与 settlement 仍在原消费者。
- Run 保留全部 Git 获取、baseline、rename/delete、不可用分支；只将匹配投影改为 patterns regions 后读取
  regionsForFile 并添加 protected token 前缀。没有扫描默认排除或来源刷新。
- duplicate 的 Map 携带 minimumLines/minimumTokens policy，不迁移；functionMetrics 非必需，保持不动。

### 实施证据与认识边界

以下为 2026-10-11 同轮实施与独立审查补充，不回填为形成时已证明的事实。
当前公开契约归[索引指南](../guides/file-region-index.md)，内部存储与消费归
[Project files](../development/project-files.md#core-file-region-relation)；本报告解释选择依据、纠错与当次证据。

Core 近邻测试观察双向关系、零/重叠/未知、closed 输入、路径/身份、批量与追加等价、实际成员和新旧视图隔离。
撤销原输入 Proxy 后仍可追加，证明追加只复用 detached 值。独立进程封锁全部 fs 函数、同步 ESM bindings
及 child_process 获取能力，证明构造、查询与追加无 I/O；Bun 的报告通道在封锁前取得，不放开被测计算。
collection 原生语法矩阵、真实 Run Git 和 fileMetrics strictest/exact-scope 测试负责 matcher 与消费策略不变。

实施时纠正了两个 matcher 预期：本矩阵的换行文件不匹配 `src/**`，但匹配 `src/**/*.ts`；
动态 `./src/**` 能匹配规范候选。固定预期按真实后端纠正，算法与路径归一不变。
教学示例用 `src/*.ts` 和精确负规则，避开现有 JSDoc 投影器把 glob `/**` 误识为注释起点的限制。
workload 首次以 `count * 1.1` 断言整数数目，50k 因浮点预期失败；改为 `count + count/10` 后采样，失败不计入样本。

package preparation 首次因缺少新增 public export inventory 而拒绝；补齐 inventory、非 Check 分类和外部类型片段后重跑。
完整 Gate 初次执行为 40/43，发现测试 NLOC、strict 数组取值及文档校验器误把 `file-region-index.md` 当作 `index.md`；
按证明责任分离 boundary tests、使用具名 region、按 basename 精确识别后通过，未放宽阈值或校验。
修复身份域前曾有两轮 43/43 Gate（candidate `0.0.0-local.1be97900193c`），但绿色结果没有发现上节的合法 ID 回归。
其中一次 mean/P95 warning 未做同条件成对比较，不能归因于索引，也不证明性能变化。

### 独立审查修复后的验收快照

移除 region ID 的 NUL 禁令后，locked Bun1.3.14 的 Core/完整 fileMetrics/Run Git/collection 为 43/43 passed，
最低 Node24.18 Core 为 8/8 passed；路径 NUL 拒绝和封锁 I/O 证明仍通过。
Test Evidence 为 680 entities /169 Cases（15 topics）；新增三个身份回归实体归现有 Case，
五个索引 Case 覆盖关系、输入边界、追加、无 I/O 和安装后独立消费。

唯一入口 `mise exec -- bun run check -- --all` 为 43/43 passed（32.5s），
candidate `0.0.0-local.df7cd6907d3e`；日志为
`.log/project-gate/2026-10-11T10-39-40.392Z-1193871-219e327a-425c-49ca-8e38-e0428a6c9caf/`。
同一 exact tarball 的隔离 types 与最低 Node24.18 runtime/docs 安装后验收、Product/scripts typecheck、lint、
import boundary、format、dependency、材料及各 test lanes 全部通过，没有 mean/P95 warning。
package status 为 current，产物为 `build/artifacts/zxyycom-vibe-check-0.0.0-local.df7cd6907d3e.tgz`。

原审查者已定向复核身份修复。该修复不增加身份映射或 policy，不改变重建算法；原成本样本未重测或覆盖，
不宣称性能变化。稳定提交、Decision alignment 与 Change 结项由协调者另行执行；
完整 Gate 与本报告都不替代这些动作，也不解除 debug 的实际提交继承门禁。

### 最终独立优化与验收

2026-10-11，非实施代理按 ai-ready-docs 和完整编码规范审阅当前 API、最小消费与直接文档影响。
原生 Map、闭包视图和显式解析/重建阶段已直接呈现不变量，未发现须整改的实质可读性问题；
本阶段不改产品代码、测试或成本资源，不为外观增加抽象。文档处理如下：

- 公开指南以来源、区域、查询和追加为主线，合并重复负向说明，保留 ID/路径、默认排除、closed 输入和快照安全边界。
- 内部 Core 关系独立于 Check exact-input 章节，分别承接存储与消费责任；Decision 去掉临时“尚未实现”表述，采用方向与 alignment 不变。
- 本报告压缩多轮 Gate/探针流水，保留身份域反例、认识纠正、修复前绿色结果的局限和原成本样本。
- debug 与协调入口引用稳定指南/报告，不依赖即将结项删除的 Core Change；debug 实施仍须实际继承两项已验收提交。

代表性文本恢复检查：仅从公开指南可判断 `members.files` 自成文件来源、合法未知返回 undefined 而已知零命中为 []，
追加路径重算规则却不扩大实际成员或改旧视图；可判断 NUL 区域身份合法而 NUL 路径非法，构造不验证存在性。
从内部 owner 可区分 fileMetrics 的关系与 policy、Run 的投影与 Git 获取；从 debug Plan 可判断当前未提交工作树不解除 0.3。
这些语义阅读结果与下面的机械验证分别成立。

本阶段实际通过 Bun 53 tests（Core、完整 fileMetrics、Run Git、三组 collection 和两组公开材料测试）、
最低 Node24.18 Core 8 tests、两侧 typecheck/lint、docs:api、validate、format，以及完整 Case 680/169。
随包材料冻结后，`mise exec -- bun run check -- --all` 为 43/43 passed（Product execution summary 28.1s），
candidate `0.0.0-local.b96090608982`。同一 tarball 的 types 与最低 Node24.18 runtime/docs 安装后验收通过；
package status 为 current，产物为 `build/artifacts/zxyycom-vibe-check-0.0.0-local.b96090608982.tgz`。
日志为 `.log/project-gate/2026-10-11T10-47-51.740Z-1205360-cbdcc485-29f9-4209-a8f9-0c101aa94ad4/`。
Gate elapsed-to-initial-result 58.7s 含 candidate preparation 29.8s；mean 1656.3ms/P95 4001.1ms 均在 warning 预算内。
这些时长不是与前轮同条件对照，不作性能改善结论。

最后仅刷新治理证据并运行相应验证，不再修改产品或随包内容。最终审查、优化与验证已闭合；
尚未执行 Git add/commit、Decision 对齐或 Change 结项。协调者保存真实稳定提交后，debug 再核对实际继承；
文件范围 Decision 的完整对齐还须等待 debug 交付。

### 构造、查询与追加成本

随附 source-only workload 的两个宿主各自独立运行；每个宿主内部先 10k 再 50k，各 11 轮，首轮 cold、后 10 轮 median。
20 个规则区域与 20 个实际区域形成 49,999 /249,999 条双向边，追加 10% 文件及一条全域规则后为 61,999 /309,999 条。
每轮直接核验双向边数、文件/区域数、实际成员数量与旧视图。查询包含全部文件/区域的查找、数组长度求和，
不是只测一个 key 的 microbenchmark。

| 宿主 / 文件数 | warm 构造 ms | warm 全查询 ms | warm 追加 ms | 追加后 RSS MiB 范围 | 追加后 heapUsed MiB 范围 |
| --- | --- | --- | --- | --- | --- |
| Node24.18 /10k | 64.60 | 1.71 | 51.27 | 133.08–332.73 | 39.07–165.37 |
| Node24.18 /50k | 372.83 | 8.93 | 305.32 | 268.55–476.98 | 60.94–285.26 |
| Bun1.3.14 /10k | 141.49 | 5.61 | 98.20 | 129.92–168.80 | 18.48–44.86 |
| Bun1.3.14 /50k | 1113.79 | 39.14 | 787.25 | 261.25–295.27 | 85.68–101.86 |

完整 cold、各 phase 内存与 11 轮 raw samples 保留于资源。Bun process.versions.node=24.3.0 是兼容值，
不是测试的 Node executable。未 forced GC，反复构造造成垃圾与宿主高水位，50k 继承 10k 进程状态；
这些内存不等于索引 retained size。没有旧公共 API baseline、预算或真实 Check 端到端成本比较，
不能宣称加速、retained-memory 改善或通用比例。观察支持初版普通查询与全量重建的可实现性；
需要处理更密集/更大数据时按具体 workload 再调查，不自行增加复杂增量。

## 随附资源

- [locked Bun 重建成本](./_resources/261011-project-file-region-index-readiness/rebuild-bun-observations.json)
- [最低 Node 重建成本](./_resources/261011-project-file-region-index-readiness/rebuild-node-observations.json)
- [当次纯值构造、查询与追加探针](./_resources/261011-project-file-region-index-readiness/rebuild-workload.mjs)
