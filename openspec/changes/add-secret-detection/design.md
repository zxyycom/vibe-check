本临时且未审计的 design 目标是说明如何在共享 foundation 上实现不依赖秘密字节的 occurrence identity 与可阻断 coverage 的 secret detection。

## Context

当前 Product 只注册 file/function/duplicate 三个数值 capability，public config v1 与 machine v1 都是 closed/single-active contract。`introduce-content-quality-foundation` 将 descriptor registry、security finding、通用 channels/completeness/gate 与 machine v2 作为共同 owner；`add-file-policy-overrides` 将拥有 config v2 composition 和 file patch precedence。本 change 只补充 secret selector、detector、配置 slice、安全 identity 与验收。

Secret scanning 与普通 scanner 最大区别是 raw match 本身属于不得持久化的高敏输入。现有 raw artifact、process stderr、cache 与通用错误包装都必须默认视为不安全，不能在实现后再做字符串清理补救。

## Goals / Non-Goals

**Goals:**

- 让 quick/full 在 secret policy enabled 时扫描 normalized inventory 中所有批准文本，而不是按少量 extension allowlist。
- 在 detector 返回后立即建立 closed security finding，使下游模型从类型上无法取得 raw match。
- 让 acceptance、baseline comparison 与 gate 只依赖完全不消费 secret bytes 的 tool-neutral stable occurrence identity。
- 让 oversized 文本产生可阻断 coverage finding，并用 generic observations 让全部 input disposition 在 machine/human summary 可见。
- 对 skipped、no-input、successful classification/scanning 与 dependency/read/parse failure 建立可审计区分。

**Non-Goals:**

- 不承诺发现所有秘密，也不把 secret finding 描述为凭据确已有效。
- 不读取 Git history之外的远端 secret manager、CI vault、home credential或环境变量进行验证。
- 不提供自定义 detector command、任意 regex/rule scripting或在config中存储secret pattern。
- 不保留raw scanner artifacts，也不在首版启用secret result persistent cache。

## Decisions

### Decision 1: 依赖 change 先闭合共同 owner，本 change 只注册具体 capability

实现前必须审计 `introduce-content-quality-foundation` 的 final registry/FindingRecord/ObservationRecord/machine-v2 contract 与 `add-file-policy-overrides` 的 final config-v2/patch contract。通过后，本 change 只注册 `secret-detection` capability、两个 check IDs、三个 observation metric IDs、empty security evidence catalog、coverage typed evidence catalog和自己的 config fragment；catalog变化更新sorted canonical `semanticRegistryFingerprint` expected value、examples与validator fixtures，但不修改immutable machine schema bytes、通用 channel、completeness reducer、machine union或patch precedence。

备选是本 change 独立增加warning shape和config merge。那会形成第二个foundation与第二套config owner，故不采用。

### Decision 2: Optional section absence、disabled 与 no-input 分开

Config v2中的`checks.secrets`是Product-registered optional closed section。Selected file-backed v2省略时保持absent且`skipped`，loader不从neutral补值；section存在必须complete。Override只能patch selected base已声明section，不能从absent base构造。`maximumFileBytes`在所有schema/resolution surface固定为inclusive `1..67108864`；Product neutral/default与`init`显式写入`enabled: true`、1 MiB (`1048576`) limit和empty allowlist。Section存在但全部path disabled时`skipped`；quick/full请求enabled policy后却没有ordinary-file candidate时才`no-input`；gate不隐式改变请求状态。

备选是所有v2 document缺省开启。它会让完整file policy在升级binary后改变scope/cost，故不采用。另一个备选是neutral也disabled；这降低zero-config安全价值，故不采用。

### Decision 3: Size limit产生finding，non-text产生observation

