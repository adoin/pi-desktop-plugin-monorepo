# 发布：构建独立包，再提交网页

本仓库管理源码，不承担插件市场目录。无需向官方插件仓库提交 PR，也不要求创建 GitHub Release 才能发布。

以 sax-design-theme 为例：

1. 在该插件的 manifest.json 与 package.json 同步升级 version，更新插件 README；ID 不要随显示名变化。
2. 根目录执行 `pnpm build sax-design-theme`、`pnpm test sax-design-theme`、`pnpm test:browser sax-design-theme`。
3. 执行 `pnpm run stage sax-design-theme`。只复制 plugin.project.json 中 runtime 白名单到 `.artifacts/plugins/sax-design-theme/`；每次 stage 会重建该生成目录，原始源码不受影响。
4. 执行 `pnpm test:workspace` 检查运行目录独立性。
5. 在 PI-Desktop 中运行 **PluginCheck** 和 **PluginPack**，directory 都使用 `.artifacts/plugins/sax-design-theme`。不要对整个 monorepo 打包，不要使用 zip/tar 替代 PluginPack。
6. 执行 `pnpm release:collect sax-design-theme`，从 `.artifacts/releases/` 获得 `.piplug` 和记录 SHA-256 的 JSON。collect 只收集已有包，不创建压缩文件。
7. 安装该包验收，确认授权、升级、卸载与运行行为。
8. 在你专门的插件发布网页上传 `.piplug` 并填写网页要求的元数据。当前未配置网页 API，也不会自动提交或保存发布凭据。
9. 提交对应源码；可选 Git 标签 `sax-design-theme-v0.5.3`，不必将所有插件一起升版。

`.artifacts/`、node_modules 和 dist 都不提交 Git。不要把网页登录信息或令牌写进 manifest、源码或发布元数据。安装包文件名按内部插件 ID 命名，因此当前主题仍生成 `local.pi-desktop-sax-theme-<version>.piplug`，显示名称则为 sax-design-theme。

## 第二款插件

为其配置独立 tasks / runtime 后，同样使用 `pnpm run stage <子目录名>` 和对应暂存目录。运行时共享库必须已打包进该目录；workspace symlink 只供开发使用，不允许进入安装包。
