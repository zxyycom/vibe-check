# Design

本设计把目录视为受信任调用方选择的output target，并以共同grammar取代machine/diagnostic之间不一致的lexical containment。

## Context

`ProjectOutputs`为machine publication和diagnostic logging分别保存`{ enabled, directory }`。Definition defaults分别是`artifacts/vibe-check`与`.log/vibe-check`，RunControls可逐字段覆盖；progress rendering没有文件目录。

实施前，`parseOutputs`只对diagnostic directory调用`isContainedRelativeDirectory`，override parser也只限制diagnostic。运行阶段对machine使用`resolve(projectRoot, directory)`，所以`../`和绝对值可写到root外。

Product没有CLI或不受信任路径输入，Definition和RunControls由调用项目的TypeScript代码提供。lexical containment既不能限制同进程任意代码，也不验证symlink realpath，因此本Change不把它保留为安全主张。

下表保留实施前事实与本 Change 目标契约的边界：

| 输入位置                | 当前 machine 行为                      | 当前 diagnostic 行为            | 目标行为               |
| ----------------------- | -------------------------------------- | ------------------------------- | ---------------------- |
| Definition `directory`  | 接受非空字符串，实际可写 root 外       | 只接受 root 内相对目录          | 两者都使用共同 grammar |
| RunControls `directory` | 提供时接受任意字符串，实际可写 root 外 | 提供时只接受 root 内相对目录    | 两者都使用共同 grammar |
| 相对 target             | 从 effective `projectRoot` 解析        | 从 effective `projectRoot` 解析 | 保持一致               |
| 绝对 target             | 直接作为目标                           | 配置阶段拒绝                    | 两者都直接作为明确目标 |

共同 grammar 只拒绝空字符串、U+0000、非字符串和 closed object 中的 unknown key。它不 trim 路径，不建立跨平台禁用字符表，也不承诺 lexical、realpath 或 symlink containment。

## Goals / Non-Goals

**Goals**

- 为两个filesystem outputs建立一致、简单、可解释的目录grammar和解析顺序。
- 支持CI临时目录、父级artifacts目录和其它明确的绝对target。
- 保持每项output的文件集合、失败隔离与readback可审计。

**Non-Goals**

- 不建立filesystem sandbox、symlink confinement、directory allowlist或权限系统。
- 不合并machine与diagnostic配置，也不新增共享`outputRoot`。
- 不允许自定义canonical machine filenames或diagnostic filename生成规则。
- 不把Check-owned cache、Gate transcript、process log、candidate build或release artifact纳入Run outputs。

## Decisions

### Intended Change

1. 两项 directory 共用一个边界 parser：值必须是非空且不含 U+0000 的字符串；不 trim，也不尝试建立跨平台非法字符表。相对值保留其 author text 进入配置，运行时相对 effective `projectRoot` 解析，绝对值直接解析为目标。
2. Definition与RunControls都使用该grammar；partial override只在提供directory时校验它。删除diagnostic-only containment分支，不为machine保留偶然例外。
3. machine publisher继续只拥有目标中的`run.json`、`records.ndjson`及其私有临时文件；legacy-named或其它调用方文件绝不因成功或失败cleanup删除。diagnostic logger继续以exclusive create生成一个invocation-specific log。允许同目录不改变两个output的独立status和failure priority。
4. diagnostic `RunResult.outputs.diagnosticLogging.file`继续返回`path.relative(projectRoot, resolvedFile)`。root外目标因此可含`..`；当平台对跨卷目标返回绝对路径时保留该结果。测试必须用相同Node path语义定位实际文件。
5. `restrict-machine-publication-to-canonical-file-ownership.md` 记录精确 machine file ownership；路径 grammar、非-sandbox 边界和 readback 由稳定 public owner 文档表达。文档建议可重复、可移植Definition使用相对目录；absolute/invocation-specific外部目标优先通过RunControls传入，但两处grammar保持一致。

### Resulting Impacts

- 当前“两个目录必须contained”的稳定文档需要由Configuration owner一次性改写，README摘要与API mechanics只引用该语义，不复制不同规则。
- Definition fingerprint继续包含author directory string；同一物理目录的不同文本表达不做realpath canonicalization或identity合并。
- 测试必须在隔离temporary root中验证外部路径并精确清理fixture，不能写入工作区外的非owned位置。

## Risks / Trade-offs

- 错误配置可以把canonical machine文件写到意外目录；这是受信任target选择的风险，文档和精确file ownership比虚假sandbox更诚实。
- absolute Definition降低跨机器fingerprint可移植性；保留RunControls建议可避免为此增加第二套path type。
- 平台路径差异需要使用Node path API和跨平台fixture，不应用POSIX字符串规则模拟。

## Open Questions

无。用户已确认相对路径按`projectRoot`解析、绝对路径作为明确目标、两个output使用相同规则，并决定不增加共享目录抽象。
