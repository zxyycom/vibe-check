# Design

本设计仅记录本 Change 的私有拆分和验证边界；package 法律材料的当前稳定规则仍由 `docs/script-tooling.md#package-artifact-与-candidate` 承接。

## Context

package artifact、staging、tarball 与 installed candidate 都需要在不读取 source checkout 的前提下验证法律闭包。固定 provenance 的事实包括 schema version 2、Lizard `terryyin/lizard` tag `1.24.0` revision `308b1c3efd8c1c69bcc3eb82deeaec64fd3662ec`、84 个 files、1 个 supplemental source、46/22/16 status counts 和 41 个 translated targets。重构前，这些解析规则与 package-file 审计混在 `scripts/package/legal-materials.ts` 中。

## Goals / Non-Goals

- 保持 package-file view 上所有 caller 可见的 fail-closed 判断、七阶段首错顺序与 Error 文本。
- 分离 provenance 解析/target collection 和 packaged legal audit 的私有职责，使 orchestrator 的顺序可直接阅读。
- 用最小 direct mutation test 补足阶段顺序证据，并保留 staging/tar acceptance。
- 不修改 Product runtime、scheduler、Gate policy、legal schema、package candidate contract 或物理 legal materials。

## Decisions

### Intended Change

`scripts/package/legal-materials.ts` 保留 exported material registry、`PackagedLegalMaterialAccess` 和唯一 `assertTranslatedAnalyzerLegalMaterials` orchestrator。两个私有模块按下列边界协作：

| 模块 | 输入与职责 | 不承担的职责 |
| --- | --- | --- |
| provenance inventory | 解析 packaged provenance bytes，核对固定 identity/entry/status 规则，并收集 translated target closure。 | 不读取其他 package files，不审计 header、notice 或 deferred body。 |
| packaged audit | 通过 package-file access 核对批准材料字节、target/untracked headers、deferred body 缺席和 notice 内容。 | 不解析 provenance JSON，不推导或宽松补全 target closure。 |
| `legal-materials.ts` | 固定 exported material identities，并按下表依次组合两个模块。 | 不重新承接已拆出的 parser 或 audit 规则。 |

orchestrator 不建立泛化 parser wrapper；它依次调用以下七阶段。任一阶段抛出时，后续阶段不执行，因此同一 mutation 组合的可见失败是最先到达的阶段错误。

| 顺序 | 阶段 | 责任模块 |
| --- | --- | --- |
| 1 | 批准法律材料的固定字节 | packaged audit |
| 2 | provenance inventory 解析与固定 identity | provenance inventory |
| 3 | translated target closure 收集 | provenance inventory |
| 4 | 已登记 translated target 的 source/revision/SPDX header 与物理 license | packaged audit |
| 5 | 未登记 translated source header 拒绝 | packaged audit |
| 6 | deferred extension body 及其 emitted runtime body 缺席 | packaged audit |
| 7 | fixed-source notice 内容 | packaged audit |

### Resulting Impacts

- direct mutation view 只为审计阶段顺序提供证据，不能成为 package build fixture 或新增 candidate 路径；实体仍归入 `docs/testing/cases/repository-tooling.md` 的既有 package artifact material Case。
- staging/tar 与 installed caller 不改变异常映射：前两者直接抛出，installed wrapper 仅保留既有前缀。拆分不得改变错误文本、固定集合或调用顺序。
- 两个模块通过明确的输入/返回值边界协作；空结果、重复 target 的静默折叠或宽松 schema 不能替代现有 fail-closed 校验。

## Risks / Trade-offs

移动私有函数仍可能意外改变检查顺序、错误文本或冻结集合。以入口内显式的七次调用、移动而非改写 guards、以及逐阶段 mutation 断言降低该风险。direct test 从 workspace material 构造只读 package-file view；它不证明 artifact 物理路径，因此 staging/tar acceptance 继续保留。

## Open Questions

无。