Selector只考虑global inventory中的enabled ordinary files，然后用固定Product rule `secret-text-prefix-v1`分类。大小不超过resolved limit时才执行不超过limit bytes的bounded full read，再按完整bytes区分valid UTF-8/no-NUL scanned text与non-text。大小超过limit时classifier最多读取开头8192 bytes；prefix含NUL或完整可判定的invalid UTF-8 sequence必须归non-text，prefix边界处不完整sequence或未发现反证时必须保守归size-unscanned，绝不据prefix声称suffix是text。Detector只读取small scanned text，对oversized path执行zero reads。

Size-unscanned path产生stable `secret-scan-coverage` finding和size observation，因此all/changed/regressions gate不会把coverage gap当clean。Coverage content finding的closed evidence按顺序固定为required number `actualBytes`（不参与identity）与required number `maximumFileBytes`（参与identity）；security finding的evidence catalog为空。Non-text不blocking，但产生machine/human可聚合observation。三个disposition record都使用normalized project-relative path、path-local subject `{ kind: "file", identity: "file" }`，无location，并按path Unicode order后接scanned/non-text/size-unscanned metric order发布。Global excluded/generated/vendor path永远不能被override恢复；required stat/prefix/full-read/classification失败是capability failure。

备选是按extension列出“文本文件”。它会漏掉`.env.example`、templates和无extension配置，故不采用。为证明oversized suffix是UTF-8而全读会绕过resource limit；自动截断后扫描或只在summary计数也会制造不完整coverage，故都不采用。

### Decision 4: 首版使用distribution-owned detector boundary，不开放命令覆盖

Secret dependency slice只包含Product distribution能解析的detector/rule-bundle identity和bounded execution settings，不提供public或environment command/args。Adapter仍是独立边界，以便detector未来替换，但其result必须先映射为stable Product rules。

备选是直接暴露第三方命令或rule names。它违反tool-neutral config并允许native stdout/stderr泄露。另一个备选是把所有rules写成core逻辑；这会把dependency生命周期与quality orchestration混在一起，故不采用。

### Decision 5: Raw secret只存在于一个bounded in-memory敏感区

只有大小不超过resolved limit且full-read classification合格的file bytes才进入detector，并只在bounded memory中参与rule comparison；oversized classification prefix永不进入detector。Detector-to-normalizer handoff只包含rule、span以及已将所有detected spans替换为fixed marker的bounded structural context；不得携带raw match。Normalizer据此计算fingerprint/location/redacted message，然后释放source/match references。Sensitive path禁止调用通用raw writer、result cache、structured logger或直接error interpolation；所有dependency error先通过allowlisted fields的secret-safe sanitizer。

测试会给每个fixture假秘密分配唯一canary及prefix/suffix，并在stdout、stderr、artifacts、tmp、raw、cache和captured logs中全量搜索。仅检查最终machine JSON不足以证明这个边界。

备选是保存native output再在Output层redact。那会让cache、errors与crash logs在redaction之前已经泄露，故不采用。

### Decision 6: Fingerprint只标识structural occurrence

Fingerprint只从版本化domain separator、Product rule、normalized relative path、所有detected spans已替换为fixed marker的bounded structural context，以及同path/rule/context中的deterministic occurrence ordinal派生。Raw secret bytes不被hash、encode、比较或传入normalizer；line number也不参与。因而line movement与same occurrence secret rotation保持identity，新structural occurrence得到新identity。Machine只投影opaque fingerprint；message只含rule category与脱敏说明。

备选是hash secret value以识别rotation；它会形成低熵离线猜测oracle，故明确禁止。取舍是同一occurrence的value rotation不算code regression，但all/changed gate仍能看到当前finding；这比暴露value-derived identity更安全。

### Decision 7: Allowlist只做identity conjunction并隔离generic acceptance

每项allowlist要求reason以及fingerprint或pathGlob之一；optional checkId/rule只能缩小，所有字段按AND匹配。Matching在security/coverage finding建立后进行，因此matcher不看secret或file content。同occurrence rotation有意复用acceptance；new occurrence不复用。Per-file patch只改enabled/size，allowlist为base-only。Common `acceptedWarnings` 对`secret-detection`与`secret-scan-coverage`都由post-validation拒绝，不能让message/value matcher旁路安全边界。

