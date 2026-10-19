# Proposal

修复实际包 JSDoc 审查发现的局部使用信息缺口，以简短说明和随包指南引用支持正确使用。

## Why

对候选包 `0.0.0-local.b050b56f8768` 的独立审查覆盖 227 个根导出与必要辅助声明，发现 16 项 P2 和 6 项 P3：关键约束、默认值、失败边界与引用不完整，另有少量旧措辞和错误注释。已有用户指南拥有完整规则，无需复制到注释。

## Outcome

22 项发现均在对应源码 JSDoc 中修正，生成并安装后的声明保留关键说明，指南引用可达；非实施的 `gpt-6.1-sol` 代理复核无剩余阻断。

## Scope

### Intended Change

- 修复核心 API 的 8 项发现：aggregation、Records、final data、输出默认值、flags、change evidence、preview formatter 与两个失效 symbol links。
- 修复随包 Check 的 7 项发现：secret 范围、文件选择、schema identity、command lifecycle、旧 files 措辞、lint 默认规则与链接坐标。
- 修复调度与工具的 7 项发现：admission wait、terminal effect、learned identity/observer/配置范围、Finding limit 和错挂注释。
- 按 `ai-ready-docs` 复看这批注释的用途重心、负向表述与迁移残留，保留影响正确使用的约束。

### Resulting Impacts

- 在源码 owner 编辑中文 JSDoc，保留类型、运行时和受管示例；通过随包指南链接展开复杂规则。
- 重新生成并安装本地候选包，验证注释传播、链接与 artifact identity；不把旧包审查结论套用于新包。
- 保持产品语义和测试义务不变；用户已授权整理并提交本 Change 的改动，沿用已启用的有界提交 hook。正式发布与 Change 删除仍须另行授权。

## Success Criteria

- 22 项发现均能追溯到修正及对应行为 owner，局部信息足够且未复制整篇指南。
- 修改前后 TypeScript 的非注释结构一致；受管示例和现有工程验证通过。
- 实际包声明及指南链接通过核对，三个独立复核切面无剩余阻断。

## Affected Owners

- `src/check/`、`src/project-definition/`、`src/project-run/` 的核心 API 声明 owner。
- `src/package-checks/` 的具体 Check、文件选择与结果声明 owner。
- `src/package-tools/` 的 learned strategy 与 Finding 呈现 owner。
- `docs/tooling/documentation.md`、`docs/tooling/package-lifecycle.md`：JSDoc 编辑、实际包和独立审查方法；已有随包专题拥有精确行为。
