# Tasks

实施与定向机械证据、独立使用者复核已完成；用户已授权整理提交并结项，先保存完整完成态，再预检与 finalize，并提交清理结果。

## Readiness

- [x] 0.1 核对 main、工作区、维护 owner、活动文档判断与本轮授权；不存在要恢复的旧 Change。

## Implementation

- [x] 1.1 重组指南、同步 README 与必要导航，保留旧场景契约并新增性能排查和验证清单。
- [x] 1.2 同步受管示例源与投影映射，取得新接入路径的真实行为证据。
- [x] 1.3 按 ai-ready-docs 收敛主指南重心、冗余/迁移话语、篇幅与 Markdown 样式，完整交接移出主线的独立示例及其引用、投影和 Case。
- [x] 1.4 由 6.1 Terra 按“质量目标与证据 → Check 边界 → 执行图 → 项目入口 → 按成本演进”结构性重写，保证每节帮助读者作出设计判断并有可用落点。
- [x] 1.5 保留设计主线，按追加的 AI-ready 复核整理密段、冗余对照、残留连接与 Markdown 层次；保持示例代码、精确行为与安全边界。

## Verification

- [x] 2.1 定向检查投影、链接、相关示例和实际候选包材料，记录身份及未覆盖范围。
- [x] 2.2 由非实施代理基于实际包和 diff 完成首次接入、扩展与性能判断的使用者复核，修正并复核阻断问题。
- [x] 2.3 核对最终局部 diff、Change 结构和工作区范围，记录交付与尚未提交、发布的边界。
- [x] 2.4 对第二轮文本与示例布局取得相关机械证据，并以实际包复核首次接入、扩展定位、性能判断及安全边界；明确新旧候选证据范围。
- [x] 2.5 验证第三轮真实包、投影与引用，并由非实施代理从具体项目任务推导 Gate 设计，审查主线是否真正兑现核心，而非只验证片段能执行。
- [x] 2.6 对本轮正文与组织调整核对代码不变、投影/链接与实际包材料，并独立复核目标、路径和边界可恢复；本轮结论不冒用此前候选证据。

## Evidence

以下为首轮候选证据；用户追加的 AI-ready 整理完成后，后续验证另行记录，不把首轮结论视为新输入通过。

- 实施自验证：`bun run docs:api:write` 后 `bun run docs:api` 通过；`bun test scripts/docs/package-api/command.test.ts scripts/docs/package-api/render.test.ts` 为 3 pass；旧标题锚点在 README/docs/scripts 零命中。
- `bun run package:build` 重建并审计候选 `0.0.0-local.a0a106e40b39`；tarball SHA-256 为 `ab6f919690628b0c51a36c641bd7199b1b5083bf21e37fe5fa86b4a7017dd10b`。
- `mise exec -- bun test scripts/package/candidate/external-consumer/documentation.test.ts scripts/package/candidate/external-consumer/type-acceptance.test.ts`：4 pass / 0 fail；实际隔离安装的 Node 示例执行和严格 consumer types 均通过，使用 Node 24.18.0、Bun 1.4.4。
- `bun run validate -- materials`：508 JSON、5 current schema、1 current machine set、4 historical report examples 与 638 Markdown 链接检查通过，包含 package API 投影校验。
- `bun run test-evidence -- check --root .`：796 current entities / 796 Bun / 193 Cases / 17 topics，闭合通过；本次只同步 Case 证明文本，未改变实体身份。
- `bun run check -- --scope documentation`：10 passed / 33 not selected，局部验收通过；覆盖 scripts typecheck/lint、source format、Markdown lint/links、文档文件指标及 Gate selection tests。既有指南行数 waiver 生效，发现旧数量理由后另作描述同步，不改变策略。
- waiver 理由与 owner 同步后，`mise exec -- bun test scripts/project/gate/checks/repository-quality.test.ts` 为 3 pass；`AUX-PROJECT-GATE-CATALOG-001` 目的与实体不变，未重复全树闭合。后续 `package:status` 仍为同一候选 current，`docs:api` 与局部 diff 检查通过。
- `bun run change-plan -- check-all changes` 与 `bun run decisions -- check` 通过；未修改 Decision。
- Manual CR: 非实施代理 `guide_consumer_review` 完成同一实际包的 README/主指南全文、相关公开契约、实际 diff 与 Case 审查，通过且无阻断；独立首段入口演练覆盖正常/非法输入、package script、import guard、根目录与 CommonJS `.mts`，详见 [review.md](review.md)。包身份和公开页 bytes 审查前后未变；Node 无 type 项目的模块识别 warning 属非阻断观察。
- 本轮未运行 routine `--all`、正式 receipt 验收或性能 benchmark；未暂存、提交、推送、发布或 finalize Change。

