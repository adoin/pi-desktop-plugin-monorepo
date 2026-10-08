# pi-desktop-plugin-monorepo

PI-Desktop 插件 TypeScript monorepo。源码仓库：<https://github.com/adoin/pi-desktop-plugin-monorepo>。

每款插件独立开发、独立版本、独立安装包；共享类型与测试工具。发布通过专门网页提交，不走官方插件仓库 Fork / PR。

## 源码与产物

```text
plugins/
  sax-design-theme/           # 只编辑这里的源码
    main.ts                  # 主入口
    renderer/*.ts            # 宿主扩展、粒子引擎与预览逻辑
    renderer/*.html          # 静态页面
    styles/                  # CSS 源文件
    scripts/*.ts             # 构建及测试
    manifest.json
    plugin.project.json      # 任务、静态资源及产物白名单
packages/
  plugin-types/src/          # 插件公用 API、构建配置和发布类型
  test-utils/browser.ts     # 共用 Puppeteer 启动器
scripts/*.ts                 # 工作区任务与产物检查
.artifacts/                  # 全部生成产物，不提交 Git
  plugins/<插件目录>/        # 唯一运行目录：编译后的 JS + HTML/CSS/资源
  releases/                  # 仅最终 .piplug 安装包
```

根目录 `plugins/` 是 TypeScript 源码，`.artifacts/plugins/` 是宿主能直接运行的 JavaScript。HTML、manifest 等静态资源按白名单复制，TS 编译并打包，不包含源码、开发依赖或类型包。

不再保留 `.artifacts/build/` 或第二套 stage 副本。开发加载、浏览器预览、PluginCheck 和 PluginPack 共用同一个运行目录。PluginPack 临时生成的 `dist/*.piplug` 会在 collect 校验成功后移到 releases，只保留一份安装包。历史版本包仍保留在 releases。

## 环境与命令

Node.js >=22.12，pnpm 12.3.4（按 packageManager 准备，例如使用 Corepack）。

首次开发先执行 `Copy-Item .env.example .env`，根目录 `.env` 配置 `PLUGIN_NAMESPACE=adoin`。所有插件 ID 统一为 `<命名空间>.<插件目录名>`，例如 `adoin.sax-design-theme`。CI 可用同名环境变量覆盖；缺失或不合法时构建报错，`.env` 不提交也不打入安装包。

```powershell
pnpm install --frozen-lockfile
pnpm plugins
pnpm typecheck                 # 全工作区 strict TypeScript 检查，无输出文件
pnpm build                     # 所有插件编译到统一运行目录
pnpm test                      # 静态断言 + 编译产物生命周期测试
pnpm test:browser               # 浏览器回归
pnpm test:workspace             # 运行资源、路径、类型源码隔离检查

# 单个插件，省略名称则处理全部
pnpm build sax-design-theme
pnpm test sax-design-theme
pnpm test:browser sax-design-theme
pnpm run stage sax-design-theme # 兼容入口：build + test，不复制第二份文件
```

浏览器测试使用本机 Chrome / Edge，不需要其他工程的 node_modules。找不到时指定：

```powershell
$env:PI_TEST_BROWSER = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
pnpm test:browser sax-design-theme
```

## 开发与发布

先构建，再在 PI-Desktop 加载 `.artifacts/plugins/sax-design-theme/`。浏览器预览入口是该目录的 `renderer/index.html`。修改源码后重新构建并重载；构建只清理当前插件的运行目录，不影响其他插件或 releases。若有尚未收集的包，构建会提示先 collect，避免丢失包。

正式发布先运行类型检查、构建及测试，然后使用官方工具：

```text
PluginCheck directory=".artifacts/plugins/sax-design-theme"
PluginPack  directory=".artifacts/plugins/sax-design-theme"
```

再执行 `pnpm release:collect sax-design-theme`，从 `.artifacts/releases/` 取 `.piplug` 提交发布网页。collect 不自行创建 ZIP，也不自动发布。

详细步骤见 [docs/releasing.md](docs/releasing.md)，新增 TypeScript 插件与公用类型见 [docs/development.md](docs/development.md)。

## 命名与版本

当前显示名为 **sax-design-theme**，插件 ID 从根目录 `.env` 生成，默认配置下为 `adoin.sax-design-theme`。源码 manifest 使用 `${PLUGIN_NAMESPACE}.sax-design-theme` 模板，不能直接加载。此次从旧 local ID 迁移是新插件身份，不会覆盖旧安装；请先停用或卸载旧插件，再安装新包并重新选择主题。主题和命令 ID 暂不改动。各插件 manifest.json 与 package.json 版本保持一致，独立升级。
