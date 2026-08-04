本临时且未审计的 delta spec 目标是注册complete、tool-neutral的optional network policy，并固定absent/skipped与override授权边界。

## ADDED Requirements

### Requirement: Config v2 requires explicit bounded online policy

Public semantic config v2 SHALL允许Product-registered optional closed `checks.networkLinks` section。Selected file-backed document省略section MUST保持absent、capability `skipped`，loader不得从neutral contribution补值。Section存在时 MUST是complete closed base object，精确包含boolean `enabled`、base-only `mode`（`disabled | online`）、positive integer `requestTimeoutMs`、positive integer `totalTimeoutMs`、positive integer `maximumConcurrentRequests`、non-negative integer `maximumRedirects`、non-negative integer `maximumRetries`与non-negative integer `cacheTtlSeconds`，且`totalTimeoutMs >= requestTimeoutMs`；不得接受partial base。这些fields表达Product egress policy而非dependency setting。Public materials不得包含client、command/args、proxy、credential、cookie、custom auth header或backend identity。

V2 neutral/default contribution SHALL materialize`enabled: false`、`mode: disabled`、`requestTimeoutMs: 5000`、`totalTimeoutMs: 15000`、`maximumConcurrentRequests: 4`、`maximumRedirects: 5`、`maximumRetries: 1`与`cacheTtlSeconds: 3600`；它只参与neutral/init composition，不补入selected file-backed config。Fragment metadata将`mode`标记base-only，将`enabled`与numeric fields标记overrideable。Override只能patch selected base已声明的complete network section；base absent时尝试构造section必须pre-work失败。Base online时patch可选择source并改变schema-bounded leaves，scheduler对active candidates用最小concurrency；patch不能把base disabled改为online、增加proxy/auth或恢复global scope。Config v1按single-active v2 contract拒绝。

Resolver MUST为每个active source构造readonly complete effective request-policy projection：resolved `requestTimeoutMs`、`totalTimeoutMs`、`maximumRedirects`、`maximumRetries`、`cacheTtlSeconds`及network capability注册的Product policy version。该projection与exact request URL共同形成invocation dedup/cache policy identity；任一leaf不同的per-file policies不得共享network outcome。`maximumConcurrentRequests`只参与invocation scheduler，scheduler取全部active source policies的最小值，不进入per-request terminal identity；`enabled`与base-only `mode`只决定eligibility/authorization。

#### Scenario: Default is offline with deterministic budgets

- **WHEN** invocation使用config v2 neutral default
- **THEN**network enabled为false、mode为disabled且所有bounded policy leaves具有canonical values
- **AND**scan不因 gate、profile或Markdown external candidate自动访问网络

#### Scenario: Invalid or tool-shaped network policy fails pre-work

- **WHEN** config使用unknown mode、invalid numeric relationship、proxy/auth/client/command field或unknown nested field
- **THEN**embedded runtime schema/post-validation在DNS、socket、cache refresh与artifact work前拒绝document
- **AND**diagnostic只标识semantic field path与修复要求

#### Scenario: File patch only narrows an authorized online policy

- **WHEN**global mode online且source path匹配有效per-file patch
- **THEN**base online authorization保持不变，patch可选择/禁用该path并产生typed bounded leaves；scheduler对active candidates采用最小resolved concurrency
- **AND**global disabled时任何patch都不能触发network activity

#### Scenario: Effective request policies isolate equal URLs

- **WHEN**两个active source指向同一exact request URL，但per-file patch使timeout、redirect、retry或TTL任一resolved leaf不同
- **THEN**resolver产生不同complete request-policy projections，network work与cache outcome不得共享
- **AND**scheduler仍只按全部active policies最小resolved concurrency限制两个独立work

#### Scenario: Override cannot construct an absent network section

- **WHEN** selected file-backed v2 base省略`checks.networkLinks`，但override尝试patchenabled或budget leaf
- **THEN** config semantic validation在DNS/cache/artifact work前拒绝override
- **AND** resolver不从neutral contribution创建partial或complete network section
