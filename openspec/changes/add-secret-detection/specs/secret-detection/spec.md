本临时且未审计的 delta spec 目标是定义不泄露秘密原文、覆盖缺口可阻断且可接入共享 machine v2 的 secret-detection 契约。

## Purpose

在 Vibe Check 批准的全部文本输入中发现疑似秘密，同时确保检测结果、覆盖缺口、失败、缓存和输出都不会再次暴露秘密原文。

## ADDED Requirements

### Requirement: Secret capability owns stable catalogs and explicit request states

Product registry SHALL 注册稳定 capability ID `secret-detection`、security check ID `secret-detection`、content check ID `secret-scan-coverage`，以及 current-only observation metric IDs `secret-input-scanned`、`secret-input-non-text-excluded` 与 `secret-input-size-unscanned`。这些 IDs、允许的 finding variants、observation unit `file`、subject kind `file`、empty security evidence catalog与coverage typed evidence catalog MUST 只注册进 foundation descriptor catalogs；注册 MUST 改变基于 sorted public capability/check/metric/evidence catalogs canonical SHA-256 的 `semanticRegistryFingerprint` expected value并同步canonical examples/validator fixtures，但本 feature MUST NOT 改变 immutable machine v2 schema bytes、DTO shape、serializer或validator结构。

Selected file-backed config v2 省略 `checks.secrets` 时，Product MUST 保持该 optional section absent、不得从 neutral contribution 补值，并将 capability 置为 `skipped`。Section 存在但 resolved base/per-file policy 对全部 candidate paths 都 `enabled = false` 时同样 MUST 为 `skipped`。Section 存在且至少一个 candidate path enabled 时，quick 与 full profile MUST 请求 capability；requested capability 在 global inventory 中没有任何 enabled ordinary-file candidate 时 MUST 为 `no-input`，且不得启动 detector。

#### Scenario: Missing section stays skipped without neutral merge

- **WHEN** selected file-backed v2 document 省略 `checks.secrets`，即使 producing Product 的 neutral contribution包含完整 secret section
- **THEN** resolved config保持section absent，capability为`skipped`
- **AND** loader与override都不补入neutral secret policy或启动detector

#### Scenario: Enabled request with no candidate is no-input

- **WHEN** complete secret section存在且enabled，但global inventory没有任何enabled ordinary-file candidate
- **THEN** quick/full secret capability为`no-input`
- **AND** Product不把它表示为`skipped`、`succeeded`或clean detector result

#### Scenario: Catalog extension preserves machine v2 ownership

- **WHEN** Product注册secret capability、check、observation metric IDs与empty/coverage evidence catalogs
- **THEN** foundation-owned generic v2 finding/observation/capability structures承载结果
- **AND** expected semanticRegistryFingerprint/examples随catalog更新，feature不增加secret-specific transport field、schema identity或第二条serializer

### Requirement: Secret detection scans all approved text and exposes every coverage disposition

Secret descriptor MUST 从 normalized global inventory 中选择 resolved per-file policy enabled 的普通文件作为 capability candidates，而不按 Markdown、source-code或其它少量extension allowlist缩小集合。Global include、exclude directory与generated-file规则 MUST 先于selector；被global policy排除的generated/vendor path不能由secret section或override恢复。Current、baseline与Git-failure fallback MUST 使用同一invocation-owned policy、path normalization与classification semantics。

Runner MUST 使用Product-owned fixed `secret-text-prefix-v1` classification rule将candidate确定性分类为：(a) 不超过resolved `maximumFileBytes`，bounded full read后证明为有效UTF-8且无NUL的scanned text；(b) 文件大小超过limit、bounded prefix没有证明non-text的size-unscanned candidate；或(c) NUL/definitive invalid-UTF-8 non-text exclusion。`maximumFileBytes` MUST在`1..67108864`范围内。对大小不超过limit的input，runner才可执行不超过limit bytes的bounded full read并据完整bytes选择(a)或(c)。对大小超过limit的input，classifier MUST只读取开头至多8192 bytes：prefix中出现NUL或完整可判定的invalid UTF-8 sequence时 MUST选择(c)；prefix在边界处结束的incomplete UTF-8 sequence不得单独证明invalid；其它情况 MUST保守选择(b)，不得声称后续未读bytes是text。Detector MUST只读取并处理(a)，对(b)/(c)均执行zero reads；尤其不得为了分类oversized input而执行full-content或secret scan。

