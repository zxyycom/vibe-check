# Proposal

本 Change 让 package-provided Checks 的无参默认值成为适合普通 consumer 起步的质量观察基线，同时让本仓库 Project Gate 显式拥有更严格的项目政策。

## Why

本 Change 形成时，四项质量 Check 默认把 Finding 结算为 blocking，且 duplicate、file 与 function metrics 的无参阈值直接等同或接近本仓库 Gate。普通 consumer 仅采用默认 Check 就会立即承担项目内部的严格阈值，却看不出这是可调整 policy。与此同时，六项 file-selecting constructor 共用的默认文件选择没有从 package root 导出；consumer 若要保留常见排除项并增加项目规则，只能复制整份数组。默认 `filesystem` 又不解释 `.gitignore`，现有排除项会让 `.log`、coverage 与临时目录进入扫描候选。

## Outcome

Package root 公开一个冻结的 `defaultProjectFileSelection`，包含常见 dependency、build、cache、coverage、log、temporary、generated 与 virtual-environment 排除项。consumer 可通过普通对象和数组 composition 保留该基线并微调 `include`、`exclude` 或 `source`。

四项质量 Check 的 Finding 默认改为 non-blocking；duplicate、file 与 function metrics 使用比本仓库 Gate 略宽的固定阈值。Project Gate 不继承这些 package defaults，而是在项目脚本中显式保留当前严格阈值、repository-specific 文件范围和 non-blocking Finding policy。

## Scope

### Intended Change

- 从 package root 导出只读、深冻结的 `defaultProjectFileSelection`，并让全部 file-selecting constructor 从同一 owner 物化默认 files branch。
- 为常见本地生成目录补齐默认排除；保留 `filesystem` 与 `include: ["**/*"]`，不引入 `.gitignore` 猜测或自动合并语义。
- 将 duplicate、file、function 与 Markdown Link Finding 的 package 默认改为 non-blocking，并把三项数值型质量阈值放宽一档。
- 在 Project Gate 中显式声明当前 repository 文件范围、duplicate 阈值、file code-line policy、function limits 与 non-blocking Finding policy。
- 同步 public inventory、declarations、随包文档、installed consumer、目标测试与语义 Case。

### Resulting Impacts

- 省略 `findingPolicy` 时，可信质量 Finding 仍完整生成 Records/final data 和 warning，但 Check 结算为 `passed`；source、scanner、parse、I/O 或其它 unavailable 不受影响。
- 需要 Finding 直接使 Check failed 的 consumer 必须显式选择 `findingPolicy: "blocking"`，区域级 override 规则不变。
- 显式提供 `files.include` 或 `files.exclude` 仍完整替换对应默认数组；只有显式使用 `defaultProjectFileSelection` 进行 TypeScript composition 才保留默认项。
- 本仓库 Gate 的结果和严格阈值不因 package defaults 改变；Gate 配置会直接证明这一点。

不纳入范围：公开 strict/recommended/Gate preset、动态按比例派生阈值、项目专属 `archive`/`fixtures` 排除项、改变 JSON/JSON Schema 的领域失败、改变 Run aggregation，或清理当前质量 Findings。

## Success Criteria

- `defaultProjectFileSelection` 是唯一公开默认 files value，package root、runtime artifact 与 declarations 均可导入；对象和嵌套数组不可变，consumer 可用 spread 建立自己的完整 selection。
- 默认 selection 不扫描 `.log`、coverage、temporary、generated、dependency、build/cache 与 virtual-environment 内容，同时不隐藏其它 dot files。
- 四项质量 Check 省略 Finding policy 时保留完整 Finding evidence 并返回 `passed`；显式 blocking 仍返回 `failed`。
- 无参 duplicate/file/function 的 resolved thresholds 分别为 `4/100`、`360 + 600/12`、`60 + 180/below 6 + CC 12 + parameters 6`。
- Project Gate 明确保留当前 duplicate area thresholds、file `300 + 500/10`、function `50 + 150/below 5 + CC 10 + parameters 5` 与 non-blocking policy。
- 目标测试、Test Evidence、public documentation projection、package acceptance、typecheck/lint 和 required workspace verification 通过。

## Affected Owners

- `docs/configuration.md`、`docs/scan-scope.md`：公共 files default、替换与组合语义。
- `docs/quality-metrics.md`、`docs/checks/{duplicate-detection,file-metrics,function-metrics,markdown-link-validation}.md`：Finding 默认与数值阈值。
- `src/package-checks/**`、`src/index.ts`：默认值 owner、constructor materialization 与 public export。
- `scripts/project/gate/repository-quality-checks.ts`：显式项目政策。
- `scripts/package/**`、`scripts/docs/package-api/**`、`README.md`、`docs/api-mechanics.md`：public inventory、artifact 与 consumer documentation。
- `docs/testing/cases/**`：默认配置、文件范围、Gate 与 installed consumer 证据。
