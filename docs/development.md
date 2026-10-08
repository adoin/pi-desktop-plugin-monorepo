# TypeScript 插件开发

先在根目录执行 `Copy-Item .env.example .env`，配置 `PLUGIN_NAMESPACE=adoin`。命名空间只在构建期读取，环境变量可覆盖根 .env，不能缺失；不要把 .env 加入 assets。

所有插件源码 manifest 的 id 使用 `${PLUGIN_NAMESPACE}.<插件目录名>` 模板，统一入口生成完整运行 manifest（例如 `adoin.sax-design-theme`）。如果运行代码需要自身 ID，应从解析后的 manifest 注入编译期常量，参考主题 build.ts 和 renderer/identity.ts，不要硬编码命名空间。改命名空间会产生全新插件身份，需重新安装和选择主题。

## 已有主题

源码在 `plugins/sax-design-theme/`。先 `pnpm install --frozen-lockfile`，再 `pnpm typecheck`、`pnpm build sax-design-theme`。开发加载 `.artifacts/plugins/sax-design-theme/`，预览打开该目录下 `renderer/index.html`。不要加载源码目录，也不要编辑产物。

所有执行逻辑、构建及测试使用 TypeScript。根 `tsconfig.json` 启用 strict、noEmit；`tsx` 执行开发脚本，esbuild 编译运行代码。主题 `main.ts` 编译为 CommonJS `main.js`，`renderer/extension.ts` 连同引擎打包为 ESM `extension.mjs`，浏览器预览编译为 IIFE。HTML/CSS 不需要改成 TS。安装端不需要 tsx、TypeScript 或 workspace 依赖。

## 集中共用类型

`packages/plugin-types/src/index.ts` 定义插件共用的命令注册、主入口 API、renderer layer API；`src/project.ts` 定义 PluginProject、PluginManifest、WorkspacePlugin 等工程接口。声明仅覆盖仓库已用到的宿主契约，不声称是完整官方 SDK。扩展宿主能力时按实际接口补充类型和权限。

插件在 devDependencies 声明 `"@pi-plugins/plugin-types": "workspace:*"`，使用 `import type`，不在各插件复制一套 API 类型。主题私有的粒子快照、预览测试钩子仍留在主题目录，不放入公共 API。不要用 any 或 ts-nocheck 绕过迁移。

```ts
import type { MainPluginApi } from '@pi-plugins/plugin-types';
declare const pi: MainPluginApi;
export async function onLoad(): Promise<void> {
  await pi.ui.openPanel({ title: 'Example' });
}
```

## 新增插件

先使用 PI-Desktop **PluginScaffold** 在 `plugins/<新插件名>/` 创建插件，再迁入 TypeScript 源码，补充 private workspace package.json 和 plugin.project.json；不手写替代安装器的骨架，不复制主题 ID。

```json
{
  "tasks": {
    "build": ["scripts/build.ts"],
    "test": ["scripts/test.ts"],
    "browser": []
  },
  "assets": ["manifest.json"],
  "generated": ["main.js"],
  "runtime": ["manifest.json", "main.js"]
}
```

`assets` 是从源码原样复制的静态文件白名单；`generated` 是构建生成的文件或整目录；`runtime` 是最终运行目录白名单。混合目录应逐个声明静态文件，不能把含 `.ts` 的整个 renderer 当静态资源复制。所有相对路径禁止越界和符号链接，运行目录不包含 ts、map、node_modules 或开发脚本。

任务通过 Node + tsx 执行，cwd 为插件源码目录，`PI_PLUGIN_OUTPUT_DIR` 固定为根目录 `.artifacts/plugins/<插件名>/`。构建前只清空这个插件的运行目录并复制 assets，再执行 build 任务。无编译需求可用空 build 数组，依旧会复制静态运行文件。`stage` 兼容命令只做 build + test，不另存副本。

```ts
import path from 'node:path';
import { buildSync } from 'esbuild';
const output = process.env.PI_PLUGIN_OUTPUT_DIR;
if (!output) throw new Error('请从仓库根目录执行 pnpm build <插件名>');
buildSync({
  entryPoints: ['main.ts'], outfile: path.join(output, 'main.js'),
  bundle: true, platform: 'node', format: 'cjs', target: 'es2022'
});
```

manifest 指向编译后的文件，不能指向 `.ts`。子项目 package.json 命令转发到统一入口，例如 `tsx ../../scripts/workspace.ts build <插件名>`；新插件自动被发现，无需修改根任务脚本。新增 workspace 依赖后执行 `pnpm install` 并提交锁文件。

## 测试与共享边界

依次执行 `pnpm typecheck`、`pnpm build [插件名]`、`pnpm test [插件名]`、`pnpm test:browser [插件名]`、`pnpm test:workspace`。浏览器测试读取编译目录，公共启动器来自 `@pi-plugins/test-utils`，用本机 Chrome/Edge，可通过 `PI_TEST_BROWSER` 指定路径。

测试工具和公用类型在 packages；主题引擎、宿主选择器和权限配置仍由主题维护。运行时依赖其他 packages 的模块必须打包到插件，不能让安装包 import `../../packages/...` 或依赖其他插件。公用类型只用 type-only import。

## Git 与版本

只提交源码、配置和锁文件，不提交 `.artifacts`、node_modules、dist 或凭据。main 包含全部插件，使用功能分支与按插件限定的提交。各插件独立维护 manifest/package 版本一致；公共类型变化不会自动升级全部插件。
