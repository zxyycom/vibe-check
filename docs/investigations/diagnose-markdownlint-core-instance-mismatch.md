---
title: "定位 markdownlint 0.42 升级后的 reference 漏报"
id: "261021-diagnose-markdownlint-core-instance-mismatch"
formedAt: "2026-10-21T07:40:54Z"
question: "原规则与输入不变时，MD052 为何在升级后漏报，修复应落在 Product adapter 还是依赖图？"
tags:
  - "dependency-upgrade"
  - "markdown-lint"
  - "micromark"
  - "module-identity"
relations: []
---

## 形成时背景

本轮获准将 markdownlint 从 0.41.1 升至 0.42.0。安装前已冻结九项公开规则的固定语料，
旧版在项目 pin Bun 1.3.14 下通过既有目标测试。首轮新版有三项 MD052 测试失败：
完整、collapsed 与图片 reference 的 Finding 消失；`catalog` 固定语料的 Finding 从 9 条变成 8 条。
Product adapter、规则选择和输入未改变，这不是可以直接接受的上游计量变化。

## 调查目的

区分规则变更、parser 初始化、Bun 兼容和依赖实例错配；在保留原规则、断言和 parser owner 的条件下，恢复公开 `reference-links-images` 语义。

## 调查范围与依据

- 基线为 `main` 的 `a36600da4aa2e4d3f4dcebb87722e56d1200ee9d` 加本轮依赖升级工作树。
  观察于 2026-10-21 UTC，Linux x64；项目 pin 为 Bun 1.3.14、Node 24.18.0。
- 固定语料经真实 Product adapter 执行；既有
  [adapter 回归](../../src/package-checks/markdown-lint/adapter.test.ts)与同 owner Check tests 保留原规则期望。
- 用 `createRequire(...).resolve(...)` 分别从 markdownlint 与其 micromark 的实际路径解析 core，
  不仅比较 package.json 的版本范围。初始 lock 中 markdownlint 0.42.0 直接 core 为 2.0.4，
  micromark 4.0.3 的 core 为 2.0.3，解析到两个不同模块文件。
- Node 24 直接调用 `markdownlint/promise`，绕开 Product adapter，仍返回空 Findings：

  ```js
  import { lint } from "markdownlint/promise";
  await lint({
    config: { default: false, MD001: true, MD052: true },
    strings: { "x.md": "[full][missing-full]\n[collapsed][]\n![image][missing-image]\n" }
  });
  ```

  pin Bun 与 ambient Bun 1.4.2 也复现。它们用于排除 Bun 独有行为，不能把 ambient 运行替代项目 pin 验收。
- 本地依赖 `markdownlint/lib/micromark-parse.mjs` 明确要求与 micromark 使用同一 core 实例，
  并临时修改所导入 `labelEnd.tokenize`，产生供 MD052 使用的 undefined-reference tokens。

## 调查结果与边界

### 根因是 shim 与实际 parser 不共享 core

新版 shim 修改了 core 2.0.4，但 micromark 实际解析经过 core 2.0.3，修改未生效。
因此 parser 正常运行且其它规则仍工作，缺失 reference 却不产生 MD052 tokens。
已有 MD001 warm-up 已进入 parser；再添加 warm-up 规则不能使两个不同实例变成同一个。
Node 直接调用也漏报，排除了 Product Finding 映射或 Bun-only 初始化作为主要原因。

最小责任入口是安装图：通过 pnpm 的 `micromark@4.0.3>micromark-core-commonmark: 2.0.4`
精确约束，使 markdownlint 与其 micromark 共用 core，同时保留 mdast 使用的其它 micromark 版本。
物理安装对齐后，Node 24 直接控制恢复恰三条 reference Finding，range 分别为 `[1,20]`、`[1,13]`、`[1,23]`；
两条解析路径实际同为 core 2.0.4。修复前后输入和配置保持不变，这比仅写入 lockfile 更直接支持根因判断。

### Product 资格检查覆盖消费者保留旧锁图的情形

旧 0.41.1 → 新 0.42.0 的缓存对照只负责证明 backend 版本变化导致 miss，不能保证同一 backend
版本下任意 transitive drift 都会失效。

workspace override 只修复本仓库安装图。隔离 installed Node consumer 用公开 Check 的未定义 reference
验证 fresh graph；对于保留旧 transitive lock 的升级图，本轮另外实施 Product 私有能力 guard：
仅选择 `reference-links-images` 时，通过同一公开 strings API 验证固定的 full/collapsed/image 引用样例，
每进程共享一次 Promise；失败沿用 `backend-failed`，不发布用户/合成 Findings 或 final data。
direct lint 与 cache lookup 前均须通过，非 reference 规则不运行该 probe；修复已加载的依赖组合后需重启进程。
findings cache 契约随这项资格解释变化提升至 v2，使此前不兼容依赖图可能生成的旧 facts 失效。

### 行为回归与实际安装分别提供证据

隔离子进程将公开 backend API 的响应替换为已观察的空数组协议，父进程先用真实 backend 写入可信 warm cache；
回归分别验证 direct、cold、warm 均拒绝，失败不读写缓存、不发布合成 Record，非 reference 继续工作，
并发仅触发一次 probe。它复现错误图的 API 后果，不声称在测试内重新安装了双 core 图；
实际双实例与 Node 直接调用的前述证据独立支撑因果判断。

独立审查又用 Node 24 内存 resolve loader，仅把 micromark 4.0.3 的 core 导入重定向到现存 2.0.3，
保持 markdownlint 自己仍读 2.0.4；不写磁盘或重新安装。实际旧图下 raw 三类引用仍为零，
Product direct 与 cache-disabled 均返回 `backend-failed`，随后普通 MD018 仍产出一条 Finding。
这补足了仅 mock API 的局限；loader 的私有路径只用于故障构造，未进入 Product guard 或稳定测试契约。
相关 Markdown/duplicate/file-metrics owner tests 在项目 pin 下 58/58 通过，独立 adapter/cache 8/8 通过。

同轮最终 `bun run check -- --all` 在稳定源码上通过 43/43，最终候选为
`0.0.0-local.2b1720941546`，SHA-256
`4e5e0aa1f430d7b8bd1aed5efc5e510ff8f5d5cc879e90a920803e0906243d6a`。
installed public types/documentation/Node runtime 均通过，runtime 包含不继承 repository override 的真实 MD052 正向断言。
它与上述真实混合图的负向验证分别覆盖 fresh/旧锁两类路径；单规则和组合规则回归继续提供稳定证明。

### 适用边界

已解释的是 0.42.0 首次升级所保留的特定 lock 图，不是所有包管理器、版本或 MD052 漏报的共同根因。
升级 markdownlint/micromark、修改 override 或改用另一安装策略时，重新检查实际 core identity 和 reference 行为；
版本号相同不应代替实例一致性的证据。最终 Gate 证明本轮候选，未执行正式发布，不推断 registry 状态。
