---
title: "Node 26 package host 切换准备度评估"
formedAt: "2026-09-06T13:15:49+00:00"
question: "在公开 Product 已由 Node 24.18 consumer baseline 验收、仓库工具仍由 Bun 承载的前提下，Vibe Check 切换或新增 Node 26 package host 验收需要哪些证据、边界与迁移步骤？"
tags:
  - "node"
  - "package-host"
  - "runtime-compatibility"
relations: []
---

## 形成时背景

- 本报告形成时，公开 package 的 Product host 与仓库的 build/test/Gate tooling 已明确分离：Product candidate 从 src/index.ts 和一个内部 function-metrics Worker root 生成 dist/esm 下的 mjs modules，而 repository scripts 仍由 Bun 启动。这个报告不授权把后者迁移到 Node。
- 工作区的 package-candidate contract 正在从带有未验证最高边界的 Node 24.18 range 调整为最低版本 >=24.18；这次调查不修改该 contract、Product、scripts、Decision 或 Change。它只评估用户拟将 consumer 验收基线切到 Node 26 时的准备度。
- Node 官方下载页在本报告调查时点列出 v26.8.1 为 Current；本机可用的 mise Node 是 v26.7.0。官方 Release Working Group schedule 预计 v26 在 2026-10-28 转为 LTS，故本报告时点的 Node 26 仍是 Current，而非 LTS。

## 调查目的

本轮回答以下问题：

1. 当前 package 的 ESM、node:worker_threads、TypeScript example execution 与 production dependency/runtime acceptance 是否存在已知 Node 26 阻断？
2. 现有 Node 24.18 exact-candidate evidence 能证明什么，切换到 Node 26 还缺什么？
3. 在不把 Bun-owned repository tooling 错当成 consumer prerequisite 的前提下，下一次迁移应按何种顺序验收？

范围限于公开 npm package 的 Node host。它不评估 browser、CommonJS、Bun Product host、所有 OS/CPU、所有 Node 26 patch、发布 registry、或将 repository tooling 迁至 Node。

## 调查范围与依据

### 仓库形成时证据

- docs/development/architecture.md 规定 src/index.ts 是唯一 public entry；docs/tooling/package-lifecycle.md 规定 candidate 逐模块交付 mjs，并把内部 Worker URL 精确改写为 shipped analyzer-worker.mjs。候选包只公开 root export，物理 dist、types 与 src 不是 consumer subpath。
- src/package-checks/function-metrics/analyzer-worker-port.ts 通过 new Worker(new URL(..., import.meta.url)) 使用 node:worker_threads；Worker root 使用 parentPort。scripts/package/candidate/external-consumer/runtime-evidence/run.ts 会在隔离安装中核对 parent-to-Worker URL、实际启动依赖的 jscpd，并运行 representative Product fixture。
- scripts/package/candidate/external-consumer/documentation.ts 用真实 Node 子进程 import runtime documentation examples 和 package-shipped machine Definition。README 的最小示例也声明 node quality.ts，因此 Node 的 TypeScript execution 对文档承诺实际相关；已发布 Product entry 本身是 mjs，不依赖 Node 直接执行 package 的 ts 源码。
- 实际执行（Linux，mise Node v26.7.0，Bun v1.3.14 仅作 test launcher）：
  - VIBE_CHECK_NODE_CMD=/home/dev/.local/share/mise/installs/node/26.7.0/bin/node bun test scripts/package/candidate/external-consumer/runtime.test.ts：通过。该测试在隔离安装的 candidate 下以 Node v26.7.0 执行 root import、representative Run、function-metrics Worker、runtime dependency resolution/execution 与 machine output assertions。
  - VIBE_CHECK_NODE_CMD=/home/dev/.local/share/mise/installs/node/26.7.0/bin/node bun test scripts/package/candidate/external-consumer/documentation.test.ts：通过。它以 Node v26.7.0 实际 import 受管 runtime ts documentation examples 和 machine Definition。
