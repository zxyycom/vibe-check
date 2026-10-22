# 脚本 required region 与跨组成本证据

形成日期：2026-10-22。file-lifecycle-hygiene：本目录的脚本、policy snapshot、import-audit 与 measurements JSON 均为本 Change 的复核材料，随 Change 保留；原始运行日志在各 JSON 的绝对 log 路径中。前序与其它会话材料独立保留；本页保存该轮形成时的观察。

## Workload 与边界

- `mise exec -- bun` 固定 Bun 1.3.14，Linux x64，4 CPUs；顺序采样，OS cache warm，loadavg 已随样本记录。不修改并发/预算，不发起独立联网维护查询。
- 固定 changed path：`src/package-checks/markdown-link-validation/markdown-parser.test.ts`。`measure.mjs before selection` / `after selection` 通过同一 candidate 的 public API 执行真实 Gate Checks；使用保存的 native region AST、静态默认 admission、maxParallel=3 与原资源/mutex/dependency。**不含** root Git acquisition、candidate preparation、adapter 与 contributor，不代表正式 root E2E。
- 检查八份原始 machine/run.json，candidate version/path/SHA 唯一且一致：`0.0.0-local.7425d37042db`，SHA256 `6f0cc6b1df197901dc37c8ee9a8766852a8af9f1930065f632b8c7b32649859c`。
- 每组 1 warmup + 3 measured，raw JSON 保存 source SHA、实际 Check identities/durations 和目录。首次 after 因修改文件尚未 format 导致 format-check 失败，不纳入样本；精确格式化目标文件后重跑。

## 选择审计与采用

相对 `before-policy.json`，仅 package-tests / project-tests / admission-workbench-tests / script-tooling-tests 四个 region 排除已知 Product owner 的测试正文。共同目录表由 Product region owner 导出；没有全局 `!src/**/*.test.ts`，未知 owner、近似目录、实现、helper、fixture 继续保守宽选。

| lane | import 与非 import 依据 |
| --- | --- |
| packageSupporting | 相对模块闭包无 Product test import；public API JSDoc inventory、artifact source inventory 都排除测试正文。source-mapping tests 注入 auditSourceIdentity，不执行默认 Product source-identity 测试。 |
| scriptsProject | 无 Product test import；native/projection/process tests 使用各自 fixture/注入依赖。Definition 读取完整测试文件清单，不读取 Product 测试正文；实际 Gate 每次启动仍校验唯一、非空、完整 lane 分区。 |
| scriptsAdmissionWorkbench | 无 Product test import；child 消费 installed public package 与独立 scenario；source guard 只读取自己的 workbench 实现。 |
| scriptsTooling | 无 Product test import；JSDoc discovery 明确排除测试；文档 fixture 用登记源与合成 JSDoc target；Lizard command tests 检查参数/协议/统计，不执行 Product 测试正文。 |

`audit.mjs` / `import-audit.json` 保存所有 10 个 routine 脚本 lane 的保守相对静态/字面 dynamic import 闭包（含 type/lazy，**不等于实际运行加载集合**）；bare package imports 与生成的 child/FS 输入由人工补查。其余 region：layout 保留真实 src/scripts 全树；Test Evidence 保留自身规则/Case 输入，Test Evidence Check 仍全树注册+静态+账本检查；material/fixture 分组维持原独立输入。

选择矩阵独立写出已知 owner，验证 removed 路径、helper/fixture、未知与近似目录，实际 10 routine 脚本 lane 的 62 个测试文件全部触发自身；无 entity rename/new Case。--test/--all、Git unavailable fallback、quality/Test Evidence 范围未变。

| 固定路径实际 Checks | before | after |
| --- | --- | --- |
| 选中数量 | 19 | 15 |
| median | 18161.83 ms | 11101.76 ms |
| measured range | 16613.90–25588.89 ms | 10536.39–12801.90 ms |

中位数减少 38.9%；before 的 25.59 秒高样本完整保留，不作剔除。移除的四项正是已审计的脚本 lane。完整执行清单与 preset membership 不变。

## 跨组加载/注册与正文

复现：`mise exec -- bun changes/refine-script-test-regions/profile-lanes.mjs before`；会写新 baseline，复核旧结果时先保留旧 JSON，不覆盖唯一证据。10 lanes，各 1 warmup + 3 measured，全程串行。registration 使用项目同款 `a^` + JUnit；Bun 无匹配可返回 1，使用正式 parser 证明所有 testcase skipped 且 failures=0。最初 diagnostic 将 no-match 的 exit 1 误当失败后已修正，失败尝试未进入统计。

| lane | registration median ms | full median ms |
| --- | --- | --- |
| packageSupporting | 539.99 | 2573.93 |
| scriptsAdmissionWorkbench | 391.84 | 2703.37 |
| scriptsLayout | 237.68 | 2135.19 |
| scriptsMachineArtifacts | 392.07 | 900.80 |
| scriptsPackageToolsBoundary | 254.02 | 979.79 |
| scriptsProject | 813.84 | 2749.47 |
| scriptsProjectSelection | 362.68 | 726.74 |
| scriptsTestEvidence | 141.08 | 1034.79 |
| scriptsTooling | 147.85 | 1786.48 |
| scriptsValidation | 712.72 | 752.24 |