每个(b) path MUST产生一个`kind = content`、check ID/finding code均为`secret-scan-coverage`的stable finding，明确该path未进行secret scan并给出提高limit、缩小scope或安全allowlist的动作。(c)不产生blocking finding，但必须作为non-text exclusion观察。Required stat、bounded prefix/full read或classification失败 MUST使capability failed，不能降级为exclusion或zero findings。

每个成功capability result MUST为每个candidate恰好产生一个disposition observation：对应(a)/(c)/(b)分别使用`secret-input-scanned`、`secret-input-non-text-excluded`、`secret-input-size-unscanned`，均为value `1`、unit `file`。每条record的`path` MUST是normalized project-relative path，subject MUST精确为`{ kind: "file", identity: "file" }`且不得包含location或line-derived label；因此完整subject identity由record path加path-local `file`构成。Observation semantic order MUST先按normalized path的Unicode code-point order，再按固定metric order `secret-input-scanned`、`secret-input-non-text-excluded`、`secret-input-size-unscanned`。Machine v2与human report/console SHALL只从这些generic observations呈现counts，并从coverage findings呈现可阻断缺口。所有oversized candidate均落入(b)或(c)；其中(b)-only input set MUST `succeeded`且包含coverage findings，而不是`no-input`或clean zero finding；候选全部为(c)时 MUST `succeeded`且以observations显示exclusion。

#### Scenario: Non-Markdown text is scanned

- **WHEN** normalized inventory含受支持大小的UTF-8 source、JSON、YAML、`.env.example`与Markdown，且resolved secret policy对它们enabled
- **THEN** detector exact inputs包含全部这些批准文本path
- **AND** selection不按Markdown或source extension缩小集合

#### Scenario: Global exclusion cannot be restored

- **WHEN** vendor或generated file已被selected global scope policy从normalized inventory排除
- **THEN** secret selector与per-file override都不能重新加入该path
- **AND** current、baseline与Git-failure fallback保持相同结果

#### Scenario: Oversized input uses only a conservative bounded prefix

- **WHEN** enabled candidate超过resolved `maximumFileBytes`，其前8192 bytes没有NUL或definitive invalid UTF-8
- **THEN** classifier最多读取该prefix并保守标为size-unscanned，detector对该path执行zero reads
- **AND** Product不声称未读suffix为text，并产生`secret-scan-coverage` finding及`secret-input-size-unscanned` observation，使未接受finding可阻断适用gate

#### Scenario: Oversized prefix can establish non-text without a full read

- **WHEN** enabled oversized candidate的bounded prefix包含NUL或完整可判定的invalid UTF-8 sequence
- **THEN** classifier最多读取8192 bytes并标为non-text，detector执行zero reads
- **AND** Product产生`secret-input-non-text-excluded` observation但不产生coverage finding，也不读取suffix证明其余内容

#### Scenario: Non-text exclusion remains observable but non-blocking

- **WHEN** enabled candidates中包含NUL/bad-UTF-8 input与一个合格文本
- **THEN** non-text path不进入detector并产生`secret-input-non-text-excluded` observation，合格文本被完整扫描
- **AND** machine/human coverage summary可区分non-text exclusion与scanned/size-unscanned disposition

#### Scenario: Candidate cannot be read or classified

- **WHEN** capability candidate无法完成required stat/read/classification work
- **THEN** capability result为failed execution diagnostic
- **AND** 任何partial findings与observations都不进入published channels或summary

### Requirement: Security occurrence fingerprints never consume detected secret bytes

