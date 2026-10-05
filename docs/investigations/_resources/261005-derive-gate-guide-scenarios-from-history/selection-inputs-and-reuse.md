# Gate 历史素材：选择、真实输入与结果复用

本资源归属 `261005-derive-gate-guide-scenarios-from-history`，供正式报告挑选不同场景与反例；不是当前规范，也不是一套必须全部照搬的 Gate 模板。

## 范围与依据

调查日期：2026-10-05；基线：`e1164d27177f4b4b010a0603ffe999ac6c98084d`。先读取 Gate、材料验证、公开 flags、Markdown lint 与测试 owner，再由 CodeGraph 定位当前符号，以路径限定源码和 Git diff 核对。

经 Investigation 入口查询并完整读取三份既有报告：[增量选择](../../audit-incremental-project-gate-selection-and-cold-cost.md)、[本地比较基准](../../review-local-head-gate-selection-and-document-inputs.md)、[Markdown lint 缓存](../../measure-and-cache-markdown-lint-findings.md)。测量只沿用其形成时条件。

下文历史路径用于定位版本，命令从仓库根复核；TypeScript 均为按公开签名改编的局部草图，未运行或类型检查。本轮读取了相关测试断言，并完成 Case 映射检查（667 实体、160 Cases、15 topics），未执行测试正文、完整 Gate 或 benchmark。

## F1：选择 downstream 时由 Product 补齐 prerequisite

### 问题场景与历史事实

required/preset membership 可以表达“想运行哪些检查”，但 downstream 还需要 `dependsOn`。旧 Gate 在 metadata 层对 `dependsOn` 与 `observes` 都要求 required/preset 静态闭合，并保留 `projectGateEligibleCheckIds` 的另一份选择投影。调用方/项目层因此需要重复维护 prerequisite membership。

before 为 `a5f2d04459fc4664c5a4b13d73451565663ed1f8`；`fb6951430a7c85adfc3a8f4a1ab44777f04b4486` 将 Gate 投影改为 literal `propagateDependsOn: true`，删除 `projectGateEligibleCheckIds`，由 Product 维护命中 root 的传递 `dependsOn` selection closure。Gate 的 `entries.ts` 只对 `observes` 保留 membership 闭合检查。此前 `5ae74e6de05deee01b2aecfa6a2f6bf5a136b5d0` 可见旧的 `flags/mode` 投影，不可直接当当前 API 用。

可复核：

```bash
git show a5f2d04459fc4664c5a4b13d73451565663ed1f8:scripts/project/gate/runtime/entries.ts
git show fb6951430a7c85adfc3a8f4a1ab44777f04b4486 -- scripts/project/gate/runtime/entries.ts scripts/project/gate/runtime/eligibility.ts
```

实际证据：当前 `src/project-run/check-execution/flag-dependency-selection.test.ts` 的 direct-match 测试断言：不 opt-in 时 provider 不运行，root 因 prerequisite 未通过为 unavailable；closure 测试断言 provider/middle/root 各只执行一次，`observes` 对象未被带入。当前 `scripts/project/gate/definition.test.ts` 的 `starts a downstream-only Gate Check...` 观察同一行为。

### 候选例子（局部 TypeScript）

```ts
import { defineCheck, defineConfig, run } from "@zxyycom/vibe-check";

const provider = defineCheck({
  checkId: "prepare-input",
  displayName: "Prepare input",
  enabledByFlags: { when: "prepare" },
  execute: () => ({ status: "passed", data: {} })
});
const consumer = defineCheck({
  checkId: "verify-input",
  displayName: "Verify input",
  dependsOn: [provider.checkId],
  enabledByFlags: { when: "verify", propagateDependsOn: true },
  execute: () => ({ status: "passed", data: {} })
});
// 只传 verify；Product 的依赖闭包仍会选择 provider。
await run(defineConfig({ checks: [provider, consumer] }), { flags: ["verify"] });
```

验证重点：opt-in 的默认边界；传递 provider 正常 lifecycle/失败阻断；`observes` 不传播；未直接命中且未被带入者保留 N/A facts。**推断/教学建议：**这适合讲依赖选择责任，而不是讲缓存或并行优化。后续语法简化见 F2；改编时还需补齐真实输入与取消分支。

