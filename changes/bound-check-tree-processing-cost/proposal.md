# Proposal

本 Change 降低无效共享声明和深层 scheduling inheritance 的处理成本。

## Why

当前 C04 的共享 executable DAG 在重复任务 ID 被拒绝前按 occurrences 指数展开；循环依赖栈耗尽才失败。C06 的单叶深树在每层复制、去重并排序增长的 inherited collection，产生二次前缀工作。依据为本轮 complexity census 与基线源码对照。

## Outcome

无效共享声明在展开前失败，合法深层继承只为实际编辑和 executable 输出承担集合处理成本，保持有效声明的输出、顺序与 immutable snapshot。

## Scope

### Intended Change

在 check-tree authoring 中识别循环与重复 executable identity；resolver 使用 invocation-local 可回滚集合，保留 exact、remove 后 add、排序去重与兄弟隔离。

### Resulting Impacts

重复 executable 的公开 Run 已按确认取舍提前为配置失败；测试和 Case 证明必要行为及操作量，不设合法输入上限或硬 timing 门槛。内部 owner 说明实现边界。

## Success Criteria

共享 DAG 不指数访问；循环不依赖栈耗尽；深继承无重复前缀扫描；exact/重叠编辑/兄弟回滚和冻结输出符合既有契约。目标测试与工程验证通过。

## Affected Owners

`docs/development/project-definition.md`、公开 API 与 scheduling 说明、`docs/testing/strategy.md`、`docs/testing/case-maintenance.md`。
