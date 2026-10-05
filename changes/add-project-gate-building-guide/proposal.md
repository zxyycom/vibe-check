# Proposal

本 Change 将已审阅的多场景 Gate 指南接入正式文档、受管示例与安装包验收，并消除增量选择示例暴露的强制空排除配置。

## Why

现有随包材料分别说明自定义 Check、依赖、flags、资源、callbacks、aggregation 与输出，但使用者仍需自行推导怎样从项目目标划分 Check、组合完整 Gate，并为调用入口、调度约束和最终结论分配责任。缺少这条任务级路径，会让已经公开的能力难以被发现，也容易产生结构正确但责任放置不当的集成。

## Outcome

Package consumer 能从 README 进入一份“从项目质量目标构建 Gate”的指南，先跑通最小完整入口，再按实际问题选择脚本接入、共享准备、依赖、选择、缓存、调度与诊断等场景。示例与受管源码、公开 API 和安装后的运行结果一致；没有排除项的 change region 可省略 `exclude`，与显式空数组含义相同。

## Scope

### Intended Change

- 将已审阅正文迁入 `docs/guides/building-project-gate.md`，保留基础说明与九个场景，不保留草稿副本。
- 为十个代码片段接入既有 source/region 投影、类型与运行验证；示例源码不因此额外作为独立目录随包发布。
- 将 `changes.flags.*.exclude` 改为可选，省略时归一化为空数组；保留 `include` 必填与非法输入拒绝。
- 更新阅读入口、发布映射、相应行为 owner、变更日志和当前测试证据。
- 按用户明确选择保留单页，为该指南添加精确文件行数 waiver；不提高全仓阈值，不放宽其它文件的检查。

### Resulting Impacts

- 正式指南及其本地链接必须在源码、staging、tarball 和 installed package 中闭合。
- 示例源码、Markdown 投影和安装后 declarations/runtime 需要同时验收。
- Gate 的单页例外需要精确配置、保留测量与 Finding，并由当前 owner 和配置测试约束其范围。
- 新增材料需要完整链接扫描；按实际 corpus 为 Gate 配置有限 target-read 预算，保持 Product defaults、扫描范围和超限失败语义。
- 可选 authoring 与内部 normalized region 需要区分；省略与空数组的选择和 fingerprint 不能产生无意义差异。
- 其它可能简化的公共字段由独立的可选字段审计 Draft 承接，本 Change 不扩大为批量 API 放宽。

## Success Criteria

- README 可直接到达正式指南，package 映射显式包含该页，旧草稿路径退出使用。
- 十个示例片段与其受管来源一致，并通过类型和隔离安装后的运行验收。
- 省略 `exclude` 与 `exclude: []` 等价，具体排除仍有效；错误类型、未知字段等仍按当前边界拒绝。
- 局部验证、完整 Gate、文档语义独立审查与 Change 检查通过；未覆盖内容明确报告。

## Affected Owners

- [API 机制](../../docs/api-mechanics.md)与[Project Definition](../../docs/development/project-definition.md)：change region authoring 与归一化。
- [文档材料](../../docs/tooling/documentation.md)与[材料验收](../../docs/tooling/repository-material-validation.md)：正文、投影、映射和安装后示例。
- [Package lifecycle](../../docs/tooling/package-lifecycle.md)：exact candidate 与隔离 consumer 验收。
- [Project Gate](../../docs/tooling/project-gate.md)：用户批准的单页行数例外及仓库质量检查。
- [测试策略](../../docs/testing/strategy.md)与[Case 维护](../../docs/testing/case-maintenance.md)：语义证据和全树闭合。