## F2：日常变更、人工 force 与 callback 共用 flag 事实

### 问题场景与历史事实

单纯 required/preset metadata 无法表达“required 且输入变化，或者人工 force”。before `8599bf4f4af1a4f7ac53ee69747bfc9997490b36`；`4a9426d7815424c776737200906960996de3bcd1` 新增 Project changes，在 selection 前获取 Git snapshot，给 Product runtime lane 投影嵌套条件，并保留 focused/all 强制路径。

**同轮后续修正，不是一路加码：**最初保留 shorthand `{ flags, mode }`、object leaf `{ kind: "flag", flag }`、`source.kind: "git"`，且 callback `project.flags` 仍只显示 caller flags。`8638ed77da0397182694bcba7ff4c23a03280890` 删除这些多余语法，统一字符串 leaf AST；caller + Git-derived tokens 合成同一 effective flags，selection 与 callback 共用它。`project-changes-lifecycle.test.ts` 的预期从 `["caller"]` 改为 `["caller", RUNTIME_CHANGE_FLAG]`，不可用分支从 `[]` 改为 `[RUNTIME_CHANGE_FLAG]`。这不是新增一种性能捷径，而是减少契约分裂。

可复核：

```bash
git show 4a9426d7815424c776737200906960996de3bcd1 -- scripts/project/gate/definition.ts scripts/project/gate/runtime/eligibility.ts src/check/flag-enablement.ts
git show 8638ed77da0397182694bcba7ff4c23a03280890 -- src/check/flag-enablement.ts src/project-definition/project-changes.ts src/project-run/project-changes-lifecycle.test.ts
```

实际证据：当前 `src/project-run/project-changes-lifecycle.test.ts` 断言 prepare/execute 共用同一 frozen project context 与 change evidence；`src/project-run/changes/git.test.ts` 区分可信零匹配与 unavailable 保守注入。公开 owner 为[自定义 Check](../../../guides/extending-check-lifecycle.md)的 flag 章节和 [API 机制](../../../api-mechanics.md)的文件变化章节。

### 候选例子（局部 TypeScript）

```ts
import { all, any, changeFlag, defineCheck, defineConfig, run } from "@zxyycom/vibe-check";

const verify = defineCheck({
  checkId: "verify-app",
  displayName: "Verify app",
  enabledByFlags: { when: any(all("daily", changeFlag("app")), "force") },
  execute: ({ project }) => ({
    status: "passed",
    data: { flags: project.flags, evidence: project.changes?.ok === true ? "available" : "unavailable" }
  })
});
const definition = defineConfig({
  changes: {
    source: { compareWith: "HEAD~1" }, // 本例选择本地最近提交；不是 Product 默认值。
    flags: { app: { include: ["app/**", "pnpm-lock.yaml"], exclude: [] } }
  },
  checks: [verify]
});
await run(definition, { flags: ["daily"] });
// 无须伪造 change token；人工 force 是普通 caller flag。
await run(definition, { flags: ["force"] });
```

验证重点：`changeFlag` 只造 token，不读 Git；ID 必须在 Definition 声明；caller 不能注入保留前缀；unavailable evidence 不得伪装成 `files: []`；force 不应被 change predicate 包住。`changes.ok === true` 表示证据可信可用，不表示 region 命中；可信零命中仍为 `ok: true, files: []`，force 路径也能遇到这种情况。局限：Git unavailable 注入全部 change flags，对任意否定式 DSL 不保证“一定全选”；上例采用正向条件才具备所说保守选择。消费者的 revision policy 仍需独立确定。

**来源摘要待校正。** 基线 [callbacks 指南](../../../guides/callbacks.md)第 51 行仍把 Project facts 准备标为相邻 Change；当前 API 和 `src/project-run/changes/git.ts` 已实现 selection 前 changes 准备。这不等于新增公共 invocation-wide callback。本轮未修改该摘要。

## F3：按材料划分输入，保留反向链接依赖

### 问题场景与历史事实

before `1cf60792dd44f2a17bece1b7af28e5b29cc268a1`；`a508fc48946590b39b6f31120f024b5ab6109cb9` 将四项材料 Check 接到 `repository-material` region：`required AND changed OR materials OR all`。但该 region 包含 `docs/**`、`scripts/**`、`src/**` 等广域路径，能安全省略部分工作，却不能精确代表各消费者。

