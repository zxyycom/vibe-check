> **核心句：**本 change 以 Bun 托管的 TypeScript Project Definition 取代 JSON config，让项目声明内置与自定义 checks，并由 loader 将 authoring declarations 解析为 foundation 公共 metadata、私有 execution bindings 和冻结政策数据。

## Why

JSON 可以表达固定政策，却不能自然组合项目本地 check functions 或后续 task binding。把这些需求压成
command/config 字段会让 Core 重新承担命令协议；Project Definition 应当只负责受信任 authoring，而
Check/Record Core 与 execution orchestration 继续拥有 resolved runtime contract。

## What Changes

- **BREAKING:** 固定 active source 改为 `<project-root>/.vibe-check/config.ts`；`--config <file.ts>` 选择
  explicit module。删除 `.vibe-check/config.json`、Vibe Check JSON、sibling schema 及 JSON/TS dual reader。
- Definition default export 是 `apiVersion: "1"` 的 plain structured object；runtime validator 是 authority。
  `vibe-check/project` 的 `defineProject`/`defineCheck` 和 types 只是安装 package 后的 optional identity helpers，
  不构成 brand 或 load prerequisite。
- Canonical `init` starter 是 import-free structured export；被扫描项目未安装 Vibe Check SDK package 时，
  Product 自身 Bun loader 仍可加载。Custom bare/local imports 继续按 project Bun resolution，failure 是 config
  error。
- 新增 `ProjectCheckDeclaration` authoring boundary：serializable metadata 解析为 public
  `CheckDefinition`，direct runner 或 task binding/planner factory 解析为 private
  `CheckExecutionBinding`；functions、imports、closures 与 execution payload 不进入 catalog/machine/fingerprint。
- Task-based declaration 只在 module load 时提供 serializable schedule metadata 与 private factory。Foundation
  完成 selection/applicability 并准备 planning context/domain-work handles 后，invocation planner 才生成并
  freeze TaskPlan；执行中不能注册 check 或 Task。
- 使用最小 selection：selected definition 中的 custom checks 默认全部 requested；built-ins 继续服从
  Product-owned profile/request rules；`requiresChecks` 由 `check-execution-orchestration` 计算 transitive
  closure，不引入 custom profile DSL。
- 同一 CLI process invocation 只 load/evaluate selected module 一次；不承诺未来同进程 multiple invocations
  的 ESM cache behavior。
- Definition data fingerprint 只覆盖 validated policy、built-in refs、custom public metadata 与 serializable
  schedule metadata。First version 不缓存 custom runner result，fingerprint 不得单独充当 cache identity。
- 普通 `scan --help` 不 load module 或枚举 dynamic policy IDs；unknown ID 只在 definition 解析后失败并列出本次
  resolved catalog。
- `--no-project-definition` 跳过 module/import 并只允许 ungated neutral observation。普通 discovery 与 custom
  execution 是同进程、同权限 trusted code，无 sandbox、public cancellation、hard timeout 或 termination
  guarantee。
- Project code MAY 自行使用 Bun API、library 或 subprocess；Core 不提供 command parser/exit mapping。Bun 只
  托管 definition，不要求被扫描应用使用 Bun。

## Capabilities

### New Capabilities

- `project-definition`: TypeScript source selection、structured authoring declarations、public/private
  resolution、load lifecycle、selection defaults、trust、provenance 与 custom check composition。

### Modified Capabilities

- `scan-configuration`: 用 typed Project Definition data、neutral default、single-source selection 与 hard-cut
  migration 替代 JSON/schema workflow。
- `cli-contract`: 更新 `--config`、`init`、static help/dynamic policy validation、failure mapping 与
  `--no-project-definition`。
- `product-runtime`: 允许 Product loader 进入 selected trusted module boundary，同时保持 Product owner 与
  `scripts/**` dependency direction。
- `output-contract`: 发布 definition source/API/data fingerprint provenance，并明确 functions 与 code identity
  不可序列化/重放。
- `test-fixtures`: 用 import-free starter、custom declarations、load/planner failures 与 disabled path 替代 JSON
  config/schema acceptance。

## Impact

- 影响 `src/product/config-*.ts`、CLI/help/init、optional package authoring exports、loader/validator、
  declaration/binding resolver、neutral definition、output provenance 与 docs/tests/fixtures。
- 本 change 依赖 `establish-check-record-core` 提供 `quality-checks`、`quality-records` 与
  `quality-decision-policy`，依赖 `establish-check-task-orchestration` 提供
  `check-execution-orchestration`；不重新定义 manager、record sink、TaskPlan validation 或 scheduler。
- `add-file-policy-overrides` 后续按 TS authoring 重写 typed deterministic policy；本 change 不实现 override
  algorithm，也不为七个未实施 features 预定义 fields。
- Fixed JSON、file-backed JSON gate、tool-neutral boundary 与 compile-time-only registry 相关 active decisions
  必须在 implementation gate 前显式演进；本 change 不直接写 decision records。
