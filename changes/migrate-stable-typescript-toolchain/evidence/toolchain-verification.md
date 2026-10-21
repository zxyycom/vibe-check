# 稳定编译工具链实施与验证

本记录保存本 owner 的依赖、编译与初步产物证据；不替代 root 对最终冻结源码的完整 Gate。

## 安装结果与边界

- 通过 mise 固定的 pnpm `11.1.3` 更新并 frozen 安装：Execa `10.2.0`、csv-parse `7.0.3`、markdownlint `0.42.0`、jscpd `5.4.2`、Oxlint `1.89.0`、oxlint-tsgolint `7.0.2004`。
- [官方并存方案](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/)采用 native alias `npm:typescript@7.0.2` 和 `typescript: npm:@typescript/typescript6@^6.0.2`；registry 实际 compatibility 稳定版为 `6.0.2`，其 `@typescript/old` 实际锁定 API 为 `6.0.3`。没有猜测不存在的 compatibility `6.0.3`。
- 保持原有精确 / range 风格，发布 manifest 对 csv / Execa / markdownlint 仍精确，对 jscpd 仍使用有界 range。其余已有根库版本不变。唯一必要新增根 devDependency 为带内置声明的 `markdown-it@15.0.2`，补 markdownlint 声明漏列的类型依赖；不加入发布 runtime 清单。
- Node `24.18.0`、Bun `1.3.14`、mise pins 与支持范围均未修改。完整实际根版本、alias 身份、当前平台、compiler bin、指纹与 lock 摘要见 `installed-toolchain.json`。

## 发现的必要适配

1. pnpm 首次追加新 jscpd 精确 release-age 例外后，旧 `5.1.1` 同包例外使下一次锁验证拒绝新版本。现象与 [pnpm issue 12463](https://github.com/pnpm/pnpm/issues/12463)一致；删除退休 preview / jscpd 例外，仅保留 `5.4.2` wrapper / platform 九项精确例外后，供链验证通过。未使用通配符或关闭保护。
2. markdownlint 的直接 core `2.0.4` 与锁中 micromark `4.0.3` 的 core `2.0.3` 不是同一实例，破坏其公开源码注明的 MD052 shim 前提。定向 transitive update 未改变图；最终用精确 `micromark@4.0.3>micromark-core-commonmark: 2.0.4` override 并更新 markdownlint 子树触发解析。mdast 的旧 micromark / core 保留；fresh installed consumer 不继承该 override，另用缺失 full reference 自断言证明新安装图。
3. Execa `10.2.0` 的 `result-all.d.ts` 在现有 exact-optional profile 下内部泛型不满足 `CommonOptions`。正式 pnpm patch 只归一内部缺省 buffer 类型为真实默认 `true`，再用受约束的 conditional inference 检查转换结果，不改公开 Options、runtime 或 compiler strictness。默认依据是 Execa `lib/arguments/specific.js` 的 `buffer: true`，结果 helper 以 `extends false` 区分；并非上游已批准的修复。
4. 首版 patch 的 CommonOptions 交集被正向类型矩阵检出会拓宽缺省输出，已撤销。最终 patch 保留默认 / true / false / descriptor / union / binary / lines / sync 的精确 all 输出和公开拒绝用例，TS6、TS7 双核查通过。未来上游无需 patch 即可通过同矩阵时才移除。
5. 两个私有 scripts / Product 同步 runner 的 encoding 与 stdio 改为 Execa text 分支相关类型；scripts 调整归本 owner，Product 调整归 process owner。没有 widening 或 assertion 绕过。

## 实际验证

- `mise exec -- bun test scripts/package/compiler-toolchain.test.ts scripts/package/artifact/compiler-cache.test.ts scripts/package/artifact/esm-module-specifiers.test.ts scripts/package/artifact/manifest.test.ts scripts/process-execution/process.test.ts`：11 / 11。覆盖真实 tsc / tsc6、API AST、两 scope 接线、文档复用、锁 / patch / resolver 冷失效、输出损坏与 Worker URL exact-once。
- `mise exec -- bun test scripts/package/artifact/artifact.test.ts`：6 / 6，真实 JS / declaration emit、公开 JSDoc、Worker、独立精确依赖清单与包审计通过。
- 两个 `mise exec -- bun run typecheck -- product|scripts`：退出 0；`mise exec -- bun run lint -- scripts`：退出 0。
- TS6 的 `node_modules/typescript/bin/tsc6` 与 TS7 的 `node_modules/@typescript/native/bin/tsc` 分别以 `--ignoreConfig --strict --exactOptionalPropertyTypes --noUncheckedIndexedAccess --module nodenext --moduleResolution nodenext --target esnext --types node --noEmit` 校验 `scripts/package/execa-type-compatibility.type-test.ts`：均退出 0。该文件是 compiler-only 工程校验，不是额外 Case 实体。
- 新建隔离临时 root，复制当前根 manifest / lock / workspace / 精确 patch，运行 mise-pinned `pnpm --dir <fixture> install --frozen-lockfile --ignore-scripts`：180 包从 CAS fresh 安装成功，实际安装的 patched `result-all.d.ts` SHA-256 为 `2287a8f960d2d64cf0f0123ed54ae61731ea3a2b73569d051d94742b1463d4fe`。临时 root 和 pnpm patch edit directory 已清理。
- `mise exec -- bun run package:build`：实际 rebuild / install 成功。随后独占 `external-consumer/type-acceptance.test.ts`：2 / 2，真实隔离公开声明 typecheck 5.55 秒，无 repository patch 或 dev-only markdown-it 回退。
- `mise exec -- bun run validate -- materials`：退出 0。`mise exec -- bun run test-evidence -- check --root .` 最后通过 766 实体 / 190 Cases / 16 topics。目标 diff 的 `git diff --check` 通过。

## 初步 exact candidate 与失败重试

`preliminary-candidate-receipt.json` 是带边界说明的 documentary receipt snapshot，不是用于恢复 lifecycle 的输入：版本 `0.0.0-local.c121db6bba1a`，tarball SHA-256 `5304880bb351bbb99f47d7bc928360a799723aaa6b3fb616177a96dda6afd443`。

此产物在 Product MD052 capability guard 落地前形成。对同一 exact artifact 直接调用现有 shared setup / types / runtime owner 函数，在外部 45 秒硬界内成功：setup 0.946 秒，types 5.125 秒，Node24 runtime 6.714 秒，总计 12.786 秒；包含 fresh graph MD052、原版 Execa runtime、Worker 和强杀证据。公开声明没有泄漏 repository-only 声明依赖。

同时如实保留失败边界：首次 manifest fixture 复制在并发 IO 下超过默认 5 秒，默认 deadline 原样重跑通过；首次 consumer types 的 cold preparation + install 超过 20 秒，预先 package:build 后通过；一次显式 artifact runtime Bun test 在 20 秒外层 deadline 被终止，后续直接 owner 函数证明不把它改写成 test 通过。一次与 candidate 准备重叠的 Case 注册出现 static-only，串行重跑通过；时序原因仅是推断，未复现根因。没有为这些失败修改 deadline。

最终 Product MD052 guard、四组冻结源码和最终 candidate 的完整 Gate 由 root 承接。本 owner 未运行完整 Gate、提交、推送、发布或 Change 删除；未验证其它 OS / architecture / Node 版本，也未证明恶意篡改整个已安装依赖树的完整性。
