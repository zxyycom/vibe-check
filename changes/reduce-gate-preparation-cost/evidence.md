# 实施与测量证据

本轮仅实施完整输入独立复制与 Validation layout 按需加载，Project 源码不动。原型调查不代替本次正式 before/after。

## 实现和语义证明

- artifact owner 每次重新枚举完整仓库输入。生产 hash 保持原排序、重复项、相对路径/NUL/原始 bytes 与 toolchain prefix；去重仅用于 fixture 复制，每个 caller 的 copyFileSync 副本独立。未使用共享可写 fixture、硬链接、全局缓存或固定 532 路径白名单。
- 生产实现 before/after 对同一 frozen source 的 fingerprint 均为 7425d37042dbefc705b1fe559ce726d1783e60675aaa471e09e2728f07e9f64a。真实当前 candidate identity 因 owning script bytes 变化可正常更新，不以要求 live hash 不变掩盖构建输入变化。
- 所有原 manifest/workspace/patch、raw mapping、support source、Gate-guide bytes 敏感性断言保留。新增明确 .cache source 路径的内容检查、复制新输入、非输入目录排除及回写隔离，不仅依赖共享 collector 的相等自洽。
- workspace 只在材料成功且非 materials-only 后 await import layout，随后运行原 Git 检查；未知参数、非零材料结果短路，missing-module/layout failure 不被吞掉。
- 原 workspace 测试实体新增一次隔离 child，读取真实 adapter 副本和窄依赖 stub，观察未加载/默认调用次序/错误传播；不替代真实完整 validate，不证明正式 CLI OS exit status。无生产测试专用 env、CLI 或注入接口。
- 负向控制：仅在隔离子进程恢复旧全仓 helper 或旧 eager adapter 时，新回归均按预期拒绝（exit 1）；当前实现目标测试通过。日志在 .log/preparation-negative-controls/，未修改正式源文件。

## Workload 与 before/after

Bun 1.3.14 / Linux x64 / 4 CPUs，OS cache warm，1 warmup + 5 measured；计时窗口顺序执行，无 benchmark mock。before 在正式源码修改前运行，after 在修改后运行，原始数据保存 source SHA、完整 test commands/pass lines、loadavg、log 目录。

fixture helper 使用同一份 frozen source，覆盖 before 的完整仓库快照，避免另一会话新增调查资源改变输入规模；验证 hash/统计在 copy timer 之外，cleanup 单独计时。snapshot.json 记录保留位置和形成时间。

| frozen helper | before median [range] ms | after median [range] ms |
| --- | --- | --- |
| copyMs | 667.17 [506.60–1098.02] | 72.17 [70.82–81.11] |
| cleanupMs | 84.49 [59.95–107.54] | 8.11 [7.34–8.53] |
| copy+cleanup | 774.70 [569.23–1182.51] | 80.70 [78.93–88.45] |

复制数量：3355→532 文件；73701961→2815725 bytes。工具链由原 resolver 从已安装环境绑定，不作为仓库 fixture 内容复制。

| 完整测试入口 | before median [range] ms | after median [range] ms | observed median reduction |
| --- | --- | --- | --- |
| fingerprintTests | 1839.55 [1669.97–2348.53] | 792.25 [775.65–811.93] | 56.9% |
| validationLane | 1012.06 [916.49–1162.13] | 701.02 [690.56–772.64] | 30.7% |

fingerprintTests 是 manifest.test.ts + package-documents.test.ts（每轮 6 pass）；validationLane 是实际 resolver 的完整 4 个文件（每轮 11 pass）。after 包含新增回归步骤，未用 test-name-pattern 隐藏新成本。共享工作区/机器并非全冻结独占，范围和 loadavg 原样保存；局部观测不承诺对应比例的 Gate wall 改善，copy/cleanup/单项测试不重复相加。

## 验证