- 同一 runtime test 的首次探测发生在并行 engine-contract 改动尚未完成时，且只被旧的 major 必须为 24 的验收断言拒绝；重新以当前 >=24.18 断言执行后通过。这个先后关系证明旧验收门禁会阻止 Node 26 证据，不是 Node 26 Product execution 失败的证据。

### Node 官方依据（2026-09-06 获取）

- [Node.js Download Current](https://nodejs.org/en/download/current) 将 v26.8.1 标为 Current，且列出 v24.20.0 为 LTS；[Node.js Release Working Group schedule](https://github.com/nodejs/Release/blob/main/schedule.json) 给出 v26 的 start、LTS transition 和 EOL 计划。日期属于 release plan，可能被官方更新。
- [Node 26 ESM documentation](https://nodejs.org/api/esm.html) 将 ESM 标为 Stable，说明 type module、mjs、node builtin imports 与 package resolution 的语义。这直接对应 candidate 的 mjs entry 和 node imports，但不代替实际 candidate test。
- [Node 26 Worker Threads documentation](https://nodejs.org/api/worker_threads.html) 将 node:worker_threads 标为 Stable。这支持 API 可用性；shipped URL、message protocol、Worker 文件是否随包存在仍只能由本仓 installed-candidate acceptance 证明。
- [Node TypeScript documentation](https://nodejs.org/api/typescript.html) 说明 Node 的 type stripping、其不读取 tsconfig.json 的边界，以及不会把模块系统互相转换。它适用于 README/documentation 的 node ts 路径；不应由此推断任意 TypeScript feature、任意 project tsconfig 或本仓 Product mjs runtime 都已被覆盖。

## 调查结果与边界

### 已确认事实

1. **Node 26 已发布且在本报告时点是 Current。**官方资料把 v26.8.1 标为 Current；计划的 LTS transition 在未来的 2026-10-28。它不是尚不可用的未来版本，但也尚非 LTS。
2. **当前 Product delivery shape 与 Node 26 的核心宿主 API 对齐。**它是 ESM-only root package，使用 standard node imports，并把 function-metrics 的私有并发实现落在 node:worker_threads。没有发现依赖 Bun global 的 Product runtime path。
3. **有一条真实 Node 26.7.0 installed-candidate runtime evidence。**上述 runtime test 成功完成，覆盖 root import、shipped Worker、Worker-backed function metrics、jscpd 的 installed dependency resolution/execution、representative Check Run 和 machine output。它比 Bun build 成功更强，但不构成全 Node 26 兼容矩阵。
4. **Node TypeScript execution 对当前 consumer material 相关且已有一次 Node 26.7.0 evidence。**README 宣传 node quality.ts，documentation acceptance 也实际 import package-shipped ts examples；该 acceptance 在 v26.7.0 通过。Product package runtime 本身仍是 emitted mjs，不要把这个事实混同为 Node 直接执行整个 Product source。
5. **Bun 仍是 repository tooling host，不是 package consumer runtime prerequisite。**build、test、candidate preparation 和 Gate 由 Bun 驱动；Node child 才执行 installed package evidence。切换 Node consumer baseline 不要求顺带迁移这些 scripts。

### 推断

- 以现有 ESM/Worker shape、两项 v26.7.0 installed-candidate pass 和官方 stable APIs 为依据，**Node 26 是可继续推进的低风险 consumer target**；目前没有出现必须先修改 Product runtime 的阻断证据。
- 该推断的强度仅适用于此次 Linux、Node v26.7.0、当前 lockfile 和当前 candidate。它不证明 v26.8.1、后续 26.x、Windows/macOS、不同 CPU 架构、registry install 或所有 consumer TypeScript configuration。
- 因为 Node 26 在报告形成时仍为 Current，若切换意指把正式生产支持基线完全移到 Node 26，而非先新增验证 lane，发布稳定性风险高于保留 Node 24.18 最低 contract 并新增 Node 26 exact acceptance。这是 release-policy 推断，不是当前实现不兼容结论。

### 建议：迁移步骤与验收矩阵

1. **先明确切换含义并建立对应 Change/Decision。**在下列两种策略中择一，不要让 engines range 代替这个决定：
   - 新增 Node 26 exact-candidate lane，同时保留 Node 24.18 baseline；或
   - 在有明确 breaking-change/release policy 时，将最低支持版本提高到 Node 26，并明确是否等待 v26 LTS。
2. **固定一次目标 Node 26 patch 后重跑 exact candidate。**本机证据是 v26.7.0，而官方 Current 页面列出 v26.8.1；在声称当前 Node 26 线已验收前，应安装或选择目标 patch 并保存其实际 process.version，不以 range 或下载页替代运行记录。
3. **沿用现有 Bun-owned build/Gate，只改变 consumer child 的 Node binding。**不得为了消费者的 Node 26 迁移而改写 Product architecture 或把 repository scripts 迁到 Node；若后来要迁工具，应作为独立调查和 Change。
4. **把 runtime/docs/types 分层记录。**Node runtime acceptance、Node direct-TS documentation acceptance 与 tsgo declaration acceptance 分别回答不同问题，全部通过才可称 candidate consumer surface 在目标 host 完整验收。

| 验收面 | 最小证据 | 当前状态 | Node 26 切换前的动作 |
| --- | --- | --- | --- |
| 目标版本与 release policy | 固定 Node executable、记录 process.version，并明确 Current/LTS 策略 | v26.7.0 已实跑；官方 Current 是 v26.8.1 | 选择目标 patch；若要求 LTS，等 2026-10-28 后重新核对官方状态 |
| emitted ESM/root export | exact packed/install candidate 的 Node root import | v26.7.0 runtime test 通过 | 在目标 patch 重跑 |
| Worker | shipped mjs URL、node:worker_threads 启动和 function-metrics result | v26.7.0 runtime test 通过 | 在目标 patch 重跑；平台扩展另建 matrix |
| production dependencies | isolated installation 内解析和实际执行 declared dependency | v26.7.0 runtime test 覆盖 jscpd | 保持 locked candidate，目标 patch 重跑；npm registry install 不在本证据内 |
| TypeScript documentation | Node 直接 import documented runtime ts examples | v26.7.0 documentation test 通过 | 在目标 patch 重跑；新增非-erasable TS syntax 时专门复查 |
| declarations | installed declarations、examples 与 tsgo type acceptance | 本轮未以 Node 26 运行；该 lane 是 Bun-owned tooling/type evidence | 保留现有 type acceptance，勿把其通过称为 Node runtime proof |
| repository tooling | Bun scripts、test runner、Gate | 本轮不迁移 | 保持 Bun；除非另有授权，不列为 Node 26 切换门槛 |

### 未知与重新调查条件

- 未验证 v26.8.1 或任何后续 Node 26 patch；也未验证 Windows、macOS、ARM、npm registry installation、fresh npm/pnpm resolution 或第三方 dependency 的完整 OS matrix。
- 未确认用户希望 Node 26 表示新增 tested lane、正式默认 release lane，还是删除 Node 24 support；这会实质改变 engine range、release compatibility 和 required matrix，必须由后续 Decision/Change 明确。
- Node type stripping 不支持所有 TypeScript syntax，也不服从项目 tsconfig。若 README/examples 开始依赖 enum、parameter properties、path aliases、module conversion 或其它 transform-needed syntax，必须以目标 Node 重新执行文档验收并按官方限制复查。
- 任何 Node 26-specific failure、Node release status change、runtime dependency upgrade、Worker URL/build-layout change，或仅 Node 26 政策的确定，都是形成新调查或复查本报告的条件。