`f63720aa69a2debd9a5ccd3b3a963e99c50af35f`（before `106929d88b8b5fab2bc146e742c47f0be987b8ad`）把单一 region 拆为 JSON、Schema、publication、machine example 与 Markdown lint 等真实输入 region，并将其它 required Check 也映射到各自输入。其目的不是把 every check 变成“只看同名目录”：example generator 实际执行 Product，因此保守覆盖 Product 非测试 `src/**`；publication 读 schema source；共享 file-collection/data-boundary、provider helpers、锁文件也保留。

两个不一样的链接边界必须区别：`materials-links-validator` 无条件属于 required；`markdown-link-validation` 用 `any-change`，在任意路径变化时扫描完整 corpus。它们没有因为“Markdown 未改”而跳过，因为链接 target 的反向依赖尚未完整建模。focused `materials`/`quality` 与 all 仍强制其成员。

可复核：

```bash
git show a508fc48946590b39b6f31120f024b5ab6109cb9 -- scripts/project/gate/definition.ts scripts/project/gate/runtime/eligibility.ts docs/tooling/repository-material-validation.md
git show f63720aa69a2debd9a5ccd3b3a963e99c50af35f -- scripts/project/gate/runtime/eligibility.ts docs/tooling/repository-material-validation.md
```

实际证据：历史 `a508fc...` 的 `definition.test.ts` 使用真实 Git/Product Run 材料场景；后续 `f63720...` 删除重复矩阵，将 Gate region 责任移至轻量路径矩阵，Product Git snapshot 保留独立证明。当前 `eligibility.test.ts` 的 quality/material 矩阵断言 runtime implementation 选择 machine examples，test-only 不选择它；当前 `definition.test.ts` membership golden 验证 required/no-change 仅选择 prepared candidate、material links、diff whitespace 三项。真实 schema drift 拒绝由独立材料验收负责，region 矩阵不能冒充它。

### 候选例子（局部 TypeScript）

局部条件示例：将 `json-check`、`schema-check` 的执行分别交给已拥有该材料的普通 Check，注册与真实读取对应的 region，而不是写一个通用材料 dispatcher。

```ts
import { all, any, changeFlag } from "@zxyycom/vibe-check";

const jsonEnablement = {
  when: any(all("daily", changeFlag("json-input")), "materials", "force"),
  propagateDependsOn: true as const
};
const schemaEnablement = {
  when: any(all("daily", changeFlag("schema-input")), "materials", "force"),
  propagateDependsOn: true as const
};
// 在同一 Definition 的 changes.flags 分别声明这些真实输入。
// 未建模链接反向依赖的 links Check 可以直接 when: any("daily", "materials", "force")。
```

验证重点：共享输入可多选消费者；rename/deletion 以 Git path 而非当前文件存在性选择；selected Check 的依赖闭包；完整 force；链接反向依赖兜底。**教学建议：**展示“两个可精确收窄的材料消费者 + 一个不能安全收窄的链接消费者”比单个万能 region 更有区分力。未知：路径矩阵并不证明全部真实读取闭合，也不证明时间收益；未来新增生成器输入仍需 owner 审查。

## F4：比较基准是任务政策，文档登记集合是实际输入

### 问题场景与历史事实

默认远端基准会把已提交但未同步远端的旧工作继续选入日常 Gate；而所有 `docs/**` 又把不消费的调查/决策文档送进 package supporting tests 与 Test Evidence。

before `fb6944df3097cb47dc233b305a07466c829c82e5`；`d3830cecb0afa422771c08aba3fb15539cbdbe3f` 将 Gate 的 `origin/main` 改为 `HEAD~1`，同时收窄 package region 到登记材料与生成/构建输入，Test Evidence region 到当前 owner 所在文档范围。新增 registry/Case 变更触发轻量 closure test；closure test 遍历真实 `docs/package-documents.json` 和当前 Case Owner，断言全部命中。

可复核：

```bash
git show d3830cecb0afa422771c08aba3fb15539cbdbe3f -- scripts/project/gate/definition.ts scripts/project/gate/runtime/eligibility.ts scripts/project/gate/runtime/eligibility.test.ts
git show d3830cecb0afa422771c08aba3fb15539cbdbe3f:docs/investigations/review-local-head-gate-selection-and-document-inputs.md
```

