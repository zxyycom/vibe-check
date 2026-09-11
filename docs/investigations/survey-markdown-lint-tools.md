---
title: "Markdown lint 工具、效果与生态调查"
id: "260911-survey-markdown-lint-tools"
formedAt: "2026-09-11T04:01:54Z"
question: "Markdown lint 工具有哪些主要类型和代表实现，它们怎样使用、实际能检查什么，当前热度与生态成熟度如何；Markdown 是弱标记语言时 lint 的价值边界在哪里？"
tags:
  - "documentation"
  - "markdown-lint"
  - "tooling-ecosystem"
relations: []
---

## 形成时背景

Markdown 对多数文本都能产生解析结果，因此“能否解析”很少形成有区分度的质量判断。本报告关注 lint 的另一层价值：用规则识别结构风险、跨渲染器兼容问题、写作约定和部分内容缺陷。

候选工具的核心接入条件是 **TypeScript 可调用**：可以直接 `import` JavaScript/TypeScript API，也可以由 `Bun.spawn` 或 `node:child_process` 启动 CLI。编辑器插件、GitHub Action 和 LSP 作为作者反馈与 CI 接入面一并评估。本报告独立于 `260825-markdown-link-validation-library-strategy`；既有报告研究 Vibe Check 离线链接检查的实现库，本报告研究通用 Markdown lint 生态与选型条件。

## 调查目的

本报告支持一项后续判断：哪些 Markdown 工具值得进入 TypeScript 集成候选集，以及应通过程序内 API、结构化 CLI 还是插件接入。具体检查：

1. 工具数量与类别，以及共享同一引擎的包装关系。
2. TypeScript 调用方式、机器输出、退出码和插件生态。
3. 同一样本上的实际诊断与自动修复差异。
4. 当前热度、维护活跃度、采用成本和能力边界。

报告保存调查认识；产品接入、依赖选择和 Gate 变更仍需由相应产品与 Change owner 承接。

## 调查范围与依据

### 计数与接入口径

| 概念 | 本报告定义 | 计数 |
| --- | --- | ---: |
| 核心引擎 | 解析 Markdown，并按多个结构或风格规则产生定位诊断的独立实现或规则平台 | 至少 11 个 |
| 可编排工具家族 | 核心引擎，加上 prose、链接和 formatter 工具；均有程序内 API 或 CLI | 至少 17 个 |
| 接入面 | 同一工具的 CLI、编辑器插件、Action、LSP、pre-commit、Docker 等包装 | 列出但不合计 |

TypeScript 接入强度按以下顺序判断：

1. **程序内 API**：直接返回结构化对象。
2. **结构化 CLI**：提供 JSON、JSONL 或 SARIF，并区分诊断结果与工具失败。
3. **文本 CLI**：可依赖退出码，但解析人读输出存在兼容风险。
4. **插件表面**：支持作者反馈或 CI；其底层 API/CLI 才是产品执行入口。

本轮没有穷举 GitHub topic、商业服务、编辑器私有插件和停止维护的 fork，因此数量是有边界的发现结果，不是全生态总数。

### 证据来源与实跑方法

证据取得于 **2026-09-11 03:48–04:29 UTC**：

