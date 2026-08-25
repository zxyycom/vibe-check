# Markdown Link Validation 库策略与可实施难度

## 调查信息
- 核心问题: Vibe Check 的离线 Markdown Link Validation 应采用何种第三方库策略，能否在既定本机目标、安全、范围与 GitHub-priority anchor 边界内以可控难度实施？
- 状态: 调查中
- 最新报告时间: 2026-08-25T02:35:35Z

## 调查报告

### 离线 Link Check 的 parser、slug 与完整 validator 候选比较
- 形成时间: 2026-08-25T02:35:35Z

#### 形成时背景

`changes/add-markdown-link-validation/` 正在为 TypeScript/Bun Product 规划 `markdownLinkValidation` ordinary Check；截至本报告形成时，尚未实现、未向 `package.json` 或 lockfile 加入 Markdown 依赖。工作区基线为 Git commit `36bdeea01add43b8044bb6431d030315384ce086`，但本 Change 的 proposal/design 和 `docs/decisions/define-offline-markdown-link-target-boundaries.md` 有未提交改动（Decision 当时为未跟踪文件）；本报告的产品边界以实际读取到的这些形成时材料为准，而不把它们表述为已发布实现。

已确认的约束是：Link 是 Product-provided ordinary Check；source 只能来自 global exact scope；source 明确指向的 direct target 可以在 source scope 外，project root 外本机路径必须由 Link-owned `ignore | report | validate` switch 控制。实现必须是本机离线的：不得产生 Product-owned HTTP/DNS/TLS/redirect/retry；UNC、protocol-relative 与带 remote authority 的 `file:` 必须分类后停止。目录的 existence 与 non-empty policy 分离，symlink/realpath escape、安全输出、GitHub-priority GFM-like anchor、front matter、occurrence source range 和 reference/image 都是首版不能遗漏的边界。`src/index.ts` 是正式 Product API，不能把 repository 的 `scripts/**` validator、CLI 或 crawler 当作实现依赖。

本报告只调查库选择与实施可行性；不固定最终 public option 名、Record DTO、limits 或 GitHub edge corpus，也不授权安装依赖、修改 Change/Decision/代码/测试或网络验证功能。

#### 调查目的

回答下列问题，并把事实、推断与尚未采用的决定分开：

1. `remark-validate-links` 能否作为接近完整的现成 validator，还是它的 Git/CLI/安全模型与本 Change 冲突？
2. 低层 `mdast-util-from-markdown` + micromark GFM/frontmatter extensions + mdast utilities + `github-slugger`、高层 unified/remark、以及 `markdown-it` 中，哪一层能以最小适配代码保留本 Change 所需的 occurrence/reference/image/source range/front matter/anchor 输入？
3. parser/slug 和 Link-owned resolver 的组合是否能在 Bun 中实施，而不把 filesystem policy、Git discovery、child process、网络或递归 crawling 交给依赖？
4. 在一致口径下比较热度、生态、维护活跃度、许可证与依赖足迹；这些信号能否支持维护风险判断而不是伪造精确排名？

#### 调查范围与依据

**项目事实。** 读取了本 Change 的 [`proposal.md`](../../../changes/add-markdown-link-validation/proposal.md)、[`design.md`](../../../changes/add-markdown-link-validation/design.md) 及活动 Decision [`define-offline-markdown-link-target-boundaries.md`](../../decisions/define-offline-markdown-link-target-boundaries.md)。它们是本报告对安全/功能适配的主依据；现有 `scripts/validation/links.ts` 只作为该 Change 已明确排除的 repository-local 对照，不作为候选实现。

