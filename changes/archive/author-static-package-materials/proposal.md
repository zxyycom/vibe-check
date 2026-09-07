# Proposal

将发布 manifest 的稳定 authoring 交回单一 checked-in JSON，同时保持版本投影与独立 package safety evidence。

## Why

发布 manifest 的稳定字段曾由 TypeScript 常量在构建时拼装，维护者修改公开包元数据需同时追踪生成器与断言。

## Outcome

`release-manifest.json` 成为唯一可编辑的稳定发布 manifest；local candidate 与 formal release 只对它投影经验证的版本，同时保留独立的包安全、tar、安装和 receipt 验收。

## Scope

### Intended Change

- 新增唯一 checked-in `scripts/package/artifact/release-manifest.json`，以 `<candidate-version>` sentinel 表示唯一可投影字段。
- 从显式 `repositoryRoot` 读取、验证并投影该 source；不经 module-level JSON import，避免 fixture/formal root 回读主工作树。
- 将 source JSON 的路径和原始字节纳入 candidate fingerprint，移除平行 production dependency fingerprint；Ajv/jscpd probe 从 source manifest 读取其受控 requirement。

### Resulting Impacts

staging、tar、cache reuse 与 formal receipt 审计都须向 manifest audit 传入同一 repository root；静态 source 本身与投影仍必须独立拒绝非法 version、字段、exports、files、license、private/bin/scripts 和非法 dependency map。package lifecycle 与 Case 证据须记录 source→projection→installed artifact 的边界。

## Success Criteria

同一 source 可供 local/formal build 只替换 version；JSON byte drift 使 fingerprint/receipt stale；source 缺失、非 sentinel 或非法内容以及 candidate drift 均 fail closed；实际 staging、tar 和 installed consumer 验收仍闭合。

## Affected Owners

- `docs/tooling/package-lifecycle.md`
- `scripts/package/artifact/**`、candidate install/reuse、formal receipt 与 repository tooling Case

## Non-Goals

不把开发根 `package.json` 当作发布 manifest；不静态化其它 build material；不改产品 runtime、不新增依赖、不发布 npm，也不处理 cold bootstrap 调查。
