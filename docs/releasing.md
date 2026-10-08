# 发布：构建独立包，再提交网页

本仓库管理源码，不承担插件市场目录。无需向官方插件仓库提交 PR，也不要求创建 GitHub Release 才能发布。

以 sax-design-theme 为例：

1. 在该插件的 manifest.json 与 package.json 同步升级 version，更新插件 README；ID 不要随显示名变化。
2. 根目录执行 `pnpm typecheck`、`pnpm build sax-design-theme`、`pnpm test sax-design-theme`、`pnpm test:browser sax-design-theme`。
3. 构建直接生成唯一运行目录 `.artifacts/plugins/sax-design-theme/`。兼容命令 `pnpm run stage sax-design-theme` 只是 build + test，不另存暂存副本。重建只影响当前插件的运行目录，源码、其他插件与 releases 不受影响；有未收集的包时会要求先 collect。
4. 执行 `pnpm test:workspace` 检查运行目录独立性。
5. 在 PI-Desktop 中运行 **PluginCheck** 和 **PluginPack**，directory 都使用 `.artifacts/plugins/sax-design-theme`。不要对整个 monorepo 打包，不要使用 zip/tar 替代 PluginPack。
6. 执行 `pnpm release:collect sax-design-theme`，仅在 `.artifacts/releases/` 保留 `.piplug`，不生成 JSON。collect 校验复制结果后移除官方工具临时生成的 dist 包，避免同一安装包保留两份；不创建压缩文件。
7. 安装该包验收，确认授权、升级、卸载与运行行为。
8. 在你专门的插件发布网页上传 `.piplug` 并填写网页要求的元数据。当前未配置网页 API，也不会自动提交或保存发布凭据。
9. 提交对应源码；可选 Git 标签 `sax-design-theme-v0.5.3`，不必将所有插件一起升版。

`.artifacts/`、node_modules、dist 和根 .env 都不提交 Git。根 .env 配置 `PLUGIN_NAMESPACE=adoin` 后，当前安装包名为 `adoin.sax-design-theme-<version>.piplug`。更改命名空间属于插件身份迁移，不会升级旧 local ID 安装；先停用或卸载旧插件，再安装新包并重新选择主题。不要把凭据加入源码或安装包。

同一 ID/版本的 releases 包若已存在，collect 只允许内容完全相同的重复收集；内容不同会报错并保留两份文件，需升级 manifest/package 版本后重新构建发布，不能静默覆盖历史发布包。

## 第二款插件

为其配置独立 TypeScript tasks / assets / generated / runtime 后，同样使用 `pnpm run stage <子目录名>` 和对应运行目录。公用类型在 packages/plugin-types；运行时共享库必须打包到插件内，workspace symlink 只供开发使用，不允许进入安装包。
