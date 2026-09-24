---
title: "复核本地最近提交与文档输入的 Gate 选择"
id: "260924-review-local-head-gate-selection-and-document-inputs"
formedAt: "2026-09-24T09:54:04Z"
question: "默认 Gate 是否应依赖远端比较基准，以及 package/Case 测试是否会被无关文档唤起？"
tags:
  - "change-selection"
  - "performance"
  - "project-gate"
  - "test-execution"
relations:
  - type: "复查"
    target: "260924-audit-incremental-project-gate-selection-and-cold-cost"
    summary: "改用本地最近提交并收窄两组文档输入"
---

## 形成时背景

前序[增量 Gate 调查](./audit-incremental-project-gate-selection-and-cold-cost.md)确认 change flag 已启动，但默认 required 在本地 `main` 领先 `origin/main` 时仍纳入远端比较基准之后的累计改动。本轮用户指出日常检查应关注本地最近变更，而非远端同步状态，并同意继续收窄不必要的测试文档输入。本轮不把此前候选编译缓存改动计入选择策略的效果。

## 调查目的

1. 核对 Git 比较基准是否使旧提交持续选择 Check，并落实不依赖远端的日常选择边界。
2. 判断 package supporting 与 Semantic Case 两组测试是否因不消费的文档而启动；收窄时保持新材料、新 Case owner 的选择闭合和 `--all` 强制路径。
3. 记录实际默认/完整 Gate 的选择与耗时，不把单次墙钟差或更少的 Check 数量直接解释为稳定提速。

## 调查范围与依据

代码证据为 `scripts/project/gate/definition.ts`、`runtime/eligibility.ts`、Product `src/project-run/changes/git.ts`、测试 lane 清单和 `docs/package-documents.json`。原配置固定 `compareWith: "origin/main"`；Product 把 `<compareWith>...HEAD`、staged、unstaged、untracked 并成一次 changed-path snapshot，Git 获取失败时保守注入全部声明的 change flags。本地 HEAD `db79ccd5f00e2e5f27dd1fd5b60bb74284d56ae7` 时，`main` 领先 `origin/main` 两个提交，`origin/main...HEAD` 包含 42 个已提交路径；而 `HEAD~1...HEAD` 只包含最近一次调查报告提交的 5 个路径。这些是当时的本地 Git 状态，不代表远端服务器当前事实。

原 `package-tests` region 包含整个 `docs/**`，一旦命中便运行 17 文件的 package supporting lane；随包配置当时登记 31 个 source path。原 `test-surface` 包含 `docs/**/*.md`，而 155 个当前 Case 的 Owner 只指向 42 份不同的文档；目录中约有 475 份 Markdown。前两种数量是源码/账本集合规模，不是可节省时间估计。Case 账本与 Test Evidence 严格检查仍是完整集合校验，不因选择 region 收窄其自身检查内容。

本轮修改 `definition.ts` 为本地 `HEAD~1`，保留 Product 原有的工作区变更合并与不可用回退。`package-tests` 保守选择当前随包材料所在的 README、注册文档、schema/example、法律材料和相关 `scripts/docs/**` / package / Product 源码，不再因 `docs/investigations/**` 或 `docs/decisions/**` 启动；`test-surface` 保留源码、Case 账本和当前行为 owner 所在的文档范围。两组闭包测试使用 Product config-glob 同选项的 `minimatch`：所有注册 package source、现有 Case Owner 必须命中；新增 registry 或 Case 文件也会选择这个轻量闭包测试。focused preset 与 `--all` 的条件没有变。

## 调查结果与边界

**策略澄清。** `HEAD~1...HEAD` 表示最近一次本地提交；它与 staged、unstaged、untracked 并集。因此当前有未提交改动时，也仍包含最近提交，而不是“仅工作树改动”。merge commit 使用第一父链；root commit、浅克隆缺父提交或其它 Git 失败使 Product 走保守选择，不能当作零变更。新选择不依赖 `origin/main` 是否存在、更新或已 push。历史决策中关于远端比较基准的描述保留为其形成时判断；当前 Gate owner 和代码给出新事实。

**输入收窄。** 路径矩阵证明调查/决策 Markdown 不再选择 package supporting 或 Semantic Case 测试；注册 package Markdown/机器材料与所有当前 Case Owner 仍命中；`docs/package-documents.json` 和 `docs/testing/cases/**` 变化会启动闭包测试，避免未来登记新路径后静默漏选。此测试只证明声明的路径→region 关系和当前登记闭合，不取代 Product Git snapshot 测试，也不证明每个 test 文件都已最小化或所有潜在跨文件依赖都已建模。`markdown-link-validation` 仍因任意变更运行，覆盖未建模的链接 target 反向依赖。

公开入口的顺序观察：修改前在上一阶段工作树的 required 为 **21 passed / 22 N/A、15.547s**；修改并手工匹配本地声明指纹后的 required 为 **20 passed / 23 N/A、11.249s**（Product Run 10.662s），`--all` 为 **43/43 passed、30.118s**。最后一次闭包触发 region 小补丁后重新运行：required **20 passed / 23 N/A、10.0s**，`--all` **43/43 passed、28.2s**。前后三组日志分别在 `.log/project-gate/2026-09-24T09-27-51.310Z-2398114-f7bcd8c3-6ff5-4e71-8849-a9b341b353fa/`、`2026-09-24T09-51-17.829Z-2412305-33b6398a-f4f5-4327-9088-8436acbd5218/`、`2026-09-24T09-51-38.573Z-2412988-58fe5e89-8b18-44fa-95fb-e8180818d236/`、`2026-09-24T09-55-56.387Z-2421177-8321271a-d48c-42a5-abc0-147f656a1916/` 与 `2026-09-24T09-56-09.844Z-2421819-f6c1ed39-a30f-466b-9e9f-120242178679/`。这些都是热候选且工作树、选择规则与环境负载未严格配对；总耗时差不能全归因于本轮选择改变。

本机忽略 Git 的 performance baseline 只手工更新声明指纹，required **20,000ms**、`--all` **60,000ms** 硬阈值保持不变；指纹未匹配的中间 Run 即使 20 项 Check 都通过，Gate 仍按规则失败，不能算通过。`mise exec -- bun test scripts/project/gate/runtime/eligibility.test.ts scripts/project/gate/definition.test.ts` 的 12 项通过；两项新增实体纳入原 `AUX-PROJECT-GATE-SELECTION-001`，Test Evidence 现为 652/652 实体、155 Cases。脚本 typecheck、lint、format、`bun run validate`、Decision 与 Investigation 索引检查均通过。未测的独立“仅决策/调查文档”真实 Git fixture 不由路径矩阵冒充。

后续若继续优化，应先对剩余广域 `project-tests` 等 lane 逐文件核对真实输入，或量 Markdown link 的解析与目标核验成本；不应仅因一次 6.7 秒的 package-tools boundary 测试而拆分它。该项曾由远端累计提交命中，在当前本地最近提交加工作树 snapshot 中未被选择。