**候选与版本。** 于 2026-08-25（UTC）查询 npm registry：`remark-validate-links@13.1.0`、`mdast-util-from-markdown@2.0.3`、`micromark-extension-gfm@3.0.0`、`mdast-util-gfm@3.1.0`、`micromark-extension-frontmatter@2.0.0`、`mdast-util-frontmatter@2.0.1`、`github-slugger@2.0.0`、`unified@11.0.5`、`remark-parse@11.0.0`、`remark-gfm@4.0.1`、`remark-frontmatter@5.0.0`、`markdown-it@15.0.0`、`markdown-link-check@3.15.0` 与 `linkinator@8.0.4` 的 package metadata。版本、许可证和直接 runtime dependency 以对应 [npm registry metadata](https://registry.npmjs.org/remark-validate-links/13.1.0)（其他候选同样以 `https://registry.npmjs.org/<package>/<version>` 查询）为事实来源；registry manifest 只证明发布者声明，**并未**完成全部传递依赖的 license/security audit。

**Bun 最小实验。** 在仓库外 `mktemp` 目录创建独立 ESM package，以 `npm install --ignore-scripts --no-audit --no-fund --package-lock=false` 安装；每个临时目录在退出时删除，仓库依赖和 lockfile 未改。使用 Bun `1.3.14` 解析同一 fixture：YAML front matter、两个重复 `# Hello, World!` headings、inline link、image、已定义 reference、未定义 `[unresolved][missing]`、`<https:…>` autolink、GFM bare `www…`、code span 和 definition。低层与高层栈均对语义 occurrence 返回带 line/column/offset 的 `yaml`、`heading`、`link`、`image`、`linkReference`、`definition` 节点；其中已定义 reference 产生 `linkReference` 与 `definition`，未定义 reference 则是 `text`，不产生语义 link/reference occurrence。`github-slugger` 对重复 heading 依次返回 `hello-world`、`hello-world-1`。`markdown-it` 返回 link/image token 和已解析 reference destination，但 inline token 的 `map` 是 line 区间（本 fixture 的连续段为 `[5,12]`），没有同等精确的 occurrence column/offset。`markdown-link-check` 与 `linkinator` 均能被 Bun import；这只证明 import，不证明爬取正确或安全。

独立复核了先前的两个不完整说法。第一，低层 stack 的 AST 证据成立，但只对上面的 versions/fixture/Bun 版本成立，不能外推为所有 Markdown dialect 或未来 Bun 版本。第二，`<https:…>` 与 GFM bare URL 都被解析为 `link`；`<a href="…">` 被解析为 `html` 节点而非 link。因此“未配置 `gfmHtml`”不能作为 HTML autolink 已被支持的证据；本 Change 明确排除 HTML attributes，故不需要以 HTML 作为 required occurrence，但仍须 fixture 固定忽略它。

对 `remark-validate-links` 的 API 又作了独立运行：在无 Git 临时目录执行其 unified transformer，Bun 实际报错 `git remote -v` 失败。其[官方 README](https://github.com/remarkjs/remark-validate-links#api)同时说明 Node API 不检查“other markdown files”的 headings、完整跨文件检查依赖 CLI；其 [Node adapter source](https://github.com/remarkjs/remark-validate-links/blob/main/lib/find-repo.node.js) 直接导入 `node:child_process` 并执行 `git remote -v` / `git rev-parse`。这比仅看包名或依赖表更强地证明其默认行为越过本 Change 边界。

**可比指标（观察日均为 2026-08-25 UTC）。**

- **采用度**：统一用 npm downloads API 的 `last-month` endpoint；本次响应窗口是 **2026-07-25 至 2026-08-23（30 日）**，单位是 downloads，不等于独立用户、生产安装或本 Change 的适配度。为避免把一个 stack 的多个包相加，低层取入口 `mdast-util-from-markdown`，高层取入口 `remark-parse`，其它取候选 package 本身。[API 定义/结果链接](https://api.npmjs.org/downloads/point/last-month/remark-validate-links)。
- **GitHub 社区信号**：同一观察日读取各官方 repository API 的 `stargazers_count`、`forks_count`、`open_issues_count`；stars/forks 是累积社区可见度，不能衡量质量、Bun 支持或安全。例：[remark validator](https://api.github.com/repos/remarkjs/remark-validate-links)、[mdast parser](https://api.github.com/repos/syntax-tree/mdast-util-from-markdown)、[unified](https://api.github.com/repos/unifiedjs/unified)、[markdown-it](https://api.github.com/repos/markdown-it/markdown-it)、[markdown-link-check](https://api.github.com/repos/tcort/markdown-link-check)、[Linkinator](https://api.github.com/repos/JustinBeckwith/linkinator)。
- **维护近期性**：同一 API 的 `pushed_at` 和 release endpoint 的 `published_at`，不是 issue 被动活动。查询到的 release/tag 链接见 [mdast 2.0.3](https://github.com/syntax-tree/mdast-util-from-markdown/releases/tag/2.0.3)、[remark validator 13.1.0](https://github.com/remarkjs/remark-validate-links/releases/tag/13.1.0)、[remark-gfm 4.0.1](https://github.com/remarkjs/remark-gfm/releases/tag/4.0.1)、[markdown-link-check v3.15.0](https://github.com/tcort/markdown-link-check/releases/tag/v3.15.0)、[Linkinator v8.0.4](https://github.com/JustinBeckwith/linkinator/releases/tag/linkinator-v8.0.4)。没有 release JSON 的 `markdown-it` 不据此作负面推断，只记录其 repository `pushed_at`。

#### 调查结果与边界

##### 已确认事实：功能与边界适配

| 候选 | occurrence / reference / image / source range | front matter 与 GitHub anchor | cross-file target 与 resolver 所需行为 | Git/child process/network/crawl 边界 | 结论 |
| --- | --- | --- | --- | --- | --- |
| **`remark-validate-links`** | 其 README 声明检查 links 与 images、local files/headings；未定义 references 明确“不检查”。VFile messages 有 source location，但它交付的是自身诊断，不是 Link-owned occurrence model。 | 使用 `github-slugger`；同文 anchor 能查。Node API **不查跨 Markdown 文件 heading**，CLI 才能完成。front matter 不构成本 Change 所需的明确控制面。 | 有 Git-root/repository/skip patterns 的自身路径模型，不能表达 source-global-exact 与 root-external `ignore/report/validate`、symlink safe output、direct-only read、目录 non-empty/anchor 禁止。 | 默认 Git discovery 使用 child process；包实现读本机 files，CLI/unified-engine 完整模式参与 file set；不做 external URL check，但 Git/CLI 已违反 Product 约束。 | **不采用为完整 validator。** 它是有价值的反例与语义对照，不是可封装的 resolver。 |
| **低层 mdast + micromark extensions + `github-slugger`** | AST 明确保留 inline `link`、`image`、已定义 reference 的 `linkReference`/`definition`、heading 和 range；未定义 reference 解析为 `text`，不形成 Link occurrence，不能按原文重取。Link 需要把 reference identifier 映射 definition，并从 AST/node/range 生成私有 facts。 | 通过 frontmatter extension 产生 `yaml`，不会把 YAML 当 heading；`github-slugger` 能给重复 heading stable suffix。它是 GitHub-style slug implementation，不是完整 GitHub renderer oracle，Product 仍要 fixture 固定 dialect。 | 只做 bytes → AST；没有 target resolver。正好让 Link 自己实现 lexical decode/classify、lstat/realpath、one-hop direct reads、directory one-entry check、root-external switch 和安全 Record projection。 | 实验只解析内存 bytes；direct packages 没有 Git discovery/crawler API。不能据此证明未来所有版本绝无 I/O，故 resolver 层仍要以 tests 防 network/recursion。 | **最适配。** 最小 AST adapter + Link-owned resolver，保留所有本 Change 的责任边界。 |
| **高层 `unified` + `remark-parse`/GFM/frontmatter** | 本实验得到与低层相同类别及精确位置 AST；仍需要 visitor/reference-resolution/occurrence projection。unified pipeline 给插件组合、VFile 与转换生态，但这项 Check 暂无需要共享 pipeline 的消费者。 | `remark-gfm`、`remark-frontmatter` 覆盖 GFM/frontmatter；slug 仍需 `github-slugger` 或自有实现。 | 同样不提供受控 resolver；用它不减少 root/symlink/directory/security 输出工作。 | 本次解析未触发 Git/child process/network；但 pipeline 比低层多抽象、更多 package surface。 | **可行但不优先。** 若后续真需要 remark transforms 才再选；现在是无收益的上层依赖。 |
| **`markdown-it`（加插件/自定义适配）** | inline link/image 和定义已解析 reference 可用，但未定义 reference 在本实验成为 text；token line map 不能单独定位每个 occurrence column/offset，需要自己重扫 source。 | 无 front matter 时把 YAML content 解释为 Markdown heading；需另加 frontmatter plugin/规则。heading IDs 通常由 renderer/plugin 提供，仍需锁定 GitHub slug。 | 只提供 tokenization；resolver 与安全控制都得自写。 | 单纯 parser 没有 crawler；但为取得 required range、frontmatter 与 exact dialect需额外适配/插件；若未来要处理未定义 reference，必须另定 parser 语义，不能重扫原文冒充 occurrence。 | **不推荐首版。** 热度高不抵消关键事实丢失和适配负担。 |
| **`markdown-link-check` / Linkinator** | 目标是 link checking/crawling，而非暴露 Check-owned Markdown occurrence facts；本调查未验证它们的每种 Markdown/anchor语义，不能把名称当能力证明。 | Linkinator 依赖 `marked` / `marked-gfm-heading-id`，但这不等于 GitHub corpus、source range 或 local safe resolver contract。 | 独立 CLI/crawler 语义与本 Change 的 direct-only target read 相反；不能保留 source scope 与 root-external mode 的所有权。 | `markdown-link-check` 直接依赖 `link-check`、`needle`、`proxy-agent`、`commander`；Linkinator 直接依赖 `glob`、`undici`、`meow`，显示 HTTP/proxy/recursive file discovery/CLI 产品取向。 | **只作不适合离线 Product 的反例；不采用。** Bun import 成功不改变网络与 crawling 风险。 |

这里“低层 package 无 Git/network API”是针对查询到的 package interface、manifest 和最小 parse 调用的有限事实；不是对传递依赖源代码的安全证明。最终 implementation 必须以 source scan、fixture 和 runtime canary 证明零 Product-owned network、无 child process、无 recursive discovery，不能以依赖品牌替代验证。

##### 已确认事实：依赖、许可证、Bun 与维护信号

下表的“tree entries”是上述临时、忽略 install scripts、无 lockfile安装后 `npm ls --all --parseable` 的行数，**包含临时 root**，仅用于同一实验条件下的近似传递图规模，不是去重 package 数、bundle size、漏洞数或生产 lockfile 结论。直接依赖是本次为 fixture 显式指定或 package manifest 声明的 runtime dependencies。

| 候选（代表性组合） | registry 许可证与直接依赖表 | 临时 tree entries | Bun 1.3.14 证据 | 30 日 npm downloads；GitHub 信号；维护近期性 |
| --- | --- | ---: | --- | --- |
| `remark-validate-links@13.1.0` | **MIT**；自身 11 项 direct runtime deps（含 `hosted-git-info`、`unified-engine`、`mdast-util-to-hast`、`github-slugger`、`vfile`）。调用方还需 unified/remark parser。 | 167 | ESM 可加载；实际 transformer 在默认 Git discovery 失败，证明 Bun 能走到其 Node child-process path，而非适配。 | 475,858；126 stars / 25 forks / 1 open issue；latest 13.1.0 发布 2025-02-21、repo `pushed_at` 同日。采用度远低于 parser entrance，不单独表示不安全。 |
| 低层六包组合（from-markdown、GFM + frontmatter 两侧 extensions、slugger） | parser/extensions **MIT**；`github-slugger` **ISC**。`mdast-util-from-markdown` 自身 11 项 direct deps，GFM bundle 又带多个 GFM 及 markdown stringify utilities；可在 API 选定后评估是否避免不需要的 bundle 成员。 | 64 | 成功解析 fixture，全部所需 AST categories 与 positions 可读；slug duplicate suffix 成功。 | `mdast-util-from-markdown` 196,823,272；repo 289 stars / 24 forks / 4 open issues；2.0.3 发布 2026-02-21，repo `pushed_at` 2026-06-03。`github-slugger` 56,044,298 downloads、411 stars，但 2.0.0 发布/推送在 2022/2023；它是维护风险需 fixture 锁定的独立依赖。 |
| 高层六包组合（unified/remark parse/GFM/frontmatter/slugger） | 除 slugger ISC 外均 **MIT**；`unified` 7 项、`remark-parse` 4 项、`remark-gfm` 6 项、`remark-frontmatter` 4 项 direct runtime deps，且与低层重叠。 | 75 | 成功产生同等 position AST。 | `remark-parse` 190,549,912；unified repo 5,023 stars / 129 forks / 1 open issue（11.0.5 2024-06-19），remark ecosystem repo 8,983 stars / 384 forks；`remark-gfm` 143,488,948 downloads且4.0.1于2025-02-10发布。此为生态广度，不证明本 Change 应承受其额外抽象。 |
| `markdown-it@15.0.0` | **MIT**；6 项 direct runtime deps（`linkify-it`、`mdurl`、`entities`等），frontmatter/heading-id 要另选插件或自定义。 | 8 | import 与 fixture token parse 成功。 | 111,454,077；21,840 stars / 1,848 forks / 13 open issues；repo `pushed_at` 2026-08-13，npm 15.0.0于2026-07-30修改。社区信号最强，不代表 range/frontmatter/reference 适配最小。 |
| `markdown-link-check@3.15.0` | **ISC**；9 项 direct runtime deps，含 `link-check`、`needle`、`proxy-agent`、`commander`。 | 74 | import 成功；不运行网络 check。 | 811,772；712 stars / 138 forks / 14 open issues；v3.15.0发布 2026-07-28。近期性不抵消 HTTP/proxy/CLI 取向。 |
| `linkinator@8.0.4` | **MIT**；10 项 direct runtime deps，含 `glob`、`undici`、`meow`、`marked`。 | 24 | import 成功；不执行 scan/request。 | 672,591；1,253 stars / 109 forks / 10 open issues；v8.0.4发布 2026-08-17、repo `pushed_at` 2026-08-24。活跃 crawler 仍是本 Change 的反向需求。 |

指标数字均来自本节声明口径的 [npm downloads API](https://api.npmjs.org/downloads/point/last-month/mdast-util-from-markdown) 和官方 GitHub API；不同 package 的 download 不能相加，也不能与 stars/forks 合成排名。生态扩展性以实现模型定性判断：unified/remark 的插件生态最大且直接支持 mdast transforms；micromark/mdast 是其较低层语法生态，足够覆盖当前受控 adapter；markdown-it 有大型 renderer/plugin 生态但使本 Change 必需语义落到适配层；crawler 的生态主要扩展网络/CLI 能力，正是应隔离的能力。

##### 推断与推荐

**推荐（尚未采用的决定）：选择“现成 parser/slug + Link-owned resolver”，首选低层 `mdast-util-from-markdown`、GFM/frontmatter 解析 extensions、对应 mdast extensions 与 `github-slugger`；不要采用 `remark-validate-links` 作为现成完整 validator。**

推断链条如下。

1. Link 的难点不是把 Markdown 变成 AST，而是受约束的 **target authorization/resolution**：source exact scope 不扩大、decode/classification 顺序、local `file:`/UNC/remote authority、lexical/realpath containment、symlink escape、root-external 三态、directory one-entry、cross-document Markdown regular-file anchor read、safe output 与 unavailable/limits。任何候选 parser 都不会正确替代这些 Product-owned policy；完整 validator反而已经固化了 Git-root/CLI/file-set policy。
2. 低层 stack 已直接证明需要的 source facts（含已定义 reference 与精确位置）可在 Bun 获取，且不迫使 Link 持有 unified execution、remark CLI、Git repository 或 network model。未定义 reference 在该 parser 语义中没有 occurrence，Link 不会从原文重建它。adapter 只导出 Link 消费的 immutable normalized facts，AST/URL raw material 不出 private boundary。
3. `github-slugger` 提供重复 suffix 的实际证据，适合作为 **GitHub-priority Product fixture 的候选实现**，而非把包行为宣称为全部 GitHub 或所有 renderer 的真相。应由 Link 在 heading plain-text extraction、percent decoding、Unicode/case/punctuation/whitespace、duplicate order、front matter exclusion上包一层 fixture contract。
4. 高层 remark 路线在功能上也可实施；若后续有真实 Markdown transform consumer，它可重新进入比较。当前孤立 Link Check 使用它只增加约 11 个同条件 `npm ls` entry 与 pipeline/adapter abstraction，并没有减少 resolver 安全责任。markdown-it 要补足 precise occurrence span 与 frontmatter；若未来要检查未定义 reference，仍须另行定义语义，不能恢复原文为 Link occurrence，实施风险更高。网络型工具的依赖和操作模型与零网络/direct-only/read boundary直接相反。

**可实施难度：中等、可控，但不是“安装一个 validator”即可完成。** Parser adapter 原型预计是低风险（本实验已打通）；整体 Link Check 仍是中等复杂度，因为安全 resolver 和 fixture matrix 才是主要工作量。只要保持 parser 输入为已读取的 source bytes、所有 target I/O 只经 Link-owned gate、绝不调用 Git/CLI/crawler/network API，依赖引入不会扩大产品授权。若为追求“完整”改用现成 validator，复杂度会从自有 resolver 变为与其 Git/CLI/跨文件限制和安全投影进行不可靠对抗，风险反而更高。

##### 尚未关闭的风险、未采用决定与复核条件

1. **未采用任何依赖或版本。** 推荐不是批准：还需在 Change 的 L4/L5 证据中选择精确 semver、做 production lockfile 的完整 direct/transitive license 与 security review，并通过 isolated installed-Bun consumer。报告中的 manifest 许可证不替代项目依赖策略或扫描结果。
2. **Anchor corpus 未闭合。** 需要 fixtures 覆盖 ATX/Setext、inline formatting/plain-text extraction、front matter、Unicode normalization、punctuation/case/whitespace、duplicate headings、fragment percent-decoding和 GitHub-priority expected outputs；遇到 `github-slugger` 与 GitHub 目前行为差异时，以明确 Product corpus/Decision 补充处理，不静默升级依赖。
3. **Occurrence-to-destination range 未闭合。** mdast node range 已验证，但 final contract 需要决定 record navigation 取 node、label、destination或 start position，并对 escaped/encoded destination、已定义的 collapsed/shortcut reference、无 definition 而不产生 semantic occurrence 的 reference 形式、image、autolink、code/html exclusion写 cases；不要用 substring search 重建 parser 未产生的 occurrence。
4. **本机安全矩阵未闭合。** 需要 fixtures 和可观察 I/O seam 证明 `ignore` 不读不报、`report` 只生成安全 boundary finding、`validate` 才做 direct bounded work；还包括 relative/absolute escapes、local/remote `file:`、UNC、symlink realpath escape、root 内 scope 外、directory empty/non-empty/unreadable、anchor-on-directory、cancellation/limits 与 no-recursion。host-managed network mounts只能作为环境边界记录，不能宣称 Product 可阻止。
5. **零网络/无 subprocess 的证明未闭合。** 正例 parser parse 不等于全实现安全；最终 tests 应 canary `child_process`、DNS/HTTP/TLS client and crawler entrypoints，并审阅 dependency update diff。`remark-validate-links` 的实测 Git execution说明为何此项不能省略。
6. **维护复查条件。** 新版本的 mdast/micromark/slugger、Bun major/minor变动、GitHub anchor 用户案例、或未来真实 Structure/transform consumer均应重跑本 fixture与安全矩阵，并重新评估“低层而非 unified”边界；仅 download/star 变化不自动改变该推荐。