实际证据：该调查在形成时 HEAD `db79ccd5f00e2e5f27dd1fd5b60bb74284d56ae7` 上观察远端累计 committed paths 为 42，最近提交为 5；这是当时本地 Git 状态，不是今天远端事实。当前 `eligibility.test.ts` 逐项证明调查/决策文档不选择 package/Test Evidence，全部登记 source/Case Owner 被覆盖。当前 Product Git tests 独立证明 committed/staged/unstaged/untracked、rename 双路径、deletion、嵌套 project root 和 unavailable fallback。

### 候选例子（局部 TypeScript）

```ts
// defineConfig 的局部配置；compareWith 由消费者自己的任务政策决定。
const changes = {
  source: { compareWith: "HEAD~1" },
  flags: {
    publishedDocs: { include: ["handbook/**", "publish-map.json", "tools/render-docs/**"], exclude: [] }
  }
};
// 若真实目标是整条 PR，改用可解析的显式 PR 基准，而非盲从本仓 HEAD~1。
```

验证重点：`HEAD~1...HEAD` 加工作区四类 delta，不是“只有未提交改动”；merge 第一父链；root commit/浅克隆缺父时保守回退；登记或 owner 新路径要触发 closure test。后续/局限：本仓按 owner **目录**保守选择，同目录非 owner 仍可能命中；不把登记集合写成静态永久常量。报告中的 21→20 项、15.547s→11.249s 等热态顺序样本未严格配对，不得外推为节省率。未建立一个独立“仅调查文档”真实 Git Gate fixture，也未重测。

## F5：从实际读取确定测试 lane 输入

### 问题场景与历史事实

七组 Product Check tests 已各有 lane，但旧 `product-tests` 都覆盖 `src/**`；只改一个私有 Check 仍选中全部七组。before `39b59cb3e5cdb7fdf0f607c83cac8e3fac2d40a5`；`50d4c48504db4104e8f3c67d9f78d34d7adb4910` 创建 `PROJECT_GATE_PRODUCT_TEST_REGIONS`，只排除已确认无关的私有 Check 目录，不变动完整 lane test 清单。

不是按目录名机械划分：file metrics 的 constructor tests 实际运行 JSON validation/document reader，因此保留这两项输入；function metrics 的 source-identity evidence 扫描全 `src/**`，继续宽选且纳入 provenance。root export、shared runtime/helpers、host-environment/project-files、未知新模块与测试工具链仍选择全部七组。

可复核：

```bash
git show 50d4c48504db4104e8f3c67d9f78d34d7adb4910 -- scripts/project/gate/runtime/product-test-regions.ts scripts/project/gate/runtime/eligibility.ts scripts/project/gate/runtime/eligibility.test.ts scripts/project/gate/definition.test.ts
```

实际证据：当前 `eligibility.test.ts` 对私有实现、test-only、已删除 fixture 路径逐项断言；对共享、未知、新近邻目录逐项断言全选；另遍历 lane resolver 返回的每个真实 test file 证明至少命中自己的 region。`definition.test.ts` golden 证明各 change flag 只直接选择对应 lane，`test`/`all` 不被 change flag 抑制；`AUX-PROJECT-GATE-SELECTION-001` 维护这一当前证明目的。

### 候选例子（局部 TypeScript）

```ts
// defineConfig.changes.flags 的局部配置，不是本仓目录白名单。
const flags = {
  parserTests: {
    include: ["app/**", "tools/test-runner/**", "pnpm-lock.yaml"],
    exclude: ["app/private-email-check/**"] // 仅在已证实 parser tests 不消费它之后排除。
  },
  sourceIdentityTests: { include: ["app/**", "source-map.json"], exclude: [] }
};
// 每组测试 Check: any(all("daily", changeFlag(<自己的 ID>)), "test", "force")。
```

验证重点：测试输入不限被测文件；自己 lane 的全文件集合闭合；共享/未知输入保守；显式全测；Case 不按 lane 数自动拆分。**教学建议：**使用一个跨 owner 测试和一个全源审计说明为何“原子化 = 同名私有目录”会漏选。局限：负排除只是一份可维护假设，未来私有目录新增共享调用需重审；闭合 test 清单不等于闭合所有动态输入。本次无配对性能实验，不能声称减少 runner 数就必然降低墙钟。

