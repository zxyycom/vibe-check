# Tooling implementation evidence

本页保存文档整理前工具链实施的操作量、差分和验收快照，辅助当前 Plan 恢复采用依据。
基线为 `b2926b14880da7546f39aba7c0e07424f65f3977`，Bun 1.3.14；该轮没有运行工具链 timing workload，
不能据此判断 Gate wall-time、RSS 或真实产物 build 收益。当前稳定契约仍由相应工具 owner 定义。

## Candidate closure

| ID | 采用状态与实际边界 |
| --- | --- |
| R01 | 不采用：detached JSON 的 DAG 展开是完整输出义务；不增加节点/深度/字节预算，不改变 scripts canonical data materialization。 |
| R02 | 不采用：显式 Lizard benchmark 等待、完整输出和统计协议保留；新增 deadline/cap 属契约决策。 |
| R03 | 已实施：registry 按输入顺序以 target/parent Sets 验证 exact 与 segment ancestor 冲突；保留首个冲突诊断，合法文本前缀 sibling 不冲突。成本从两两路径比较转为每路径各 ancestor membership；prefix 构造/hash 成本仍存在。 |
| R04 | 部分实施：JSDoc discovery 捕获需要的 source，同文件不再按 target 重读及最终重读；非重叠 replacements 一次片段拼接。Markdown 建 heading-path 与 bounded-six-level section-fence 索引，非重叠输出一次构造。保留 ancestor/child 同 fence 与 JSDoc 重叠 replacement 的旧 fallback。JSDoc per-target regex 未改：合并 matcher 为兼容 `$` 的旧 word-boundary 和 comment 行为需复杂 fallback，未证实 wall-time 收益不值得维护成本。 |
| R05 | 部分实施：fence 由一次最长 backtick run 扫描求得；region start 以 seen-ID Set 去重，nested region 完整文本仍各自输出。README/guide 完整 substring proof 保留；未引入复杂多模式搜索或会改变合法 path substring 语义的 Markdown parser。 |
| R06 | 已实施：同次 tar 解压后构造 first-entry path Map，文档/machine 比对不再逐材料 find 全 inventory。digest-before-decompress、完整解压、类型/path、inventory、duplicate、legal 与声明 audit 均保留；后续常数次 core find 和 legal Map 不改。 |
| R07 | 部分实施：ESM `.js` token 非重叠范围从前向后一次片段构造，不再每 token 拼接全文；保留单 AST 语法验收、ordinary strings 与 Worker exact-shape 规则。declaration payload 的完整存在性 proof 保留：复杂多模式 matcher 的实际收益未证实。 |
| R08 | 不采用：candidate/env deadline 覆盖是工作流失败/取消契约，不擅自新增 timeout。 |
| R09 | 部分实施：同 render invocation 将已校验 registry 传给 payload collector；每 example source 的已读取内容复用于 full-file payload。未省略 fingerprint、receipt、compiler-cache、installed docs/legal/declarations 或 probe，未信任 mtime，未跨 invocation 缓存审计事实。 |
| R10 | 已实施：lane 双向 complete-membership 使用 Sets，保留 duplicate、完整 coverage、empty-lane 的原失败顺序与 lane/selection。 |
| R11 | 已实施：context 引用 append-only frozen observations 并捕获 prefix 长度，`measurementAt` 不可读未来；closed wait contribution 同原 reduce 次序增量累计。完整最终 action observations 与 trace 保留，context 其它 state/candidate 成本未消除。 |
| R12 | 已实施：Run-local task Map；resource occupancy 随 state 变化，所以仅每次 computeRates 首个实际 claim 才建当前 resource Map，零 claim 不付资源索引成本。settlement、完整 state trace、forced effects、sorted output 全保留；不声称完整 simulation 线性。 |
| R13 | 不采用：replicate 与完整 corpus 是显式工作量；不新增小 max、采样或静默删减。 |
| R14 | 部分实施：topic counts 单次 catalog 扫描加每 topic lookup。当前每 public query operation 已只 load 一次 catalog，无重复 load 可删；全树 discovery/registration、owner validation、完整查询语义和分页不变。 |
| R15 | 已实施：仅 missing occurrence 请求位置时，单调 code-point cursor 扫到当前位置。调用路径只有一个 `text.matchAll(linkPattern)` 顺序流，没有 concat/倒序或任意偏移公共 API；每 occurrence、Unicode 列、稳定排序、路径安全与逐 occurrence live exists 检查保持。 |
| R16 | 部分实施：同 layout invocation 的 import/analyzer validators 共享只读 module-analysis facts；各 package-tools/Core closure invocation 使用 TypeScript resolution cache；public symbol identity 以 first-symbol Map 查找，保留 type/value 资格与旧 first-alias 行为。Core traversal AST 与独立 no-emit 仍分别执行；错误路径 syntax-diagnostic includes 未改，无实测收益证据支持额外 plumbing。 |
| R17 | 已实施：独立 canonical validator 将 token chunks 最后 join 一次，不再逐父级物化 subtree text；prototype、own descriptor、symbol、sparse-array、cycle、finite-number、negative-zero、lexical key 和完整 fingerprint 语义保留。递归调用深度、排序和完整输出成本仍存在，不新增预算。 |

## Historical operation evidence

形成时临时证据目录为 `tmp/optimization-implementation-20261015/tooling/`；当时方法及结果已按下方交接位置保存：

当时执行的是专属临时 helper；现仅保留其方法与结果，不提供原目录上的重跑命令。