## AI-ready Pass Evidence

- 主指南由 875 行 / 45,081 bytes 收敛为 703 行 / 34,768 bytes；两组完整诊断实现移交既有 commandCheck 专题，该页由 206 行增至 390 行。篇幅仅作观察：保留全部独立用法和安全边界，代码以可读排版展开，不以压行数为验收目标。
- 撤回首轮新增且未提交的重复 `gate-custom-rule.ts` 与投影；自定义基础路径复用 README。五份既有 gate 示例仅排版，实施者以 TypeScript scanner 比较 HEAD 的非 trivia token，5/5 相等；未改变产品、入口示例行为或测试实体。
- `bun run docs:api:write` 后 `bun run docs:api` 通过；projection command/render 两文件 3 tests 通过；`bun run validate -- materials links` 为 638 files；旧标题/冗余数量与已撤回 source 引用扫描无残留，局部 diff 检查通过。
- `bun run package:build` 形成并审计候选 `0.0.0-local.b6c45a06fac8`，tarball SHA-256 `864ac83ee6fbcd9cb490b8ef47522ac43dc0622628b97cf585a5f1eda13445dd`；`package:status` current。
- `mise exec -- bun test scripts/package/candidate/external-consumer/documentation.test.ts`：2 pass / 0 fail，实际隔离安装执行全部 runtime 示例及 machine Definition。
- `bun run test-evidence -- check --root .`：796 entities / 193 Cases / 17 topics 闭合通过；两条 Case 只同步示例归属和证明文本。
- `bun run check -- --scope documentation`：10 passed / 33 not selected，Markdown lint/links、文档指标、scripts typecheck/lint、format、selection tests 通过。主指南 SCC code-lines 528，沿用精确既有 waiver，未修改 500 限额或豁免范围。
- 本轮产品与类型契约未改变，五份示例仅 token-equivalent 排版；没有重复 consumer types、全 Gate、远端 CI、正式发布验收或 benchmark。首轮 types 证据仅按其原候选记录，不表述为本轮重新执行。
- Manual CR: `guide_consumer_review` 对实际新包全文重读并完成 AI 任务恢复；两套诊断 Markdown 与新运行尾部独立执行均形成一条 Record、failed 和 exit 1；加入越界第二条后整组拒绝且保持失败。结论通过，无实质遗留问题，详见 [review-ai-ready.md](review-ai-ready.md)。审查后包身份不变；旧 [review.md](review.md) 继续仅证明首轮。

## Gate Design Pass Evidence

- 主要改写由 `guide_design_terra`（6.1 Terra）完成：以配置、测试、同一构建产物的大小与运行验收为连续设计例子，从证据和失败含义推导 Check、执行关系、共享/隔离及入口，再按成本演进。主指南为 185 行 / 14,400 bytes；此数字仅为布局观察，目标验收仍是具体设计任务。
- 七份深入受管片段移入对应随包专题，主指南保留真实 JSON 完整入口；两份诊断片段继续由 command-check 专题拥有。投影 registry、README/导航及相关引用同步，示例行为未在本轮改变。
- 实施者的 `docs:api:write/check`、投影测试 3 pass、external consumer fixture 定向 1 pass、638 文件链接检查通过；两条包材料 Case 仅同步归属和证明文本。
- 首次定向 Gate 10 passed / 33 not selected，并报告主指南的旧 waiver 已无 Finding 匹配。移除该单项例外，同步配对配置测试、仓库质量 owner 与 `AUX-PROJECT-GATE-CATALOG-001`；行数限额和扫描范围保持，未新增或扩大豁免。
- `bun run package:build` 重建并审计候选 `0.0.0-local.95039eeb5caf`，tarball SHA-256 为 `826b5d3f4f1987deee0229ae16a2e0f76b00e2dedc7aeb7025d14682515bc45e`；随后 `package:status` current。
- `mise exec -- bun test scripts/package/candidate/external-consumer/documentation.test.ts scripts/project/gate/checks/repository-quality.test.ts`：5 pass / 0 fail，其中 2 项文档验收通过隔离安装执行所有受管 runtime 示例与 machine Definition，3 项证明实际 repository-quality 配置与阻断策略。
- 移除 waiver 后 `bun run check -- --scope documentation`：10 passed / 33 not selected，无 unused-waiver warning；`bun run test-evidence -- check --root .`：796 current entities / 193 Cases / 17 topics 闭合通过；`docs:api`、局部 diff 与 Change 结构检查通过。
- 独立阅读后收尾 README 旧摘要及三个专题的无锚点自链接，正文主线与所有代码不变。`docs:api`、638 文件链接和局部 diff 检查通过；重新构建并审计最终候选 `0.0.0-local.531434cda253`，tarball SHA-256 `c4cc16f344733fbf3f3ffcf14fab2de85443183ca1f6fe9a7aac81e21742c1dc`，`package:status` current；实际隔离安装的 documentation acceptance 再次 2 pass / 0 fail。
- Manual CR: 非实施代理 `guide_design_review` 仅凭实际包完成配置、测试、同包大小与干净安装运行的具体设计任务，恢复证据、判决、直接依赖/观察、共享/隔离、identity/清理、入口及成本演进的判断；结论通过，无阻断发现。独立从 Markdown 抽取片段执行 23 项 Node v26.8.2 消费者对照，另有投影测试 2 pass；最终包 1,559 个普通文件核对 tarball/unpacked/installed bytes 一致。四处导航收尾逐项复核，主指南、代码和关键契约 bytes 未变，前轮动态证据适用；详细范围与非执行的设计答案见 [review-design.md](review-design.md)。
- 本轮未运行 consumer types、全 Gate、正式 receipt 发布验收、远端 CI 或性能 benchmark；未暂存、提交、推送、发布或 finalize。Change 任务完成但仍保留 Plan，提交与结项等待用户授权。