备选包括secret regex、messageIncludes与prefix matcher。它们会把secret或detector措辞写进仓库，并在backend替换时漂移，故全部拒绝。

### Decision 8: Partial result永不进入channels

Current/baseline分别使用同一resolved policy。Successful result生成secret/coverage findings与current disposition observations；all/changed沿用foundation fields，regressions按safe occurrence/coverage fingerprint比较，accepted finding保留但不blocking。任一required read/classification、dependency、execution或normalization失败使whole capability failed并让gate not-evaluated，所有partial findings/observations丢弃。Oversized-only与non-text-only candidate set都已完成分类，因此是`succeeded`；只有requested且没有candidate才是`no-input`。

备选是“扫描到多少算多少”并输出warning。对secret gate而言这会把coverage gap误当作可信清洁结论，故不采用。

### Decision 9: Fixture只含synthetic canary，测试隔离host input

Tests建立isolated project copies、detector doubles与synthetic rule bundles；不遍历workspace root、home或ambient environment。Golden覆盖range endpoints、8192-byte prefix边界/截断UTF-8、oversized zero detector reads、rotation-stable/new-occurrence fingerprints、coverage typed evidence、安全allowlist、exact file subject与semantic ordering、non-text observations与machine/human aggregate。Case evidence同时覆盖semantic outcome与leak absence，并通过foundation generic machine validators/catalog验证，不新增secret schema。

备选是从真实repository采样。即使当前没有secret，该测试也会把未来developer credential变成不受控输入，故不采用。

## Risks / Trade-offs

- [Same occurrence的secret rotation不进入regressions] → all/changed仍显示当前finding；这是避免value-derived猜测oracle的明确安全取舍。
- [相同sanitized context的occurrence ordinal会受新增同类occurrence影响] → deterministic ordering与duplicate fixtures固定语义；变化只会保守地产生new regression，不暴露value。
- [1 MiB默认上限不扫描大文本] → 固定8192-byte prefix只可证明早期non-text，不能证明suffix；其余oversized path产生blocking coverage finding和machine/human disposition observation，file-backed policy可在64 MiB hard cap内提高上限。
- [UTF-16等文本被分类为invalid text] → 首版明确只批准UTF-8；coverage可见，未来encoding支持需独立contract。
- [Neutral开启增加scan成本] → bounded file size与detector execution；custom file-backed section可disabled或按file patch缩小。
- [Dependency误把source写入native error] → 不保存native streams，sanitizer只投影allowlisted metadata，failure fixture用canary验证。
- [Foundation/overlay并行contract漂移] → tasks 1.1在任何实现前逐字段审计；不通过则先修本change artifacts，不猜测适配。

## Migration Plan

1. 完成tasks 1.1，对foundation最终security variant、machine v2、config v2 optional-section与file-patch leaves做阻塞审计。
2. 在config v2 schema/default/init/example中注册complete optional secret section，证明absent不补neutral、override不构造absent section，并拒绝generic acceptance匹配两个secret-owned check IDs。
3. 先建立synthetic leak-canary、rotation/new-occurrence fingerprint、8192-byte prefix/full-read边界、coverage typed evidence与exact disposition observation order证据，再实现dependency/adapter和registry catalogs。
4. 仅通过common findings/observations/completeness/gate/machine v2接入输出，运行目标tests、test-evidence、docs/catalog drift和workspace required verification。
5. 发布前人工审阅所有可见/持久surface和dependency license/security。回滚应整体移除descriptor与v2 section；不得保留enabled policy却跳过scanner。

## Open Questions

无未回答开放问题；依赖artifacts的一致性仍必须由tasks 1.1阻塞审计确认，审计完成前不得实现。
