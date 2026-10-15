# Proposal

本 Change 在不改变 native selection 和 filesystem policy 的前提下降低重复匹配工作。

## Why

K02 对每条 policy 重新 split 并 slice/join 全部增长前缀；已有 safe-literal membership 只服务获取判断，最终批次仍做完整 native pattern×candidate 匹配。当前普查给出源码及可复现规模证据。

## Outcome

深路径剪枝不再重复复制 segment prefixes；已证明等价的狭义 literal 列表在最终选择复用 Set membership，复杂列表保留完整 native matcher。

## Scope

### Intended Change

共享 config-glob 的 safe-literal predicate；在最终 batch 与 acquisition 共用；pruner 单次遍历 slash offsets 并保留每 policy 的 ancestor-any 语义。

### Resulting Impacts

需要证明 native list ordering/dedup、fallback、default exclusions、collision、symlink 和 error timing 未改变。更新 project-files 内部说明和直接测试。

## Success Criteria

literal 成本为 pattern/candidate 字符处理与 Set membership 而非 pattern×candidate；深路径不再 slice/join segment arrays；原生复杂列表与所有文件身份/访问测试通过。

## Affected Owners

`docs/development/project-files.md`、`docs/guides/collecting-project-files.md`、`docs/testing/strategy.md`、`docs/testing/case-maintenance.md`。