## F6：完整执行 Check，复用成功逐文件 findings

### 问题场景与历史事实

选择已收窄后，Markdown lint 对完整 corpus 重复调用 backend 仍有热态成本。before `d3830cecb0afa422771c08aba3fb15539cbdbe3f`；`5206ae782a425e0d575b0b1b6664bbf72fb6aa22` 新增默认关闭的 Product cache，Gate 显式开启可删除目录，**没有改 required/force 选择、完整 corpus 或 non-blocking policy**。

`lintMarkdownWithCache` 使用 `cacheJsonByKey`，身份包含 source path、当前内容 SHA-256、rules、实际 backend version 与内部缓存契约版本；只保存成功逐文件 findings。每次完整读取/验证 source，再实时结算数量上限、policy、Record 顺序、messages 与 outcome。损坏/不可用 cache 回退 fresh lint，不能当成空 findings。

后续 `c20540345e408fa2fb1c0573e47edb8d9973c8df` 加 precise waiver，补充 warm-cache 下 waiver 改变仍重新结算、raw finding limit 仍生效的测试；没有把 waiver 加到 facts key 或缓存最终通过结果。

可复核：

```bash
git show 5206ae782a425e0d575b0b1b6664bbf72fb6aa22 -- src/package-checks/markdown-lint/findings-cache.ts src/package-checks/markdown-lint/execution.ts scripts/project/gate/checks/repository-quality.ts
git show c20540345e408fa2fb1c0573e47edb8d9973c8df -- src/package-checks/markdown-lint/findings-cache.test.ts
```

实际证据：当前四项 findings-cache tests 观察 cold/warm 完整 result/Records 一致、内容/规则失效、实时 waiver/limits、损坏/不可写与取消。公开 owner 为 [Markdown lint](../../../checks/markdown-lint.md)的 findings 缓存章节；历史测量来自[缓存调查](../../measure-and-cache-markdown-lint-findings.md)。

历史计量边界：Linux/x64、mise-bound Bun 1.3.14、509 Markdown source、同进程同规则的 Check 层交错小样本为 cache 1263ms、off 2332ms、off 2217ms、cache 1261ms；另一个临时 cache 首次 2957ms、热态 1227ms。不是 p50/p95；OS/依赖缓存未清，也不是严格配对完整 Gate。后续失效 candidate 的 required 仍发生 29,216.9ms 和 34,785.7ms 超过当时 20 秒硬阈值的失败。**不能用单项热收益宣称完整冷 Gate 成功**；当时硬阈值也不是当前预算规则。

### 候选例子（局部 TypeScript）

```ts
import { resolve } from "node:path";
import { markdownLint } from "@zxyycom/vibe-check";

const documentationLint = markdownLint({
  files: { include: ["handbook/**/*.md"] },
  cache: { enabled: true, directory: resolve(".cache/example-markdown-findings") },
  findingPolicy: "non-blocking"
});
// 放入正常 Definition，每次仍运行完整 source traversal；directory 由调用方拥有与清理。
```

验证重点：当前 bytes 与 containment/limit/encoding 验证；实时 outcome/waiver/limit；缓存故障不放行；取消；明确目录写入授权与可信边界。局限：缓存无机密性、防篡改和自动容量治理；adapter 解释改变需要 bump 内部版本。**教学建议：**将这项作为“无需安全省略 Check 的另一类优化”，不能与 F2–F5 的 selection 混为一次收益。

## 选例与复核

F1 讲依赖选择，F2 讲复合条件与语法简化，F3 讲材料和反向依赖，F4 讲比较基准与登记闭合，F5 讲测试真实输入，F6 讲计算复用。按用户问题选取即可；组合时分别保留各自的验证边界。

消费者可将自己的任务入口映射为普通 flags。Gate 的 required/preset adapter、`project-gate:*` tokens、目录 region 和性能预算都是项目接线，Product 不提供 CLI。

历史修正中值得保留的对照是：简化 AST、按任务选比较基准、按真实读取划分输入、缓存事实而非最终 verdict。版本定位与正文断言已核对；集合和材料验证统一记录在主报告。
