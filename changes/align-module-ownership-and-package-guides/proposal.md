# Proposal

本 Change 将 package-provided Check、Check core、仓库脚本内部和 package consumer 文档重组为可从目录直接识别 owner 的结构，并在首发前消除 Definition 对特定 Check 的身份特判，交付首版可浏览 Check 指南。

## Why

当前实施已移除 `checks/builtins/` 与 `definition/default-checks.ts`，但 review 发现仍把“有多个消费者”误当成共享 owner 的充分条件：Definition 仍按内置 `checkId` 集中验证 options，`ProjectDefinition.quality` 仍把 metric Check 的 code-area policy 固化进通用 Check context，三个互不相同且各只有一个 Check owner 的 scanner 被集中到 `scanner-adapters`，而 `scan-scope`、`metric-model` 与 `metric-analysis` 又混合了项目文件能力、Check-local measurement 类型和便利函数。这些结构让 package-provided Check 在 core 中拥有外部 ordinary Check 不具备的隐性特权。

## Outcome

完成后，Check core 只理解 ordinary Check grammar、opaque canonical options 与统一 execution contract，不按任何 package-provided Check 的 ID 或 options shape 分支；每项 package-provided Check 完整拥有自己的 scanner、measurement、options validation、execution 和指南。项目文件收集/exact-input 成为独立基础能力而非伪 Check，metric 聚合容器消失。首发 authoring contract 允许移除 `ProjectDefinition.quality` 并把所需 file/code-area policy 放入具体 Check options；程序化根入口、Bun 宿主及无 CLI/无 subpath API 的边界保持不变。

## Scope

### Intended Change

- 以单项 package-provided Check 为 `src/checks/**` 的完整实现 owner，删除 `src/checks/builtins/` 与 `src/definition/default-checks.ts`，并将 options、默认构造、纯 options validation、execution、私有 parser/resolver/measurement/cache 和直接测试/Case 路径迁至实际 Check 或真实共享模块。
- 删除 Definition/check-tree 对 package-provided Check ID 的 options 特判；Check-local execution 验证自己的完整 options。移除通用 `ProjectDefinition.quality`/`CheckProjectContext.files`，把文件选择与 code-area policy 作为所需 Check 自己的 ordinary options，由项目显式组合。
- 将 jscpd、scc、lizard 的 command/availability/parser/process/failure/test 边界分别迁回 duplicate-detection、file-metrics、function-metrics；解散 `scanner-adapters`、`metric-model`、`metric-analysis` 与 checks 下的 `scan-scope`，只保留由真实共同不变量支持的 project-files/foundation 能力。
- 保留 `scripts/` 的现有顶层 owner，只在内部收敛 foundation command/process、machine-artifact 文档与 validator、test-evidence ast-grep 材料和 package artifact 第三方许可证等 owner；不改 workflow 的语义入口。
- 增加每项 public package-provided Check 的首版 package 指南和可发现索引，并把其可编辑来源、投影、manifest/fingerprint 与 candidate artifact audit 接到 package 交付链路。
- 用独立 Product、scripts、public-docs/package-artifact 三组实现任务推进；只让集成任务编辑跨组共享入口、registry、manifest、投影、fingerprint、全局 Case/测试索引和最终 candidate 证据。

### Resulting Impacts

- 所有 source imports、测试节点、Case owner/proves、公开 root export 聚合和 Definition materialization 都必须在目录移动后指向新的唯一 owner；不得以 compatibility re-export、新 `index.ts`、集中 registry 或改名后的 adapter/model 容器掩盖旧路径。
- 首发 authoring 示例、public types、Definition fingerprint、dogfood Definition 与 package guides 必须同步 `quality` 退出和 Check-owned file/code-area options；这是一项首发前 contract 修正，不保留旧字段兼容层。
- Check 指南须覆盖用途、完整 options/默认值、工作原理、产生的 final data/Records/messages、`not-applicable`/`unavailable` 和外部工具/文件/网络边界，并用中文主叙述；JSDoc 仍只承担字段级 API 提示。
- package 文档路径与 README 索引、文档 registry、projection、package manifest、fingerprint、candidate audit/isolated-consumer 证据需同步，且 tarball 内的文档必须与当前 source/ESM/declarations 属于同一版本。
- 移动或拆分原生测试节点必须维护 semantic Case 闭合；广泛重构最终须重新生成 candidate 并运行 full workspace verification。

## Success Criteria

- `src/checks/builtins/` 和 `src/definition/default-checks.ts` 不存在；每个 public package-provided Check 的实现、options/default、validation 与直接私有支持代码可从一个 Check owner 目录或明确共享 owner 恢复。
- Product core 不出现 package-provided Check ID/options registry；各 Check 的 options/scanner/measurement failure 只由该 Check owner 解释。`ProjectDefinition.quality` 与 `ProjectQualityConfiguration` 不再是 public authoring surface，所需 file/code-area policy 进入 Check options；Check IDs、根入口、无 CLI/bin/subpath 和 four-state Core contract 保持不变。
- `src/checks/scanner-adapters`、`src/checks/scan-scope`、`src/checks/metric-model`、`src/checks/metric-analysis` 和 `src/checks/builtin-option-validation.ts` 均不存在；每个 scanner 的实现与测试可从唯一 Check owner 恢复，project-files 共享边界只承接真实共同文件不变量。
- `scripts/` 顶层 owner 不变，指定内部材料不再跨 owner 倒置或放在泛化容器；现有开发 workflow 行为不变。
- package 内有 README 可达的每项 package-provided Check 指南，中文说明完整且 artifact audit 证明它们随当前 candidate 交付。
- Test Evidence、目标测试、package/documentation/artifact 验证和 `bun run verify:vibe-check-workspace:full` 都覆盖本 Change 的实际结果。

## Affected Owners

- `src/checks/**`、`src/definition/**`、`src/index.ts` 与直接测试/Case owner；当前稳定方向见 `docs/decisions/align-source-layout-and-naming-with-module-owners.md`。
- `scripts/foundation/**`、`scripts/validation/**`、`scripts/docs/**`、`scripts/package/**`、`scripts/test-evidence/**` 和它们的测试；workflow owner 见 `docs/script-tooling.md`。
- package README/template、public documentation projection、package artifact/candidate manifest、fingerprint 和 audit；物理 package 布局与公开边界见 `docs/decisions/publish-readable-esm-package-layout.md`，中文主叙述见 `docs/decisions/use-chinese-as-primary-language-for-public-documentation.md`。
- `docs/testing/cases/**` 与 Test Evidence integrity tooling；移动/拆分测试时使用 `test-evidence-review` skill。
