# Design

本 Draft 以 fast-glob 加薄适配层为首选方向，围绕 [Proposal](proposal.md) 的范围感知与可信失败结果，收敛后端、共同匹配规则和接入验证。

## Context

- [调查报告](../../docs/investigations/compare-node-file-collection-backends.md)保存选型证据；第三方库仅做固定版本源码审查，尚待本项目接入实测。
- [Project files](../../docs/development/project-files.md)与[公开收集指南](../../docs/guides/collecting-project-files.md)拥有 selection、同源候选快照、exact-input handoff 和同步 façade 契约。活动 Decision 的[显式来源](../../docs/decisions/select-check-files-from-explicit-sources.md)、[公开同步工具](../../docs/decisions/provide-synchronous-single-selection-file-collection.md)及[按需调用](../../docs/decisions/retain-on-demand-project-file-collection.md)构成本次基线。
- `src/data-boundary/config-glob.ts` 的共同 matcher 被 filesystem/Git 收集、revision/submodule 过滤和 `src/project-run/changes/git.ts` 消费；新 grammar 的影响需覆盖这些调用方。
- 用户允许破坏性变更；运行时后端使用标准 Node API 或第三方库。开发验证仍按项目约定运行 `bun run`。

## Goals / Non-Goals

### Goals

- 用库承接同步遍历与 include/exclude，以薄适配控制根目录、任务起点、symlink 和错误传递。
- 保持同源共享候选及 immutable path snapshot；让共同 matcher、必要依赖、说明与证据同步升级。

### Non-Goals

- 公开 API 形状、Definition 字段和 Run 调度保持当前边界；本次不增加 batch / membership API、跨 Check cache 或 watcher。
- Git collector 继续拥有 tracked、非忽略 untracked 和安全初始化 submodule 的枚举；filesystem 不自动读取 `.gitignore`，不隐式切换来源。
- Check 继续拥有 eligibility、内容读取、安全 resolver、Finding、Record 与结算；无关 scripts 遍历工具和性能优化留在各自任务。

## Decisions

### Intended Change

1. **后端（暂定）**：fast-glob 3.3.3，使用已发布同步接口，显式设置 `ignore`、`dot: true`、`onlyFiles: true`、`followSymbolicLinks: false`、`suppressErrors: false`。task base 指 include 的 glob-parent 扫描起点；其被排除或为 symlink 时的实际 I/O，以及静态 include 的 stat 顺序，先实测再确定前置控制。
2. **共同 matcher（暂定）**：显式声明 micromatch，统一 filesystem 选择、已枚举 Git paths、revision/submodule 过滤和 change regions 的新 grammar。旧语法不作为兼容要求；移除 minimatch 前审计真实消费方。
3. **source group（待验证）**：在 owning Check 内推导 include 并集与可安全剪枝的共同排除，形成一次稳定候选切面，再分配各 selection。保留任何其它 selection 仍需要的文件；库内部多 glob-base 任务属于私有实现，不改为每个 area 独立重新枚举。
4. **错误适配（待验证）**：显式检查 root 存在、目录类型与必要可读性，包括空 include 时的来源检查。范围内 acquisition 错误向调用方传递；另行验证 fast-glob 默认忽略 ENOENT 时，遍历期目标目录消失的处理。

### Resulting Impacts

- **收集与 Check 输入**：修改共同 collection 和 host filesystem 接线，保留 Git 枚举及公开 closed validation。证明 root 不存在 / 不可读、范围外 / 范围内不可读、excluded task base、静态 include、目录消失、empty include/exclude、多 selection 重叠与 exact union；输出仍为排序、去重、冻结的相对 slash paths。
- **symlink 与路径类型**：按当前普通文件与 no-follow 策略验收 root/base、文件 / 目录 links 和 broken link；公开工具仍不是 OS sandbox，也不提供原子内容快照。
- **匹配消费方**：依 [Project Definition](../../docs/development/project-definition.md)与 [API 机制](../../docs/api-mechanics.md)审计真实配置、示例及 dot、brace/extglob、排除优先；覆盖 Git candidates、submodule include 和 changed-path region eligibility，保持 change flags 的业务语义。
- **依赖与包**：用 pnpm 更新 `package.json`、lockfile 与 `scripts/package/artifact/release-manifest.json`；依 [Package artifact](../../docs/tooling/package-artifact.md#依赖与发布清单)和 [Package lifecycle](../../docs/tooling/package-lifecycle.md)核对显式依赖、许可、类型/import 与 installed Node consumer，不依赖传递包偶然 hoist。
- **说明与证据**：按 [Documentation](../../docs/tooling/documentation.md)同步公开收集指南、内部 project-files、相关 Check 指南、API/change-region 说明、示例与 changelog；按[知识治理](../../docs/governance/knowledge-maintenance.md)审查实际兼容性影响及必要 Decision 修订；依[测试策略](../../docs/testing/strategy.md)和 [Case 维护](../../docs/testing/case-maintenance.md)闭合 owner tests 与证据。

实施验证按[文档导航](../../docs/navigation.md#交付验证)：先运行最窄 collection/matcher/changes/Check tests、typecheck/lint/dependency 校验，再运行 `bun run validate`、`bun run test-evidence -- check --root .` 与跨边界 `bun run check`；最终包依赖和安装后 Node 行为由 `bun run check -- --all` 验收。

## Risks / Trade-offs

- 排除 task base、symlink 起点和遍历期 ENOENT 可能需要额外控制。若适配演变成第二套递归扫描引擎，重新评估后端，而非扩大手写 scanner。
- source-group 并集比单 selection 更宽，是多个 area 输入一致性的代价；grammar 切换则可能改变 Git 输入或 region eligibility，两者都需直接行为证据。
- 调查体积是独立依赖闭包估算；项目实际安装增量、许可与供应链风险以 candidate 验收为准，性能收益另需 workload 与 baseline。
- [成员查询 Draft](../add-project-file-membership-queries/proposal.md)共享 project-files owner，无硬前置关系；并行推进时协调源码、lockfile、Case、manifest 与文档的实施 / 合入。

## Open Questions

1. 在最低支持 Node 版本上，excluded task base、静态 include 与 symlink base 的读取顺序是什么？薄适配如何同时保证范围感知、no-follow 和遍历期 ENOENT 的可信失败？
2. 哪种 source-group 组织可以收窄遍历，又保留共享候选、安全共同排除和空 include 时的来源检查？
3. micromatch 的公开入口能否统一所有必要消费方？真实配置、change regions、submodule paths 和示例有哪些兼容性差异？

保持 `draft`。以上问题闭合后核定已发布依赖版本、必要 Decision 修订与验收命令，补全 Plan proposal 并派生 tasks；进入 Plan 与实施分别遵循 Change 流程和当前任务授权。
