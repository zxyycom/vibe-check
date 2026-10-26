---
title: "项目文件收集后端接入与迁移准备"
id: "261011-project-file-collection-readiness"
formedAt: "2026-10-11T08:45:20Z"
question: "fast-glob 与共同原生 matcher 的薄适配能否兑现纯磁盘剪枝、失败与 no-follow 契约？"
tags:
  - "file-collection"
  - "glob"
  - "node"
  - "performance"
relations:
  - type: "补充"
    target: "261008-fast-glob-git-collection-boundaries"
    summary: "补充最低宿主实际接入、薄适配与迁移边界"
---

## 形成时背景

当前 Change 已确认纯磁盘、普通文件/no-follow、同步可信失败、单份 patterns 与独立默认排除；前序仅审查库源码，没有证明最低宿主接入。起点为 b83d98b2，Case 全树检查为 671 current entities / 161 Cases。工程调查和迁移准备是本轮问题；本报告同时承接 2026-10-11 随后完成的 Product 迁移、独立审查修正与成本补证。当前规则归[收集指南](../guides/collecting-project-files.md)和[Project files](../development/project-files.md)，本报告保存形成时依据，不是另一份当前规范。

## 调查目的

验证 fast-glob 3.3.3 能否经薄 fs adapter 保持访问前剪枝、共享、no-follow 和必要 I/O 失败，并选定共同完整列表 matcher。同步恢复迁移 owner、默认数组、成本方法及包验收入口，不将库默认行为作为产品例外。

## 调查范围与依据

