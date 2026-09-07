# Proposal

复核结论：现有固定路径与状态入口已满足当前包定位需求；此 Draft 不再作为待实施改进，不迁移产物。

## Why

用户此前无法从 build、artifacts 与既有描述判断哪份是最新包。2026-09-07 复核确认现有实现和已修正文档已提供固定
`build/package/` 与只读 `package:status`。将这一已满足的需求重新列为待改进是不准确的，本次纠正该登记。

## Outcome

从一个正式入口可核对 current/stale、unpacked package、对应 tarball 与 installed entry，且能区分本地候选、正式 release 和 Check/Run outputs。

当前 Outcome 已由现有入口满足，不新增代码或输出机制。旧材料是否可删由[清理 Change](../clean-obsolete-generated-artifacts/proposal.md)承接；
未来如出现具体的新消费需求，应先重新确认范围。生命周期尚未迁移或归档，不以 Draft metadata 表示实施未完成。