- 功能与接口以各工具的上游仓库和官方文档为准，包括 [`markdownlint`](https://github.com/DavidAnson/markdownlint)、[`markdownlint-cli2`](https://github.com/DavidAnson/markdownlint-cli2)、[`remark-lint`](https://github.com/remarkjs/remark-lint)、[`@eslint/markdown`](https://github.com/eslint/markdown)、[`rumdl`](https://github.com/rvben/rumdl)、[`PyMarkdown`](https://github.com/jackdewinter/pymarkdown)、Ruby [`mdl`](https://github.com/markdownlint/markdownlint) 和 [`lint-md`](https://github.com/lint-md/lint-md)。
- GitHub stars 与 push 时间来自 GitHub REST API。npm 周下载量使用 **2026-09-03 至 2026-09-09** 固定窗口，例如 [`markdownlint`](https://api.npmjs.org/downloads/point/2026-09-03:2026-09-09/markdownlint) 和 [`markdownlint-cli2`](https://api.npmjs.org/downloads/point/2026-09-03:2026-09-09/markdownlint-cli2)。版本与发布时间来自 npm、PyPI、RubyGems 和 crates.io。
- VS Code 安装数来自 Visual Studio Marketplace public Gallery API。stars、周下载、累计安装和不同注册表的 recent/lifetime downloads 口径不同，只用于量级判断。
- 临时目录中的 13 行样本包含标题跳级、缺少空行、列表 marker 不一致、145 字符长行、连续空行、拼写错误、坏相对链接和无语言代码围栏。实跑版本为 `markdownlint` 0.41.1、`markdownlint-cli2` 0.23.2、`rumdl` 0.2.71、`pymarkdownlnt` 0.9.39、`remark-cli` 12.0.1、`textlint` 15.8.0、`markdown-link-check` 3.15.0 和 `mdformat` 1.0.0。
- TypeScript spike 分别直接调用 `markdownlint/promise`，以及通过 `Bun.spawn` 调用 `rumdl check --output-format json`。
- 采用成本样本使用 `npx markdownlint-cli@0.49.1 --json` 扫描本仓库 `git ls-files '*.md'` 返回的 507 个文件；该集合包含维护 skill、历史 Decision 和 investigation resources。

所有实跑只写临时目录，没有修改仓库依赖、lockfile 或被检查的 Markdown 文件。

## 调查结果与边界

### 选型结论

| 使用条件 | 优先候选 | 依据与确认项 |
| --- | --- | --- |
| TypeScript 产品需要最直接、可类型化的结构规则 API | `markdownlint` 程序内 API | 规则与生态最成熟；接入前确认目标方言、文件授权和 finding 映射 |
| 项目已统一使用 ESLint | `@eslint/markdown` | 复用 ESLint 配置、formatter、缓存和编辑器链路；当前规则面小于 `markdownlint` |
| 项目已使用 unified/remark AST | `remark-lint` | 适合组合现有 AST 插件和自定义规则；需显式设置 warning 的失败策略 |
| 需要原生二进制、结构化 CLI 或现代 Markdown 方言 | `rumdl` | JSON/JSONL/SARIF、LSP、Action 和多方言支持完整；上游仍标为 beta，替换前验证规则兼容 |
| 重点是中文排版 | `lint-md` | 提供 `@lint-md/core`、CLI、Prettier、ESLint 和 VS Code 封装 |
| 重点是措辞或链接 | `Vale`/`textlint`，或 `lychee`/`markdown-link-check` | 作为独立能力与结构 lint 组合 |

通用 TypeScript 集成的首选基线是 **`markdownlint` 程序内 API**。CLI2 更适合项目脚本、CI 和编辑器共享配置；只有进程隔离、原生性能、跨语言部署或现有 CLI 资产能带来明确收益时，再把 subprocess 作为产品入口。

### 工具地图

| 类别 | 本轮识别的工具 | TypeScript 接入 |
| --- | --- | --- |
| 主流结构 lint | JS `markdownlint`、`remark-lint`、`@eslint/markdown` | 三者均有程序内 Node/JS 路径 |
| 语言或社区取向 | Ruby `mdl`、`PyMarkdown`、`lint-md` | `lint-md` 有直接 API；其余可启动 CLI |
| 原生新实现 | `rumdl`、`Mado`、`mdlint`/`markdownlint-rs`、`mdsmith`、`gomarklint` | 均可启动 CLI；`rumdl`、`mdlint`、`gomarklint` 已确认结构化输出 |
| prose lint | `Vale`、`textlint` | `textlint` 有直接 API；两者均有结构化 CLI |
| 链接检查 | `lychee`、`markdown-link-check` | `markdown-link-check` 有 callback API；`lychee` 有 JSON CLI |
| formatter | `mdformat`、Prettier | Prettier 有异步 API；`mdformat` 可启动 CLI |

前三个类别共有 11 个核心引擎；加上 2 个 prose、2 个链接和 2 个 formatter，构成本轮 17 个可编排工具家族。`markdownlint-cli`、`markdownlint-cli2`、`vscode-markdownlint` 和 `markdownlint-cli2-action` 共用 JS `markdownlint` 规则生态，属于不同接入面而不是独立引擎。

### TypeScript 接入方式

已确认具有直接 Node/JS API 的 7 个家族是 `markdownlint`、remark、`@eslint/markdown`（经 ESLint Node API）、`@lint-md/core`、textlint、`markdown-link-check` 和 Prettier。`markdownlint` 的最小调用形状为：

```ts
import { lint } from "markdownlint/promise";

const result = await lint({
  strings: { "doc.md": source },
  config: { default: true },
});
const findings = result["doc.md"];
```

结构化 CLI 应使用参数数组、固定工作目录和独立输出通道：

```ts
const child = Bun.spawn(
  ["rumdl", "check", "--output-format", "json", "doc.md"],
  { cwd, stdout: "pipe", stderr: "pipe" },
);
const stdout = await new Response(child.stdout).text();
const stderr = await new Response(child.stderr).text();
const exitCode = await child.exited;
const findings = JSON.parse(stdout);
```

TypeScript spike 中，直接 `markdownlint` API 返回 10 条 finding；`rumdl` CLI 返回 9 条 JSON finding、空 stderr 和 exit code 1。对 `rumdl`，1 表示存在诊断。CLI2 则定义 0 为无 error、1 为有 lint error、2 为工具失败。`markdownlint-cli --json` 的 JSON 实际写入 stderr。TypeScript adapter 必须按目标工具分别声明数据通道和退出码映射。

已确认的结构化 CLI 包括：

- `markdownlint-cli`；`markdownlint-cli2` 加 JSON/JUnit/SARIF formatter。
- `rumdl`、`mdlint`、`gomarklint`、`Vale`、`lychee`、`textlint` 和 ESLint。
- Ruby `mdl`、`PyMarkdown`、`Mado`、`mdformat` 以及 `mdsmith check` 的稳定机器 schema 尚未在本轮确认；它们仍可按退出码启动，正式接入前需要 stdout、stderr、路径、编码和版本兼容 spike。

### 实际诊断与修复

| 工具 | 样本结果 | 对接含义 |
| --- | --- | --- |
| `markdownlint-cli2` | 10 条结构/格式诊断；`--fix` 修复 7 处，保留标题级别、长行和代码语言 | 自动修复较保守；不检查拼写或坏相对链接 |
| `rumdl` | 9 条，包含坏相对链接；6 ms；`--fix` 修复 7/9 | 会把 H3 改为 H2，并把无语言围栏改为 `text`；修复 diff 需要内容审查 |
| `PyMarkdown` | 10 条，与 `markdownlint` 的主要 `MDxxx` 结果接近 | 规则兼容可提供相近诊断；本轮未测其修复与性能 |
| `remark-lint` presets | 主样本无 warning；风格样本报告 1 条 emphasis marker 不一致 | preset 规则面不同；CI 需用 `--frail` 将 warning 映射为失败 |
| `textlint` | 捕获 `teh`，1 条可修复诊断 | prose lint 与结构 lint 互补 |
| `markdown-link-check` | 捕获 `./missing.md` | 链接可达性是独立能力 |
| `mdformat --check` | 报告文件需要格式化 | formatter 负责 canonical form，不提供完整诊断覆盖 |

自动修复策略是工具契约的一部分：空白和 marker 修复通常风险较低；标题级别、链接和代码语言可能改变内容含义，应单独审查。

### 热度与生态

| 工具或生态 | 形成时信号 | 判断 |
| --- | --- | --- |
| `markdownlint` 生态 | engine 6,335 stars、1,723,091 npm 周下载；CLI2 903,403/周；CLI 633,544/周 | 规则、CLI 和集成生态最成熟 |
| [`vscode-markdownlint`](https://marketplace.visualstudio.com/items?itemName=DavidAnson.vscode-markdownlint) | 12,135,138 次累计安装，4.52/5（85 ratings） | 编辑器反馈和 quick fix 覆盖广 |
| `@eslint/markdown` | 581 stars、487,910 npm 周下载；2026-09-09 有 push | ESLint 工具链中的强集成候选 |
| `remark-lint` | 1,042 stars、188,042 npm 周下载 | unified 生态成熟，更新节奏较低 |
| `rumdl` | 1,493 stars；crate 107,297 累计、21,816 recent downloads；0.2.71 于 2026-09-10 发布 | 原生实现中增长与功能面最突出，稳定性仍按 beta 评估 |
| Ruby `mdl` / `PyMarkdown` / `lint-md` | 2,077 / 141 / 957 stars；`mdl` 7,169,102 gem lifetime downloads | 分别服务 Ruby、Python 和中文写作场景 |
| `Mado` / `mdlint` / `mdsmith` / `gomarklint` | 405 / 11 / 12 / 19 stars | 都在近期活跃；采用量支持观察和 spike，尚不足以替代兼容验证 |
| prose 与链接工具 | Vale 6,096 stars；textlint 3,180 stars、105,542/周；lychee 3,902 stars | 相邻能力已有独立成熟生态 |

分发指标的统计窗口不同，不能合成为统一排名。当前证据支持的整体判断是：`markdownlint` 拥有最完整的端到端生态；ESLint/remark 借助既有宿主生态；`rumdl` 是主要原生 CLI 候选；其余工具按语言、中文写作或扩展能力分化。

### 采用效果与能力边界

未配置的 `markdownlint` 扫描本仓库 507 个 tracked Markdown 文件，产生 14,573 条 finding，影响 498 个文件，其中 4,026 条带 fix 信息：

| 规则 | 数量 | 主要性质 |
| --- | ---: | --- |
| MD013 行长 | 9,714 | 排版偏好 |
| MD032 列表空行 | 2,159 | 格式一致性 |
| MD022 标题空行 | 1,488 | 格式一致性 |
| MD024 重复标题 | 734 | 需结合 section 语境判断 |
| MD060 表格列样式 | 384 | 源文件格式偏好 |
| 其余规则 | 94 | 表格列数、reference、HTML、代码语言等候选问题 |

前五项占 99.4%，说明默认规则集主要衡量既定排版风格。采用时应把目标规则和目标语料写进配置，并排除 generated、vendored、archive 和保真调查资源；该扫描结果只用于估算迁移噪声，不评价 498 个文件的文档质量。

各类工具的证明范围如下：

| 目标 | 对应工具 | 通过结果能够说明 |
| --- | --- | --- |
| Markdown 结构与风格 | `markdownlint`、`remark-lint`、`@eslint/markdown`、`rumdl` 等 | 输入满足已启用规则 |
| 术语与措辞 | `Vale`、`textlint` | prose 满足所选语言规则 |
| 链接 | `lychee`、`markdown-link-check` | 所选本地或网络目标在本次条件下通过 |
| Canonical 格式 | Prettier、`mdformat` | 格式化结果与配置一致 |
| 最终站点和代码示例 | site build、示例测试、目标语言工具 | 渲染与示例满足各自执行契约 |

一项 lint 通过只覆盖它实际启用的规则。事实准确性、最终渲染和未纳入的链接或代码示例由相邻验证负责。

### 建议的采用路径

1. 先确定实际渲染方言和语料边界。
2. TypeScript 产品优先 spike `markdownlint` 程序内 API；需要进程隔离或原生 CLI 时，并排 spike `rumdl` JSON。
3. 第一阶段只启用标题递增、代码围栏语言、图片替代文本、reference/link fragment 和表格列数等高信号规则。
4. 行长、空行、marker 和表格源格式放入后续风格层，或交给 formatter。
5. editor、local command 和 CI 读取同一份项目配置；CI 先记录诊断，再依据真实误报率决定 gate。
6. 自动修复按“纯格式”和“可能改变内容含义”分组审查。

### 证据边界与复查条件

本轮实跑覆盖 7 个代表性命令，以及 `markdownlint` 程序内 API 和 `rumdl` JSON CLI 两条 TypeScript spike；没有完成 11 个核心引擎的同版本规则矩阵或独立性能 benchmark。上游的速度、兼容和 adopter 声明仍是候选线索。

当 Vibe Check 准备建立产品 Check、目标方言或性能预算确定、需要迁移现有 `markdownlint` 配置，或 pre-1.0 工具的稳定性状态变化时，应使用真实项目 corpus 重新测量诊断准确率、误报、修复 diff、冷/热耗时、取消与超时，以及 CI/编辑器一致性。