中位数累计 registration 3993.80 ms、full 16342.79 ms；**不是并发 Gate 墙钟时间**。registration 包含启动、模块求值、顶层工作、注册与 JUnit 输出；full 还有正文、hooks、按需导入及不同 reporting，二者差值不是精确可加的 phase。packageSupporting / scriptsProject / scriptsTooling 的保守闭包共享 33 个 workspace scripts modules，但实际加载量不能由该静态数量推定。

## 准备诊断与第二项采用

复现：`mise exec -- bun changes/refine-script-test-regions/profile-preparation.mjs`。导入后同进程 1 warmup + 5 repeats；fixture 项包含 cleanup：

- `lane-discovery`：54.19 ms。
- `toolchain-fingerprint`：21.27 ms。
- `artifact-fingerprint`：31.63 ms。
- `artifact-fixture-copy`：469.42 ms。
- `docs-fixture-copy`：15.36 ms。

Toolchain fingerprint 已包含在 artifact fingerprint 内，不可相加。该轮的 full-repository fixture copy 比单次 hash 更贵；两个指纹测试的独立 mutation 场景仍各需隔离。未用跨组共享可写 fixture 或长驻 cache 换速度。

`includes raw mapping bytes in the artifact fingerprint` 已消除 mapping/support 变化后无 intervening mutation 的两次重复 hash：7→5。保留 fixture 与 repository 完全相等、mapping raw bytes、验收 support source、Gate-guide projection source 四项原证明；不更改生产 fingerprint。

同样 profile 命令以 `after scriptsTooling` 测量，1 warmup + 3 measured：

- 整个 tooling lane median：1786.48→1609.81 ms（减少 9.9%）。
- 指纹测试的 Bun-reported median：806.65→668.66 ms（减少 17.1%）；该单项包含在整个 lane 内，不另行累加。
- registration median：147.85→146.39 ms，未声称改善模块加载。

## 形成时的后续候选

fixture 完整输入独立复制与 Validation 按需加载随后由 [reduce-gate-preparation-cost](../reduce-gate-preparation-cost/evidence.md) 实施；Project 保持原样。下列列表保存此轮的调查结论。

1. fixture copy（约 469 ms/次）可进一步核对是否只复制完整 fingerprint 输入，而非整个维护工作区；本次未改，因为需保留 independent fixture 与真实 fingerprint equality 证明，不能直接让两组共用可写 fixture。
2. scriptsProject（约 814 ms）与 scriptsValidation（约 713 ms）的加载/注册成本值得按需加载审计；本次没有靠 private Product deep import 绕过 package 边界，也未盲目 lazy 全部模块。
3. layout 完整测试约 2.1 秒、workbench 约 2.7 秒，正文/fixture/真实子进程占主体，不能仅用合并 runner 推断收益。
4. 不改 scheduler、资源预算、强杀生产 timeout 或完整验收；没有引入跨 Run 发现缓存。

## 验证

- 目标 eligibility：7 pass；tooling profile 全部正文：28 pass/轮。
- typecheck scripts、lint scripts、完整 Test Evidence（766 entities / 190 Cases）、materials 通过。
- 非实施代理独立审查：本次 region/input、62 个文件自触发、文档落点与 fingerprint 去重无阻断；未用该审查代替测试/性能证据。
- 正式 `bun run check`：31 passed / 12 not-applicable / 0 failed；initial result 27088.2 ms（30 秒 warning budget），Check mean 1879.8 ms、p95 3883.0 ms，均未报警。日志：`.log/project-gate/2026-10-22T02-44-18.542Z-2848544-fa5e6bbf-80e7-43dc-bacd-51ce78c04396/`。
- 正式 `bun run check -- --all`：43 passed；initial result 31705.3 ms（90 秒 budget），mean 1823.6 ms、p95 4657.2 ms，均未报警。隔离 consumer provider 此次 8714.9 ms，说明安装/准备波动仍存在；没有将局部去重说成消除了该波动。日志：`.log/project-gate/2026-10-22T02-44-45.847Z-2854617-37e43127-4369-4ccb-b12f-ad9de302a3e3/`。
- 测量期间其它会话将已有 Investigation 材料提交为 `808cf9de`；核对该提交仅涉及 `docs/investigations/**`，无 Product/scripts/package/tooling/Case 改动。本 Change 基线保持 `34c58409`，不自动刷新。固定路径八个样本的 Markdown occurrenceCount 均为 2594，candidate 完全相同；整个仓库并未冻结，不声称实验室式机器/文件全独占，也不将 required/all 单次耗时当作前后因果收益。
- 最终目标 selection/definition/run 测试、decisions、全部 Changes 与 diff whitespace 复核结果随交付日志保存；该轮记录形成时尚未 stage、commit 或 finalize。