## Design AI-ready Refinement Evidence

- 本轮由 6.1 Terra 继续主要实施，仅修改主指南和 command-check 专题正文。质量证据、Check 边界、取得方式及执行图责任有明确子层次；入口前导合并，片段运行约定归回项目入口并覆盖所有自带入口的片段；成本长表和密段改为按判断展开的自然段。移除“验收设计而非能力清单”等编辑性对照，修正命令专题的方向说明与自链接；必要失败、权限、取消、隔离和敏感信息约束保留。
- 主指南为 208 行 / 13,998 bytes，较上轮 185 行 / 14,400 bytes 增加的是层次和留白，未以压行数为目标。命令专题为 429 行 / 24,547 bytes；完整诊断代码继续由其行为 owner 承接，本轮不改 API、示例源、投影路径、测试实体或 Case。
- 主线程在重建前从旧 `531434cda253` tarball 读取两页，与本轮源文件逐字比较全部 fence：主指南 8 个、命令专题 7 个均一致。旧 tarball 随正常 candidate rebuild 被清理，比较结果是本轮主线程证据，不冒充独立审查者重新比较。
- 实施者 `bun run docs:api`、638 文件链接和定向 diff 检查通过；受管内容与目标路径不变，未运行投影写入。
- `bun run package:build` 重建并审计候选 `0.0.0-local.32eb3753d730`，tarball SHA-256 `138e0960747054908b85c29f411ee67310799043f54a4e4a828f0ebbef8fb45c`，`package:status` current。`mise exec -- bun test scripts/package/candidate/external-consumer/documentation.test.ts` 为 2 pass / 0 fail，实际隔离安装执行全部 runtime 示例与 machine Definition。
- `bun run check -- --scope documentation`：10 passed / 33 not selected；覆盖 Markdown lint/links、文件指标、脚本类型/lint、format、选择测试和 whitespace。Change 结构及局部 diff 检查通过。未重复 consumer types、Test Evidence 全树闭合或全 Gate，未运行发布验收与 benchmark；上述边界本轮未改，定向结果不代表完整发布验收。
- Manual CR: `guide_design_review` 独立基于本轮实际包完成五维检查，以及“从质量目标到 Gate”和“运行仅 Definition / 自带入口专题”两类任务恢复；通过，无阻断发现。六个相关文件核对 source/tarball/unpacked/installed bytes 一致，独立 `docs:api` 与目标 diff 检查通过；未重复未改代码的 23 项动态对照。证据、沿用与未覆盖范围见 [review-design-ai-ready.md](review-design-ai-ready.md)。本轮完成后仍未暂存、提交、推送、发布或 finalize。

## Commit and Closeout Authorization

用户已要求“把这次文档调整整理提交，并完成 Change 结项”。提交范围限定本 Change 的文档、示例、投影、Case、失效 waiver 清理及计划证据；工作区为 main，起始暂存区为空。当前 checkout 启用 `.githooks`，普通 commit 允许其按 3,600 秒冷却、main→origin/main、非强制且不带 tags 的规则尝试自动推送。完整计划保存后通过公开 `change-plan finalize --preflight` 与 `finalize` 退出，并移除协调页当前引用；不发布 package，不扩大到其它 Change 或完整发布验收。