- 起点及修改后完整 Test Evidence 均通过：766 entities / 190 Cases，无实体 rename/delete，扩展原 Case。
- 初始最窄目标测试：8 pass / 3 files；正式测量每轮 fingerprint 6 pass、Validation 11 pass。
- scripts typecheck、lint、真实 bun run validate（含所有材料、真实 layout 与 Git whitespace）通过；这些命令的时间点早于另一会话超大 JSON 产出。
- 非实施代理审查通过：输入/顺序/复制隔离、加载/失败边界及内部文档/Case 同步无阻断。34 项注册随包材料及 registry、src/** 未变化，无需改公开 Product 用户材料。
- 该轮验收时，snapshot 中 91 项 Project 文件摘要全部一致；本轮没有 Project 实现或测试选择变更。

## 首轮完整 Gate 与外部阻塞

- required：31 passed / 12 not-applicable / 0 failed；initial result 38456.4 ms，candidate preparation 9881.1 ms、adapter/setup 446.7 ms、Product Run 28128.6 ms。触发 30s 总 warning，mean 2041.5 ms 也略超 2000ms；P95 4628.6 ms 在 5000ms 内。没有隐藏首次冷准备/运行波动。
- --all：42 passed / 1 failed；唯一失败是 materials-json-validator，Record reason=too-large，路径 docs/investigations/_resources/261021-profile-markdown-link-consumer-workload/io-experiment-safety.json。失败当时文件为 25,795,241 bytes，超过既有 2 MiB 单文件限制；JSON 本身可解析，不能把它表述为语法损坏。其余 42 项（含全部 package acceptance）通过。
- 首轮日志：.log/project-gate/2026-10-22T03-25-37.967Z-2894590-a5e08e63-1edf-44e2-a6a7-bfdce01af414/ 和 .log/project-gate/2026-10-22T03-26-07.054Z-2900760-45462f1c-6115-4dbc-b77d-0923f3fe6eef/。
- 用户明确选择由原会话处理超大调查材料后复跑。本轮未修改该文件、未放宽上限或排除校验。原会话已将文件缩至 233,038 bytes，显式 JSON 复验通过（520 files），随后 required/all 均复跑通过。
- required 复跑：31 passed / 12 not-applicable；initial result 27897.6 ms（candidate 181.0、adapter 475.7、Product Run 27240.9），mean 1974.6 ms、p95 4811.7 ms，均在现有 warning budget 内。日志 .log/project-gate/2026-10-22T03-34-54.887Z-2907963-7e711e8d-7734-4a3d-bb9c-3465f42afeb6/。
- --all 复跑：43 passed；initial result 35650.6 ms（candidate 271.2、adapter 678.2、Product Run 34701.2），mean 1963.3 ms、p95 4733.7 ms，均在现有 warning budget 内。日志 .log/project-gate/2026-10-22T03-35-23.594Z-2910745-0e9d7cb2-a8e3-4ca2-b99f-d4d105d10c7f/。
- 两次暖态复跑无报警不代表冷构建也满足 30s；required 的 mean/P95 余量仍不大。本轮未调预算或声称整体 Gate 比例收益。保留全部首轮警报/外部失败和复跑证据。

## 留存与复现边界

file-lifecycle-hygiene：本 Change 下脚本/JSON 为实施证据；snapshot.json 指向本轮独占 mkdtemp 创建的 frozen source（/tmp），供 before/after parity 和后续只读审查，随本 Change 验收/结项决定是否清理，不删除其它会话材料。每轮复制目标是另一个独占临时目录，finally 已清理。该 snapshot 不是 Git 仓库，也不是备份用户工作或生产入口；before metadata 未重复覆盖。

复测 after：mise exec -- bun changes/reduce-gate-preparation-cost/measure.mjs after。before 是改动前真实执行所得，当前源码重跑不得称为旧基线，脚本拒绝覆盖已有 snapshot。只读统计摘要：`uv run --no-project --offline python changes/reduce-gate-preparation-cost/summarize.py`，输出到 stdout，历史叙述由本页人工维护。重跑 after 会覆盖 JSON，先保留旧观测；/tmp 被系统清理后需重新建立成对基线，而不能直接重放。

该轮记录形成时尚未 stage、commit 或 finalize，已有工作保持原样。最初 snapshot 试图复制进 repository 子目录，被 fs 自复制保护拒绝（未进入样本），最终改为 /tmp 独占 snapshot。

## 交付复核（2026-10-22）

本次交付复核覆盖本聊天的四组 Gate 优化，以及前序进程/Markdown 测试减重；上述历史测量及所有原始 JSON 保持原样。

- **文档：** 按 `ai-ready-docs` 将前两组 design 的测量流水移入各自 `evidence.md`，设计保留方案与边界；Gate required 输入改用消费者表格，合并重复描述，并区分形成时状态与当前规则。Case 的按需准备义务从 Gate owner 明确路由到 lifecycle owner。公开 API、JSDoc 和发布 registry 不变，随包用户材料无需调整。
- **代码：** 按完整编码规范审查正式代码及九个 Change-local 脚本。收敛领域命名、声明式 region 转换、逻辑时钟恢复和 child release/await 清理；测量脚本展开可读阶段并覆盖失败清理。`summarize.py` 只读 raw JSON 并输出统计，不再覆写包含人工判断的历史报告。
- **精确格式例外：** Markdown 的三参数 test 声明保持单行，以满足当前 Bun 1.3 JUnit 的 name-line 与静态声明行一致性。拆行 probe 记录 name line=189、声明 line=188，完整 Test Evidence 拒绝该不一致；源码相邻注释说明这一局部约束，正文使用规范缩进。未改测试目的、timeout 或发现规则。
- **局部验证：** 10 个目标文件的 30 项测试通过；前后全树 Test Evidence 为 766 entities / 190 Cases。八个 mjs 及实际生成的 instrumentation/driver 可转译，Python compile、原始统计公式对照和只读摘要通过；这些静态检查不代表重新执行历史 benchmark。
- **完整 required：** 首跑因上述声明拆行导致 Case identity 不一致而失败，其余 30 Checks 通过；修正后 31 passed / 12 not-applicable，Product elapsed 25.9 s。mean 2,005.1 ms 略超 2,000 ms warning budget，P95 4,946.5 ms 在 5,000 ms 内。
- **完整 all：** 43 passed / 0 failed / 0 unavailable，Product elapsed 35.8 s。mean 2,324.1 ms、P95 6,093.4 ms 仍告警；consumer preparation 此次 20,756.7 ms。保留该观察，不调整预算，也不从本次单次运行推导性能回归或提速。
- **独立反查：** 非实施代理从实际源码、文档、Case 和临时脚本反查，唯一 owner 路由缺口已补链并复核，无剩余问题。其另实际验证只读统计摘要与历史数值一致，未把只读审查当作 Gate 执行证据。

复核日志与原始快照保存在 `.log/gate-delivery-review/20261022-5rowom/`。正式 Gate invocations：required 修正后为 `.log/project-gate/2026-10-22T06-32-18.753Z-3232251-7bca412c-9c6b-49b9-b907-f8a7e3a947e1/`，all 为 `.log/project-gate/2026-10-22T06-32-45.924Z-3238391-da410eb4-df7e-460e-83bd-ab28c21442b3/`。

本次授权包含按语义整理 Git 提交并允许现有 hook 推送；Change 目录保留。另一会话的 `optimize-markdown-link-native-io` 及其协调行不纳入提交。测量脚本只做静态/只读验证，没有覆盖旧 baseline 或为本次格式整理重新宣称性能收益。
