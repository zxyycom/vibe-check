# Proposal

本 Change 重构 package 法律材料审计的私有实现，使 provenance 解析和 packaged audit 的职责可独立阅读，同时保持既有 fail-closed package 行为。

## Why

`scripts/package/legal-materials.ts` 先前同时承载固定材料、provenance inventory/entry/Pygments 解析和 package-local 审计。单一长文件及高复杂度函数遮蔽了法律闭包的输入边界、七阶段顺序和首个可见错误。

## Outcome

对同一 package-file view，`assertTranslatedAnalyzerLegalMaterials` 仍以固定的七阶段、fail-first 顺序验证 Lizard/Pygments 法律闭包：批准材料字节、provenance inventory 解析、translated target closure、已登记 target header、未登记 header、deferred body 缺席、固定来源 notice。拆分只改善私有职责边界；调用者可见的错误文本、candidate 行为和异常边界保持不变。

## Scope

### Intended Change

保留 `scripts/package/legal-materials.ts` 中的 exported material registry、`PackagedLegalMaterialAccess` 和唯一 orchestrator。将固定 provenance inventory、entry 与 Pygments supplemental parser 及 translated-target collection 移入 provenance 模块；将 package-local 字节、header、untracked/deferred 和 notice audit 移入 packaged-audit 模块。物理材料和现有调用者不变。

### Resulting Impacts

- direct mutation test 逐项证明 orchestrator 的七阶段首错顺序；现有 staging/tar acceptance 继续证明真实 package candidate 的审计路径。
- staging 与 tar 审计继续直接抛出；installed candidate 的既有 wrapper 继续只在其 owner 处添加原有前缀。
- 本 Change 只记录此次拆分的范围、设计和证据；当前 package 法律材料契约仍由 `docs/script-tooling.md#package-artifact-与-candidate` 及实现/测试 owner 承接。

## Success Criteria

- 原 `scripts/package/legal-materials.ts` 与两个新私有模块均不产生超过 300 code-lines 的 file-metrics Record；原 provenance inventory、entry 与 supplemental parser 的四条质量 Records 消失。
- schema/version、固定 Lizard/Pygments identity、84/1 inventory、46/22/16 status counts、41-target closure、路径/range/SPDX/status/hash/target 规则仍 fail-closed。
- orchestrator 保持全部七阶段的顺序、既有 Error 文本和 caller 异常边界；不修改 schema、物理 legal materials 或 package candidate contract。
- direct mutation/error-order、artifact staging/tar、focused quality、Test Evidence、Change Plan、docs validation 与一次默认 Project Gate 均有通过证据；未运行 `--all` full Gate。

## Affected Owners

- `docs/script-tooling.md#package-artifact-与-candidate`：package physical legal material audit 的当前稳定契约。
- `docs/testing/case-maintenance.md`：当前测试实体与 package artifact material Case 映射。
- `docs/coding-style.md`：模块职责和可推理性。