每个成功secret match SHALL 投影为foundation closed `kind = security` finding，且 MUST 只包含稳定Product rule、opaque occurrence fingerprint、project-relative path、精确location与脱敏message；`secret-detection` descriptor MUST声明empty ordered evidence catalog，record的`evidence` MUST为空，并且secret variant MUST NOT投影suggestion或其它check-specific evidence field。

Occurrence fingerprint MUST 完全不消费、hash、encode或比较detected secret bytes。Normalizer SHALL 使用versioned domain separator、Product rule、normalized relative path、把同一bounded structural context中所有detected secret spans替换为固定marker后的sanitized context，以及该path/rule/context内的deterministic occurrence ordinal派生fingerprint；line number与raw secret value MUST NOT 参与。Line-only移动与same occurrence的secret rotation MUST 保持fingerprint稳定；新增structural occurrence MUST 得到新fingerprint。Coverage finding fingerprint MUST只使用coverage check ID、normalized path与effective `maximumFileBytes` policy identity；它不得读取file content，也不得使用`actualBytes`。

Raw source与match bytes MAY 只在bounded detector内存边界中用于rule comparison；它们 MUST NOT 越过detector-to-normalizer handoff，也 MUST NOT 成为fingerprint input。Detector、adapter、Core与Output MUST NOT 将raw match、source excerpt或native output写入console、stderr、error、stack/trace、report、machine artifacts、streams、raw artifacts、cache、temporary config或persistent logs。Persistent secret result cache MUST 保持disabled；normalized finding建立后必须释放raw references。

#### Scenario: Secret rotation keeps the same safe occurrence identity

- **WHEN** baseline与current中同一rule/path/sanitized structural occurrence只替换了secret value，且line可同时移动
- **THEN** 两侧security finding fingerprint相同
- **AND** fingerprint generation从未读取secret value作为digest/input材料，rotation不制造regression

#### Scenario: New occurrence gets a new fingerprint

- **WHEN** current在同一路径新增一个独立secret structural occurrence
- **THEN** deterministic occurrence identity与baseline不同并产生新fingerprint
- **AND** fingerprint仍不包含或依赖新增secret bytes

#### Scenario: Finding and error surfaces are redacted

- **WHEN** synthetic detector命中唯一假秘密，随后正常完成或发生execution/invalid-result failure
- **THEN** success finding只保留safe occurrence identity，failure diagnostic只保留capability、kind与action
- **AND** console、stderr、artifacts、cache、temporary files与logs的byte search均找不到假秘密或其prefix/suffix

### Requirement: Secret coverage evidence is closed, typed and non-sensitive

`secret-scan-coverage` descriptor SHALL注册以下唯一allowed evidence catalog，且finding MUST按表中顺序投影两个entries；unknown、missing、wrong-kind或out-of-order evidence MUST成为`invalid-result`：

| Order | Key | Kind | Required | Identity participation | Redaction |
| --- | --- | --- | --- | --- | --- |
| 1 | `actualBytes` | `number` | yes | no | `none`（non-sensitive integer metadata） |
| 2 | `maximumFileBytes` | `number` | yes | yes | `none`（public policy integer） |

`actualBytes` MUST是stat得到的non-negative safe integer file size，`maximumFileBytes` MUST是本次path的resolved `1..67108864` policy value；两者都不得由source bytes、secret match或message parsing派生。Coverage record MUST为`kind = content`且exact finding code `secret-scan-coverage`。Message只用于人读说明，不得成为consumer恢复大小或policy的必需语义源。`secret-detection` security finding仍使用empty evidence catalog；两个catalog都进入producing registry canonical projection并更新expected `semanticRegistryFingerprint`，但不得改变immutable machine v2 schema bytes。

#### Scenario: Coverage evidence is complete without exposing content

- **WHEN** 10 MiB candidate在resolved 1 MiB policy下落入size-unscanned disposition
- **THEN** coverage finding按顺序包含number evidence `actualBytes = 10485760`与`maximumFileBytes = 1048576`
- **AND** fingerprint只让maximum policy参与identity，record没有source excerpt、secret bytes、backend field或message-derived machine semantics

