# 工作区工具链与依赖边界

维护 package-tools layout gate、TypeScript compiler 或工作区依赖兼容时读取本页；根命令与完整 owner 关系见[工作区工具](workspace.md)。

## package-tools 依赖边界

`scripts/validation/package-tools-boundary.ts` 是 repository layout validation 的一部分。受检对象是
`src/package-tools/**` 与 [Architecture 所列 Core roots](../development/architecture.md#source-module-boundaries)中的生产
TypeScript 模块；`.test.ts`、`.type-test.ts`、`.test-support.ts`、`test-support/` 与 `fixtures/` 不属于生产集合，生产边
指向这些材料仍是违规。它检查两个方向：

1. Core roots `src/check/**`、`src/check-settlement/**`、`src/data-boundary/**`、`src/machine-output/**`、
   `src/project-definition/**` 与 `src/project-run/**` 不得直接或经仓库内中间模块依赖 package tools。
2. package tool 只可使用目录内实现和按 value/type 符号身份确认的公开 Product symbol；Core-private、test、fixture 与
   `scripts/**` material 均不允许。

Core 闭包按 root `tsconfig.json` 的 TypeScript resolution 处理所有 literal specifier：解析到 workspace 的 relative、绝对
和 `paths` alias edge 都继续分类和遍历；Core literal dynamic import 同样继续遍历。工具侧 dynamic import 则不允许，
nonliteral loading、`require`、`import = require(...)`、解析失败和未知 workspace 目标均 fail closed。工具生产模块的唯一
允许宿主外部叶子是 `node:crypto`、`node:fs` 与 `node:path`；不允许 npm 或其它 Node specifier。

本节拥有受检生产材料和 fail-closed 规则；`package-tools-boundary.ts` 与其边界测试只实现并验证这些规则，不是第二
规则来源。新增工具成员或改变 Architecture 的模块分类后，必须重新通过该 layout validation。

## TypeScript 工具链

编译执行与程序化解析使用两个明确的依赖角色，精确接线由根 manifest 与 lockfile 保存：

| 角色 | 依赖与使用入口 |
| --- | --- |
| typecheck / emit | `@typescript/native` 是官方 `typescript` 稳定 TS7 的 alias。`scripts/package/compiler-toolchain.ts` 从其 manifest 解析声明的 `tsc` bin，供 development typecheck、artifact emit 与 isolated consumer typecheck 共用。 |
| compiler API | 根 `typescript` 是官方 `@typescript/typescript6` compatibility alias，保留 `import ts from "typescript"` 的 TS6 程序化 API；其 `tsc6` 与稳定 compiler 的 `tsc` 名称不同。 |

当前锁图中，稳定 compiler 为 `7.0.2`，compatibility wrapper 为 `6.0.2`，wrapper 实际重导出的 TS6 API 为 `6.0.3`。
维护时分别核对 wrapper 与 API implementation，不能只据 wrapper 版本判断解析器身份。
编译命令只使用 resolver 返回的路径；官方 launcher 按 OS/architecture 选择平台包，缺失本平台 optional package 时明确失败，不从 PATH、preview 或远端安装补足。
工具链的完整指纹范围由[产物契约](package-artifact.md#构建输入与包接口边界)定义。

## 工作区依赖兼容

根 manifest、lockfile 与 `pnpm-workspace.yaml` 保存下列兼容措施；candidate fingerprint 和 compiler cache 均绑定这些配置及精确补丁的 bytes。

| 措施 | 用途与边界 |
| --- | --- |
| `markdown-it@15.0.2` devDependency | 提供 markdownlint `0.42.0` 声明引用的内置类型，仅供工作区类型检查。 |
| `micromark@4.0.3` 的精确 override | 使它与 markdownlint 共用 `micromark-core-commonmark@2.0.4`，满足 MD052 shim 的同实例要求；保留其它 micromark 版本的依赖图。 |
| `patches/execa@10.2.0.patch` | pnpm 登记的本地声明补丁：约束内部 combined-output 泛型，并将缺省 buffer 类型归一为实际默认值。runtime、公开 Options 与 declaration checking policy 保持。 |

Execa 补丁由 `scripts/package/execa-type-compatibility.type-test.ts` 的 TS6/TS7 正向输出推断与拒绝矩阵约束。
上游版本在无补丁时通过同一矩阵后，才移除对应登记与材料；该补丁不代表官方修复。
隔离 consumer 不继承 repository patch、override 或 dev-only `markdown-it`，须分别以公开声明验收和真实 undefined-reference Run 验证安装后的依赖图。
