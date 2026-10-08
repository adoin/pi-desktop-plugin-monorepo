# 在 monorepo 中开发插件

## 已有主题

源码在 `plugins/sax-design-theme/`。显示名称为 sax-design-theme，内部 ID `local.pi-desktop-sax-theme` 保留兼容已有安装。根目录不是一个 PI-Desktop 插件；开发加载应选择插件子目录。

先在根目录 `pnpm install --frozen-lockfile`，然后按需要执行 `pnpm build sax-design-theme`、`pnpm test sax-design-theme`、`pnpm test:browser sax-design-theme`。省略最后一个参数会处理所有已配置插件。

## 新增插件

使用 PI-Desktop 的 **PluginScaffold** 在 `plugins/<新插件名>/` 创建，不手写替代安装器规则的骨架。新插件使用独立 ID，不复制已有插件 ID。

在该子目录补充 workspace `package.json`（private: true、独立版本）与 `plugin.project.json`。例如：

```json
{
  "tasks": {
    "build": ["scripts/build.cjs"],
    "test": ["scripts/test.cjs"],
    "browser": []
  },
  "runtime": ["manifest.json", "main.js", "renderer"]
}
```

任务数组中的文件会通过 Node 执行，工作目录是该插件。无构建需求可将 build 设为空数组。runtime 必须是实际运行文件的白名单，不允许路径越界、符号链接、node_modules 或工作区开发脚本。按插件真实贡献补上主题、技能、资源等目录。

需要共用浏览器测试时在子项目 devDependencies 声明 `"@pi-plugins/test-utils": "workspace:*"`，测试中使用：

```js
const { launchBrowser } = require('@pi-plugins/test-utils');
const browser = await launchBrowser();
try { /* 插件自己的断言 */ } finally { await browser.close(); }
```

从根目录重新执行 `pnpm install` 更新锁文件；将锁文件一起提交。

## 共享边界

- 测试工具、纯算法和设计令牌可以进入 packages；任务选择器、宿主 DOM 适配和权限声明留在具体插件。
- 当前只提取了 test-utils，没有为了目录漂亮而拆开粒子代码。
- 运行代码若将来依赖 packages 内模块，必须由插件自己的构建脚本打包或复制进运行目录。不能让安装后的插件 import `../../packages/...` 或依赖另一个插件是否已安装。
- 不用跨插件相对路径引用；开发依赖通过 workspace 声明。普通网页提交只需要单款插件的独立包，不需要仓库其他子项目。

## Git 与版本

main 同时包含所有插件源码。使用功能分支开发，不再为每款插件维持永久分支。提交可以按目录表达范围，例如 `feat(sax-design-theme): ...`。

每款插件独立更新 manifest.json 和 package.json 的 version。公共工具包的修改不自动升级所有插件；只发布实际受影响且已测试的插件。