2026-10-11 在 Linux 非 root dev 用户执行探针：mise Node v24.18.0、Bun 1.4.2；pnpm 安装 fast-glob 3.3.3、micromatch 4.0.8 与声明。阅读固定安装源码、[fast-glob 官方文档](https://raw.githubusercontent.com/mrmlnc/fast-glob/3.3.3/README.md)及[micromatch 原生列表实现](https://raw.githubusercontent.com/micromatch/micromatch/4.0.8/index.js)。探针用独占临时目录，普通文件、链接与权限反例；每次结束精确删除 fixture。

探针分别覆盖 task base、静态路径、默认防呆重包含、用户重新包含、混合开关、root 链接/缺失/空 patterns、目录链接起点与静态后代、文件/断链、必要 EACCES/ENOENT 及真实 chmod 000。18 项 Node/Bun 断言通过，实际路径访问记录保存在 JSON。初次 instrumentation 将模拟 ENOENT 放在 adapter 翻译边界之外，被库吞掉；将真实及注入错误一起纳入同一个普通 Error 翻译边界后两宿主通过。这证明失败翻译必须位于 fs adapter 的实际操作处，不能只在最外层 catch。

成本 baseline 使用迁移前 Product 私有 collector、同一临时 filesystem：src 2400、docs 600、private 600、node_modules 2400、build 1200，共 7200 文件。宽/窄/双 selection 各 11 次（一冷起始、十 warm）；采集 readdir/lstat 次数、wall、heapUsed/RSS。资源 workload 的 before/after 模式按本次迁移切换选项，不比较 Git 到磁盘域。未强制 GC，内存只作为 observation，不把单次 heap 当 retained memory。

## 调查结果与边界

### 后端选择与参数

采用 fast-glob 3.3.3 作为遍历器，micromatch 4.0.8 作为完整列表的唯一语义 owner。二者并非同一种列表算法：fast-glob 不按列表顺序重包含，micromatch 原生列表允许后续正 pattern 清除先前用户负排除，且 negative-only 选择其补集。因此 fast-glob 只枚举可覆盖目标的正候选 superset，完整用户列表整体交给 micromatch，不把负规则拆成另一套公开 matcher。

共同参数固定为 `dot:true`、`matchBase:false`、`nobrace:false`、`nocase:false`、`noext:false`、`noglobstar:false`、`posix:true`、`strictSlashes:false`。fast-glob 映射相应 `braceExpansion:true`、`caseSensitiveMatch:true`、`extglob:true`、`globstar:true`、`baseNameMatch:false`；扫描 `onlyFiles:true`、`followSymbolicLinks:false`、`suppressErrors:false`。负-only 或前导否定 extglob 的候选可保守使用 `**/*`；空 patterns 不枚举后代但仍检查 root。

薄适配在 stat/readdir 之前检查固定排除和本轮全部 selections 的安全整子树排除；用户剪枝只采用不会被后续正规则重新包含的末段负规则且以 `/**` 结束，无法证明时保留访问。每 selection 独立启用默认数组，只有全部无需求才剪枝；混合开关不会错误继承其它 selection 的排除。动态 task base 和静态路径都经同一 fs adapter；lstat 各路径分量阻止目录链接起点及后代，root 链接明确失败。required stat/readdir 真实错误翻译为带绝对目标与 cause 的普通 Error，避免 fast-glob ENOENT 宽容策略。policy 跳过才允许合成 ENOENT，不能把真实缺失映射成它。

一次 operation 可缓存真实目录 entries，保证重叠 task 的必要候选 acquisition 共享；不跨 Check/cache/Run，不承诺恶意并发替换时的 sandbox 或文件内容快照。采用库 walker，没有重建递归引擎；探针足够支持开始实施，尚不能代替公共/Check-private 接口与大范围安装后验收。

### 默认数组与迁移清单

固定默认数组逐字沿用当前 configuration.ts 的 20 项：.cache、.git（本体和后代）、.log、.pytest_cache、.tmp、.venv、.vibe-check、__pycache__、artifacts、build、coverage、dist、generated、*.generated.*、node_modules、target、tmp、vendor、venv 对应的既有 `**/` glob。不加入 archive/historical 业务规则；这些保留在仓库用户负 patterns。

| owner | 必要迁移 |
| --- | --- |
| project-files configuration / public boundary / collection | patterns、开关、descriptor-safe closed snapshot、默认常量、结果冻结、共享 policy adapter |
| data-boundary/config-glob / project-files 转发 | 删除旧 minimatch/any 匹配，完整原生列表与共同参数；公开 Run region 仅 patterns，不套扫描默认排除 |
| project-definition/project-changes / project-run/changes/git | types/closed validation/normalize/fingerprint 与 region 匹配；保留 comparison、rename/delete/unavailable Git 事实 |
| duplicate/file/function metrics 与 JSON/Markdown/secret Checks | defaults/resolvers/options validators、全部 areas、测试 fixture、accepted/rejected 与 exact handoff；functionMetrics 不迁移关系索引或算法 |
| scripts/project/gate 与 runtime/product-test-regions | files 与 regions，archive/fixture 等业务负规则保持；Gate required 边界不自动缩减 |
| src/index.ts / package manifest / public inventory / consumer types/runtime | 删除 source 类型/exports、添加固定默认排除导出、声明 fast-glob/micromatch、许可证安装审计与 lockfile；minimatch 的其它脚本 owner 保留 |
| README/收集与各 Check 指南/API mechanics/internal owners/examples/changelog/Case | 完整更换形状，明确旧字段拒绝，投影与材料验收闭合；既有 Investigation/Decision 保存形成时认识，不机械改写历史 |

共享 helper 调用者 scoped 审计：revision-worktree-files、gitlink-worktree、gitlink-revision、revision-paths 仅由收集链内部消费，可一起移除；host-environment/filesystem 的 walkFiles 仅由旧 collector 使用，可删除这一导出但保留读写 JSON/text helpers。host-environment/git 的 splitNulDelimitedGitFileList 仅收集链使用，可删除；runGit/gitFailureDetail 及其它 helpers 仍被 maintenance reminders 使用，必须保留。scripts/repository-files 是独立维护者 walker，不能删除。historical-product.ts 生成的 include 字段只供固定旧 revision 的历史性能 driver，不是当前 Product 的 alias/双读，不做机械迁移。src/project-run/changes/git 拥有独立 Git acquisition，不删除。

### 路径身份补充核对

交接前真实 POSIX fixture 发现，既有共同 matcher 的 `toSlashPath` 将实际普通文件 `literal\name.ts` 返回为并不存在的 `literal/name.ts`。最小 source probe 的 `actualNames` 为 `[literal\name.ts]`、`collected` 为 `[literal/name.ts]`；这是字符重写造成的身份错误，不是支持特殊名称的证据。按既有 `isNormalizedProjectRelativePath` 边界，共同 matcher 现在不改写已约定的 slash-path 字符串；collector 仅对最终 selected 的不可表示路径抛带实际目标的普通 acquisition Error，不返回虚假 alias，不静默丢弃。真实 Product test 证明同一反斜杠文件在宽选中失败，在窄 src 或显式用户负规则排除后正常。Run 既有 raw Git path 拒绝保持。此补充不声称扩大支持的 pathname domain；最低 Node/安装后验收已在修正后重跑通过。

### 独立正确性审查反例与修复

非实施代理实际审查发现两个 blocker，原 Gate/test 通过不能证明它们：`foo/a.ts` 上的 `["./foo/*.ts"]` 返回空、`["./foo/a.ts"]` 返回 normalized Error；POSIX name bytes `626164ff2e7473` 被 `["**/*"]` / `["bad*.ts"]` 返回不存在的 `bad�.ts`，而 `["!bad*"]` 排除。最低 Node 复现 reviewer 探针分别为 3 mismatches 和两份 `exists:false`。现只移除后端候选的 `./` 前缀，再进行完整 matcher，不改写真实名称；动态、静态、混合共享选择同时证明。

byte name 用一次 `encoding:buffer` 目录获取保留，UTF-8 decode→encode roundtrip 判定忠实性。最终入选的有损普通文件在后端 duplicate-path filter 前失败，避免与真正 U+FFFD 文件碰撞/去重；真正 U+FFFD 合法，必要目录也按 byte 身份检查，不把同名有损目录读成另一个目录。完整 selection 及固定默认排除先判定需求，范围外有损普通文件、空 patterns 和已证明排除子树仍正常。subtree 剪枝只适用于目录：若同一 base spelling 的普通文件仍由完整列表选中，不因目录负规则而误删。

宿主探索先误将 `Buffer.isBuffer=false` 视为 string，又以 `typeof name!==string` 错把 `undefined` 判为 byte Dirent；这两项推断均撤销。最终探针同时核对原始 entry 是否 Uint8Array、是否有 isFile 元数据与实际 rawBytes：Node24.18 提供 byte Dirent，locked Bun1.3.14 的该 overload 实际返回 bare Uint8Array names（`name`/`isFile` 均不存在）。因此薄 Dirent bridge 按真实 entry 形状接入；Node 使用现成 metadata，Bun 按需要 lazy lstat 并在 entry 内缓存，两宿主不重复目录获取，不建立递归引擎。Bun `process.version=v24.3.0` 是其 Node compatibility 值，不是验收使用的 Node executable。

修复后的原 reviewer pattern corpus 为 0 mismatches；资源探针在最低 Node 与 locked Bun 覆盖前缀、单次共享读取、lossy-byte 失败、用户排除、合法 U+FFFD 与 collision，最终 source 再次执行通过。非实施代理随后独立正确性复核通过（locked Bun 15 tests、最低 Node24.18 12 tests）。这些反例说明此前 Gate/test 通过未覆盖完整路径身份；修复保持普通文件/no-follow、必要失败与单次目录获取，不用有损 string 读取或第二个 walker 换取通过。

### 最终路径身份实现的成本

以下同一 7200-file workload 的最终 source 新观察覆盖 byte bridge 和目录/普通文件剪枝区别，而上轮编译剪枝、首版 byte bridge 和 after-review 样本是修正前阶段证据，不代表最终实现。输出 counts 仍为 3600、2400、2400+600；十 warm 中位数与 readdir/lstat 如下：

| selection | Node24.18 ms / readdir / lstat | Bun1.3.14 ms / readdir / lstat |
| --- | --- | --- |
| 宽 | 22.44 / 124 / 124 | 47.42 / 124 / 3724 |
| 窄 src | 13.24 / 82 / 82 | 29.47 / 82 / 2482 |
| src + docs | 12.10 / 103 / 103 | 37.59 / 103 / 3103 |

Bun 缺少 byte Dirent metadata，额外 lstat 为本轮 necessary ordinary candidates 的 3600/2400/3000；不以 double readdir 换取较小数字。Node RSS（MiB）三组为 101.27–206.15、208.52–274.27、282.90–301.15，heapUsed 为 17.27–84.28、18.37–91.52、57.05–122.86；Bun RSS 为 100.59–155.28、155.05–163.03、154.74–158.86，heapUsed 为 6.17–53.98、8.57–57.71、10.15–48.89。byte bridge 比此前阶段有额外内存，不声称 retained-memory 改善；未 forced GC / 顺序组高水位限制仍然适用。Node 与 Bun wall 不互相当 baseline。保留最初 byte bridge 的两份观察（Node 宽 33.56 ms，Bun 48.47 ms）及 after-review 样本（21.52/45.70 ms），避免隐藏阶段成本。

真实 Run/JSON Check 的最终 source 同 fixture 观察为 Node24.18 21.13 ms / readdir42 / lstat42 / RSS155.90–210.52 MiB，Bun1.3.14 31.37 ms / readdir42 / lstat1242 / RSS146.48–178.83 MiB；每轮 passed、scannedFileCount1200、rejectedInputCount0。没有旧 Check 端到端 baseline，不能宣称加速。

### 阶段成本比较与取舍

以下为独立审查修正前阶段：已用同一 workload 的 after 模式采集实际 Product，Node v24.18.0、同样 7200 文件与十一轮口径。下表为十次 warm 中位数及每次目录读取；宽/窄/混合的输出分别始终为 3600、2400、2400+600，与 before 一致。

| filesystem selection | before ms / readdir | 首次 after ms / readdir | 编译剪枝谓词后 ms / readdir |
| --- | --- | --- | --- |
| 宽 | 31.16 / 124 | 43.23 / 124 | 13.23 / 124 |
| 窄 src | 34.09 / 124 | 32.68 / 82 | 7.11 / 82 |
| src + docs | 52.21 / 124 | 31.37 / 103 | 10.06 / 103 |

新路径每个已读目录另做一次 lstat（124/82/103），用于 real-directory/no-follow/必要失败判定；旧路径为 0。因此窄选择的读取减少是访问事实，而不是全部 I/O 均减少。初版反复编译每个路径的剪枝 matcher，宽选耗时与内存变差；改为 operation 内一次编译安全子树谓词后再采样。保留两份 after 观察，不能只呈现改善样本。

RSS（MiB）before 三组范围为 91.36–103.36、103.61–122.23、122.48–124.23；初版 after 为 131.14–331.35、331.47–335.85、332.72–336.22；编译后为 88.83–105.33、111.95–124.45、124.45–145.83。对应编译后 heapUsed 范围为 11.59–23.87、15.64–31.78、22.27–50.23。没有强制 GC，三组在同一进程顺序执行且 RSS 有前组高水位；不能推断 retained memory 改善，混合组最终 RSS 也并未低于 before。性能没有预算，这些数字是本机观察，不是通用收益承诺或契约前提。

另在最低 Node 上由公开 source API defineConfig/jsonValidation/run 真正执行整个 Run 和 JSON Check：独占临时 fixture 4800 JSON（config 1200、node_modules 2400、build 1200），每轮 passed、scannedFileCount 1200、rejectedInputCount 0；目录读取/lstat 各 42，十 warm 中位数 21.62 ms，RSS 156.79–176.66 MiB。该证据覆盖 collection、eligibility、内容读取、Check settlement 与 Run，但只采集新实现，不能声明 Check 端到端加速；安装后 exact tarball 另由 Gate 证明。

### 验收范围与交接

Product/configuration/Run/Gate/包与指南已完整迁移。相同磁盘在非 Git、初始化 Git 和 PATH 无 Git 下结果一致，证明候选域从 Git 转为磁盘；这与 filesystem 成本比较是两项独立验收。

最终文档/代码优化后的完整 `bun run check -- --all` 为 43/43 passed（28.5s），candidate `0.0.0-local.a85ccc1794bf`；最低 Node24.18 的 types/runtime/docs consumer 使用同一 exact tarball，覆盖 typecheck/import boundary/lint/dependency、quality、材料与所有 test lanes。日志位于 `.log/project-gate/2026-10-11T10-04-29.175Z-1137729-b53be0d9-c0a0-4009-8755-9ac7df65a31c/`，Case 为 670 entities / 164 Cases。此前 Gate 暴露过 resolver 复杂度、旧消费者字段与测试文件长度问题，均在相应 owner 定向修正，没有豁免指标或弱化行为。shell Bun1.4.2 的既有 null-prototype deepEqual 差异不在本轮处理，正式测试使用 locked Bun1.3.14。

报告和 Gate 不代替验收提交。最终文档/代码优化与完整包 Gate 已完成，可提交验收快照仍由协调者保存为稳定提交；Core/debug 实施基线须实际继承该提交。两项下游能力没有在本轮实现，两条长期 Decision 保持未对齐。

随附资源供复核本轮方法与时点：backend-adapter/readiness 为最初接入证据，identity-review 为审查修正证据，filesystem-before/after 为阶段比较，filesystem-final/check-final 为最终身份实现观察。旧样本保留原始字节，不回填为最终实现结果；没有 forced GC 或旧 Check 端到端 baseline，不声称通用速度或 retained-memory 改善。

## 随附资源

- [薄适配与断言探针](./_resources/261011-project-file-collection-readiness/backend-adapter-probe.mjs)
- [Bun 读取路径及失败观察](./_resources/261011-project-file-collection-readiness/bun-readiness-observations.json)
- [候选拼写与 byte 身份探针](./_resources/261011-project-file-collection-readiness/candidate-spelling-and-byte-identity.mjs)
- [修复后 Bun Check 成本](./_resources/261011-project-file-collection-readiness/check-bun-after-review.json)
- [最终 source Bun Check 成本](./_resources/261011-project-file-collection-readiness/check-final-bun.json)
- [最终 source Node Check 成本](./_resources/261011-project-file-collection-readiness/check-final-node.json)
- [修复后 Node Check 成本](./_resources/261011-project-file-collection-readiness/check-node-after-review.json)
- [最低 Node 真实 Check 观察](./_resources/261011-project-file-collection-readiness/check-node-observations.json)
- [真实 Run / JSON Check workload](./_resources/261011-project-file-collection-readiness/check-workload.mjs)
- [首版 byte bridge Bun 成本](./_resources/261011-project-file-collection-readiness/filesystem-after-byte-identity-bun.json)
- [首版 byte bridge Node 成本](./_resources/261011-project-file-collection-readiness/filesystem-after-byte-identity-node.json)
- [编译剪枝后的 Product 成本观察](./_resources/261011-project-file-collection-readiness/filesystem-after-compiled-pruning.json)
- [修复后 Bun filesystem 成本](./_resources/261011-project-file-collection-readiness/filesystem-after-review-bun.json)
- [修复后 Node filesystem 成本](./_resources/261011-project-file-collection-readiness/filesystem-after-review-node.json)
- [首次 Product after 成本观察](./_resources/261011-project-file-collection-readiness/filesystem-after.json)
- [迁移前 filesystem 成本基线](./_resources/261011-project-file-collection-readiness/filesystem-before.json)
- [最终 source Bun filesystem 成本](./_resources/261011-project-file-collection-readiness/filesystem-final-bun.json)
- [最终 source Node filesystem 成本](./_resources/261011-project-file-collection-readiness/filesystem-final-node.json)
- [同 filesystem 成本 workload](./_resources/261011-project-file-collection-readiness/filesystem-workload.mjs)
- [locked Bun 修复观察](./_resources/261011-project-file-collection-readiness/identity-review-bun-observations.json)
- [最低 Node 修复观察](./_resources/261011-project-file-collection-readiness/identity-review-node-observations.json)
- [最低 Node 读取路径及失败观察](./_resources/261011-project-file-collection-readiness/node-readiness-observations.json)
