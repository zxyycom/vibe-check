# Proposal

将根目录宽泛第三方说明收窄为与实际随包翻译材料相邻的来源说明，保留真实材料完整性验收。

## Why

根 THIRD_PARTY_NOTICES.md 是项目手写的 Lizard/Pygments 翻译说明，混入未移植模块计数和安装验收流程；它不是上游许可原文，也不是完整 npm 依赖清单。用户已批准移除该根文档，将实际翻译归属说明放入 licenses，并保留原文和源码头。

## Outcome

根只保留自有 LICENSE；licenses/analyzer-translations-NOTICE.md 简洁说明实际携带的 Lizard/Pygments 翻译来源与修改状态，并导航到原文与 provenance。普通 npm 安装审计机制只由维护者文档解释。

## Scope

### Intended Change

- 移除根 THIRD_PARTY_NOTICES.md，建立范围明确的 licenses/analyzer-translations-NOTICE.md。
- 保留三份上游许可原文、provenance 和 translated source headers，不以新说明替代任何原始材料。
- 删除把维护流程、计数或固定措辞当法律材料事实的重复校验，保留实际 package material closure。

### Resulting Impacts

- 同步 manifest 文件列表、legal inventory、staging/tar/installed audit、fingerprint、receipt 身份与目标测试。
- 更新 package lifecycle owner 及随包文档中的有效链接；演进直接相关材料布局决策。
- 新构建使用新 inventory；旧 build 与 release receipt 不改写，也不因此宣称已发布。

## Success Criteria

1. 源码与新包不再含根 THIRD_PARTY_NOTICES.md，范围明确的归属说明位于 licenses 内。
2. 原文、provenance 与 source headers 未被本次移动或文案整理改写。
3. 材料验收验证 actual source/staging/tar/installed bytes，而不是强迫说明包含验收流程句子。
4. 目标测试、文档和完整包验收据实际结果交付；不作法律充分性判断。

## Affected Owners

- 根 notice、自有 LICENSE、licenses 材料目录与 translated source provenance。
- scripts/package 的 contract、legal materials、artifact/candidate/release 验收及 tests。
- Package lifecycle、直接相关材料决策与 repository-tooling Case。