helper 从冻结 HEAD 只读提取 baseline modules，并只重写真实 import/export specifier 到精确 baseline/现有依赖；不构建、不安装、不联网。它执行 392 Markdown、17 JSDoc、6 registry、256 canonical 深度、5 ESM、3 links、6 tar material 拒绝优先及 36 simulation fixture×seed 的完整值/错误消息 before/after 比较，全部相等。tar 差分只证明材料比对及原拒绝优先，不冒充完整成功产物审计。

`equivalence-results.json` 中的操作量是源码算法对应 workload 的逻辑计数，不是 CPU/GC/分配测量：

| Workload | Before | After |
| --- | --- | --- |
| 4096 fixed-depth registry targets | 8,386,560 path pair comparisons | 至多 20,480 Set membership；另有 Set 构造与 prefix/string hash |
| 4096 lane files，两次成功 membership | 16,781,312 equality checks | 8192 Set membership；另有集合构造 |
| 4096 actions contexts | 各 8,386,560 copied history refs / reduced wait contributions | 0 prefix copies；4096 closed contribution adds |
| 2048 missing links，126974 UTF-16 units | prefix 定位扫描累计 130,035,028 units | cursor 至多访问 126,950 units（以 code point 推进） |
| 256 nested singleton arrays，完整 text 513 bytes | 66,049 subtree text units | 最终 join 513 units；递归/校验仍在 |
| 4096 tar entries / 512 materials（最坏合法位置） | 至多 2,097,152 path comparisons | 4096 index visits + 512 lookup；完整 audit 仍在 |
| 15 topics / 181 Cases | 2715 topic comparisons | 181 count updates + 15 lookups；catalog/full closure 仍在 |
| 一个源文件 128 JSDoc targets | discovery + 每 target + 最终重建，共 130 source reads | 1 source read；per-target regex 保留 |
| 512 个 ESM import tokens | `512 × sourceUnits + 512 × 513 / 2` 中间全文 units | `sourceUnits + 512` 最终输出 units；rope/GC 未测 |
| payload 最长 backtick run 128 | 127 次 includes 调用（长度 3 至 129） | 一次 matchAll；内部 engine character comparisons 未测 |

## Verification and handoff

### 局部行为与工程证据

- 最窄批次覆盖 render/command/check-guides/package-documents、ESM、links、machine validation、layout/Core closure、
  catalog、simulate、Gate definition 共 12 文件：38 pass / 0 fail。完整命令在 `targeted-tests.log`。
- 原 721 组冻结基线差分在职责整理后重新执行，全部相等；另有五组 valid/accessor/hidden/symbol/custom-prototype
  Proxy reflection trace，返回值与 prototype/keys/descriptor/child 的完整访问顺序逐项相等。
- `typecheck scripts`、`lint scripts`、`docs:api`、本 Change check、目标 Oxfmt 和 diff check 通过，均使用
  `mise exec -- bun run` 的仓库入口。Case 仅扩充既有 Proves；没有新增或 rename entity。
- 质量门槛发现的七条新增 function-metrics 问题及后续 canonical nesting/renderer 文件规模问题已按
  [design 的职责边界](design.md#implementation-observations)修正。未改阈值、waiver 或 Analyzer；renderer/index 的
  前轮 SCC 快照为 244/75 codeLines，不代表后续源码规模。局部复验日志为 `metric-repair*-{targeted-tests,equivalence,access-order,scc}.log`。

### 既有组合验收（2026-10-15）

文档整理前的最终实施快照经非实施代理复核，未发现剩余阻断。公开 `--quality` 的五项质量 Checks 全通过；
候选 `0.0.0-local.bf3c39c46928` 的 required Gate 为 37 passed / 6 not-applicable，complete Gate 为 43/43 passed，
包含 package artifact 与外部 consumer types/docs/runtime 验收。Product/scripts typecheck、lint、validate、format、
diff check 与完整 Test Evidence（732 entities / 181 Cases / 15 topics）通过。

初始完整 Test Evidence 为 726 entities / 181 Cases / 15 topics；本 Change 未新增实体，组合后的增加来自其它切面。
前两轮真实质量失败不计作通过，最终新增 Finding 均消除。形成时组合日志位于
`tmp/optimization-implementation-20261015/{gate-quality-final.log,gate-required-verified.log,gate-all.log}`，
同目录 `integration.md` 路由完整验收及计时边界。以上只证明当时输入，后续改动须重新选择相应验证；
Product API 计时不证明工具链或 Gate 耗时改善。

### 辅助材料与后续使用

原 `tmp/optimization-implementation-20261015/tooling/` 曾保留 baseline snapshots、workloads、helper、JSON 和命令日志；
现由上述正式验收材料承接方法与关键结果，不再依赖该目录；它不是正式 Investigation、长期性能 baseline 或新 Gate。本 Change 保持 Plan，
提交、发布和 finalize/delete 分别依当前任务授权，临时材料清理另按精确范围授权处理。

## Historical evidence handoff

2026-10-17 补存：[本切面历史验收材料](evidence/historical-acceptance.json)承接仍需复核的样本、方法、身份与边界。
本页其余 `tmp/`、旧 `.log/` 路径仅标注形成时现场，不再承诺保留、读取或执行；历史 source digest 不等于
可重建当时全部未提交源码。源码镜像、fixture、生成 IO、完整 profile 与一次性工具退出，未重新采样或运行 Gate。
这些材料只解释本 Change 的形成时验收，不是永久 benchmark 或可重跑 SDK。
