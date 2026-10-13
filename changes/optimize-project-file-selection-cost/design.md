# Design

对必要单路径判断使用可证明等价的有限快路，复杂列表与最终选择继续由原生 matcher 解释。

## Context

公开与内部 owner 见 proposal。基线为 HEAD `08c9166b85152168ca27d45452a4174afed50e57`。静态调用关系与独立 profile 共同确认 singleton 匹配反复编译列表；最终 batch 不是本轮主要成本。完整证据归[调查报告](../../docs/investigations/evaluate-project-file-selection-optimization.md)，本设计保存实现义务。

## Goals / Non-Goals

目标是消除重复编译并保持选择、访问与结果语义。实现限于操作内谓词；通用列表重实现、跨 Check cache、Run barrier、第二 walker、公共配置及最终 F×P 扫描优化不属于本 Change。

## Decisions

### Intended Change

1. 当全部 pattern 长度不超过当前 parser 的 65536 字符范围，且每个 slash segment 匹配 `[A-Za-z0-9_.-]+`、不为 `.` 或 `..` 时，使用 literal `Set`。重复、dot 文件与空列表合法；其它情况原生 fallback。
2. 默认排除数组全为正 pattern，以相同 `CONFIG_GLOB_OPTIONS` 构造 matcher 并做 OR。保留用户判断在先、默认层在后的短路次序；关闭默认层或尚无用户命中时不构造默认 matcher。
3. 单一路径谓词供 fs adapter、目录 access 和 lossy-entry 判断消费，保持获取、检查和错误映射顺序。长度资格使超长输入仍在原边界触发带 context/cause 的原生错误。
4. `collection.ts` 的完整列表匹配、stable sort/dedup/freeze 与公开 façade 保持原样。

### Resulting Impacts

- 既有测试实体补充字面列表和 fallback 变体；超长 lossy-entry 场景直接比较错误上下文，不靠内部实现断言。
- 内部 owner 说明谓词的操作内生命周期。默认数组未来出现负规则时，须重新审查 OR 等价性。
- A/B 使用同一物化 fixture。before 保存原三模块与 hash，仅调整内部 import；after 从生产公开 export 进入。文件和源码身份在计时前后核对，assert/hash 在计时外。
- 复制源码与 fixture 的临时目录采用 Bun 已有的 `node_modules` 排除，保持测试实体集合；正式资源保留必要 manifest、源快照、方法和 raw，不复制整库。
- 当次文档集合耗尽 Gate 容量后，只增加仓库 `maxTargetReads` 到 2000；Product 默认 1000、限制语义、selection、blocking、其它 limits 及 root-external 授权保持。

## Risks / Trade-offs

安全快路刻意不覆盖任意 Unicode 或特殊字面路径；漏覆盖仍走原生语义。操作内 `Set` 和默认 matcher 有有限分配成本。物化 fixture 缺少真实仓库未选目录，其绝对耗时不能与早期 workspace 样本混用。

早期候选的计时终点包含额外路径断言；首轮生产 glob 小样本还暴露默认 matcher 无条件构造。最终已统一计时边界并采用惰性构造，旧样本保持。最终正常 glob 中位数接近只证明该有界观察，不担保一般无回归或稳定尾延迟。

## Open Questions

无未决设计问题。实现、目标测试、独立审查、Case、工程/材料及 required/complete Gate 已完成，证据见报告。Plan 保留供当前交接；结项删除按项目的独立授权与 `finalize` 流程执行。