### Requirement: Secret allowlist uses only safe semantic identity

Secret acceptance SHALL 在normalized secret或coverage finding建立后按config v2 allowlist匹配。每个entry MUST 包含non-empty `reason`，并至少包含exact `fingerprint`或project-relative `pathGlob`；optional `checkId`与Product `rule`只可进一步缩小匹配，所有supplied selectors MUST conjunctively match。Schema MUST 拒绝只有check/rule的global entry，以及secret value、substring、regex、prefix/suffix、source excerpt、message matcher或backend identity field。

匹配成功 MUST 保留finding、fingerprint、variant、channel membership与ordering，只增加acceptance reason并从blocking set排除。Safe occurrence fingerprint acceptance SHALL 有意覆盖同一occurrence的secret rotation；new occurrence仍需独立acceptance。`secret-scan-coverage` finding MUST 可按自身fingerprint或pathGlob安全处理。Common `acceptedWarnings` MUST 拒绝`secret-detection`与`secret-scan-coverage`两个check IDs，不能绕过专用allowlist。

#### Scenario: Fingerprint acceptance survives value rotation without storing value

- **WHEN** allowlist exact fingerprint匹配同一structural occurrence，且secret value已rotation
- **THEN** finding保持可见并带non-empty acceptance reason，gate不将其计入blocking set
- **AND** config、matcher与artifacts都不需要secret text才能复现acceptance

#### Scenario: Coverage finding uses a safe allowlist

- **WHEN** intentionally unscanned oversized fixture按coverage fingerprint或pathGlob配置reason
- **THEN** coverage finding保持可见且accepted，不再blocking
- **AND** allowlist不读取fixture content或使用message/value matcher

#### Scenario: Unsafe matcher is rejected

- **WHEN** config尝试用secret value、substring、regex、messageIncludes或只有check/rule的entry接受finding
- **THEN** config v2 validation在scan work前拒绝document
- **AND** detector、cache与artifact work均不启动

### Requirement: Secret comparison and gates use occurrence and coverage identity

`all` SHALL 包含全部current security与coverage findings；`changed` SHALL 只包含source path位于resolved changed scope的current findings并保持`all`中的相对顺序。只有调用者提供有效显式baseline时，Product才可在两侧使用同一resolved secret policy与selector，并对已经属于`changed`的current findings按exact safe fingerprint匹配comparable baseline findings。Current fingerprint不存在于baseline时才进入`regressions`；`regressions` MUST是`changed`的order-preserving subsequence。Line-only relocation或same occurrence secret rotation不得制造regression。没有有效baseline时 MUST NOT 伪造secret或coverage regression。

Gate SHALL 复用foundation selected final channel与专用safe acceptance：未接受的secret和coverage findings均可blocking。Detector unavailable、candidate read/classification、execution或normalized-result failure MUST 使capability与overall completeness failed、requested gate not-evaluated，并丢弃partial findings/observations。Requested capability没有enabled ordinary-file candidate才是`no-input`；successful classification/scanning即使zero secret findings或只有non-text observations仍是`succeeded`。

#### Scenario: New occurrence or coverage gap is a regression

- **WHEN** explicit baseline/current均完整，current出现baseline不含的新secret occurrence或新size-unscanned path fingerprint，且其source path命中resolved changed scope
- **THEN** finding进入`all`与`changed`，并按原顺序进入`regressions`
- **AND** regressions gate只在finding未被safe allowlist接受时阻断

#### Scenario: Rotation and line movement are not regressions

- **WHEN** current与baseline存在相同safe occurrence fingerprint，但secret value或前置行发生变化
- **THEN** current security finding保留在`all`且不进入`regressions`
- **AND** fingerprint不依赖raw value或line number

#### Scenario: Detector failure prevents a trustworthy gate

- **WHEN** secret capability有candidate但dependency unavailable、execution failure或normalized result invalid
- **THEN** capability failed、overall completeness failed、requested gate not-evaluated
- **AND** 产品不发布“未发现秘密”、partial coverage summary或evaluated gate结论
