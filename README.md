# pi-desktop-plugin-monorepo

PI-Desktop 插件源码 monorepo。源码仓库：<https://github.com/adoin/pi-desktop-plugin-monorepo>。

每个插件独立开发、独立版本、独立安装包；共用开发工具与测试基础设施。插件通过专门的发布网页提交，**不走官方插件仓库 Fork / PR 流程**。

## 目录

```text
plugins/
  sax-design-theme/           # 当前主题插件，原 Pi Desktop Sax Theme
    manifest.json            # 安装身份、权限和版本
    package.json             # workspace 名称、开发依赖和命令
    plugin.project.json      # 任务脚本与发布文件白名单
    renderer/ styles/ themes/ scripts/
packages/
  test-utils/                # 共用 Puppeteer 启动器，仅开发时使用
scripts/
  workspace.cjs              # 发现插件、构建、测试、暂存、收集产物
  test-workspace.cjs         # 迁移和独立运行包检查
.artifacts/                  # 自动生成，不提交 Git
  plugins/<插件目录>/        # 干净运行目录，交给 PluginCheck / PluginPack
  releases/                  # 最终 .piplug 与 SHA-256 元数据，提交发布网页
```

历史 0.5.2 安装包保留在本机 `plugins/sax-design-theme/dist/`，不提交 Git。仓库首个提交保留了迁移前源码，之后的提交展示目录迁移与改名差异。

## 环境与常用命令

Node.js >=22.12，pnpm 12.3.4。按 `packageManager` 字段准备 pnpm（例如使用 Corepack）。

```powershell
pnpm install --frozen-lockfile
pnpm plugins
pnpm build                       # 所有插件
pnpm test                        # 所有插件静态测试
pnpm test:browser                 # 所有浏览器回归
pnpm run stage                   # 构建、静态测试、生成干净运行目录
pnpm test:workspace               # 检查 workspace 与暂存包

# 只处理一款插件
pnpm build sax-design-theme
pnpm test sax-design-theme
pnpm test:browser sax-design-theme
pnpm run stage sax-design-theme
```

浏览器测试通过 `@pi-plugins/test-utils` 使用本机 Chrome / Edge；找不到时指定：

```powershell
$env:PI_TEST_BROWSER = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
pnpm test:browser sax-design-theme
```

不再需要本机 sax-design-vue 工程或 `SAX_TEST_DEPENDENCIES`。旧的 `SAX_TEST_BROWSER` 路径变量暂时兼容，但推荐统一使用 `PI_TEST_BROWSER`。

## 开发与发布

开发时在 PI-Desktop 插件页加载 `plugins/sax-design-theme/`，不是仓库根目录。预览入口移到了 `plugins/sax-design-theme/renderer/index.html`。安装的插件不会随目录迁移自动更新；如使用开发加载，请重新选择插件目录。

正式发布先 `pnpm run stage <插件目录>`（显式 run，避免与 pnpm 12 内置 stage 命令冲突），然后使用 PI-Desktop 工具：

```text
PluginCheck directory=".artifacts/plugins/sax-design-theme"
PluginPack  directory=".artifacts/plugins/sax-design-theme"
```

再执行：

```powershell
pnpm release:collect sax-design-theme
```

到 `.artifacts/releases/` 取 `.piplug`，提交你的插件发布网页。`release:collect` 只复制官方打包工具的产物并计算 SHA-256，**不会自己造 ZIP**。`stage` 会重建对应插件的暂存目录，因此打包后应先 collect，再重新 stage。

详细步骤见 [docs/releasing.md](docs/releasing.md)，新增插件见 [docs/development.md](docs/development.md)。

## 命名与版本

当前插件的显示名、面板名、workspace 子项目名都是 **sax-design-theme**；内部 ID 仍为 `local.pi-desktop-sax-theme`，主题 ID 与命令 ID 也保留，以兼容已有安装、主题选择与快捷键。因此安装包文件名仍以旧内部 ID 开头，这不影响显示名称。

插件版本分别维护在各自 `manifest.json` 和 `package.json`，两者必须一致。本次迁移版本为 0.5.3，无新增权限，不改变主题功能。仓库根目录与公共工具包不跟着每款插件同步升版。

共享模块先从真实重复需求提取。当前只抽出了公共测试工具，粒子引擎和宿主选择器继续放在主题子项目内，避免迁移时同时重构运行逻辑。
