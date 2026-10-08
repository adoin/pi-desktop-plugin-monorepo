# Sax Theme · PI-Desktop · 0.5.2 试用版

紫蓝 × 冰青色彩玻璃、无装饰边框、小控件 4px / 大容器 8px、等宽数字、Maple Mono 代码字体，以及 SVG 粒子溶解退出效果。

## 安装与权限

安装 `dist/local.pi-desktop-sax-theme-0.5.2.piplug`，更新同名插件并确认已批准 `renderer.extension` 权限。然后切换到内置主题再切回 Sax Light / Sax Dark。要求 PI-Desktop >=0.17.0。本版无新增权限。

权限为 `ui.theme`、`ui.panel`、`ui.window.appearance` 和 `renderer.extension`。最后一项表示受信任 JavaScript 在宿主主窗口中执行，能够读取 DOM；不是隔离面板权限。没有新增网络、文件、剪贴板或业务删除权限。

## 0.5.2 消除退出后的闪回

退出交接从 16ms 定时扫描移至 MutationObserver 的同轮更新，在下一次绘制前接上已有快照。任务原始行消失后立即显示原位副本，240ms 回滚观察期内保持不变，随后开始溶解；恢复的行会取消副本。弹窗遮罩随副本渐退，不再突然撤掉遮罩后补回表面。快照保留无外部 URL 的背景渐变。

已带 `.closing`、`.sax-motion-leaving`、关闭状态或退出动画的表面，不在真正卸载后补播完整副本，避免“先淡出、再出现、再溶解”。快速重开会清理前一次副本及遮罩。`scripts/test-handoff.cjs` 检查首个退出帧、明暗连续帧、已有淡出不重播和重开清理；真实宿主仍需更新后确认。

## 0.5.1 搜索美化与测试入口

搜索不再套用通用半透明玻璃面板：改为不透明浅色／深紫灰表面，避免背后聊天文字透进结果。浅色遮罩为 10% 紫色，深色为 24% 深色，背景模糊 10px。输入容器、分组标签、选中项与结果间距独立适配；无分割线，面板 8px、结果 4px 圆角。`renderer/search.html` 可预览，`node scripts/test-search.cjs` 验证明暗、焦点、过滤、键盘和窄屏布局。

粒子测试入口已放在首页顶部「从这里测试」：
- 弹窗：打开 `renderer/motion.html`，保持粒子开启，打开弹窗后关闭或按 Escape。
- 模拟任务：打开 `renderer/dissolve.html`，点击任务右侧「⋯」，归档或两次点击删除确认。不会操作真实会话。
- 宿主试用：授权并选中 Sax 后，关闭普通搜索／弹窗；任务请用非当前活动的临时会话。系统减少动态效果开启时不会播放粒子。

## 0.5.0 粒子溶解

`renderer/extension.mjs` 在选择本插件主题时启用观察器，通过 `pi.ui.openLayer()` 建立宿主管理的非交互图层。原始 UI 按宿主原有流程立即消失，净化后的视觉副本以 220ms SVG 噪声遮罩、蚀解和轻位移散去。不会延迟、调用或重试删除/归档 API，也不修改宿主原始节点的 opacity、display 或 React 生命周期。

### 覆盖

- 普通弹窗与搜索弹窗关闭、插件模态框、通知浮层。
- 侧栏浮动菜单及白名单菜单的实际 DOM 卸载。
- 没有既有淡出流程的 Toast 直接移除。已有 `toast-out` 的 Toast 保留宿主退场和移除逻辑，不追加粒子。
- **非当前活动任务**的确认删除／归档退出：以稳定 `data-sidebar-session-row` 会话 ID 关联 `data-action`，删除必须经过宿主二次确认；批量操作有严格资源上限。

任务需要明确操作意图与对应 ID 真正移除双条件。行移除后视觉副本先原位保持 240ms，短时回滚即取消、不进入溶解。行仍存在、重排、显示归档后保留行、折叠/筛选/导航、拖动、滚动均不播放。当前活动任务的退出仍保守跳过，不以等待窗口假装获得业务成功事件。

### 安全与边界

- 仅动画自有副本。副本 `inert`、`aria-hidden`、`pointer-events:none`，不接受焦点或点击；不复制 ID、事件处理器、链接地址、外部图片/媒体、表单值、编辑器内容。包含已知权限卡片或 `data-sensitive` / `data-private` 子树时整块跳过。
- 不保存到磁盘、不上传 DOM/文本；快照仅在内存短暂存在，卸载、切换主题、隐藏页面、减少动效、滚动/缩放时清理。
- 不复制透明祖先或无法重建的裁剪区域。每轮最多尝试四份快照、640 节点、16ms 检查预算；单份最多 240 节点与 85 万平方 CSS 像素。最多 3 个并发动画、16 份浮层缓存和 8 个待处理任务意图。超限直接跳过，绝不影响业务操作。
- DOM 观察是按当前版本类名做的最佳努力适配，不是官方任务成功事件；不能保证所有未来版本或所有异步回滚场景。超过 15 秒且未因交互刷新的旧快照会被丢弃，因此长时间无人交互后的自动退出可能漏播。
- 已由宿主淡出并保留 DOM 的菜单不再重新显示完整副本。聊天流文字、列表刷新、输入内容、历史消息/附件、权限与安全提示、隔离 WebView 不做全局粒子化。
- 视觉副本不完全等同于原组件：不复制伪元素、外部图片和复杂背景；大弹窗可能因预算跳过。列表原本的补位节奏不接管。

## 预览

- `renderer/motion.html`：默认粒子弹窗退出；可切换普通缩放退出对照。粒子始终尊重系统减少动效。
- `renderer/dissolve.html`：任务成功删除、失败、回滚、归档显示、折叠、弹窗和 Toast 的正反例。只操作模拟数据。
- `renderer/window.html`：原始窗口尺寸测试。真实 8px 圆角由 `contributes.windowAppearance.cornerRadius` 实现，主题没有人工外框留白。

普通入场沿用 Sax Design Vue 的 250ms、scale .96→1、cubic-bezier(.22,1,.36,1)，不覆盖宿主定位 transform。SVG 滤镜图和蚀解公式参考其实现，许可见 `THIRD_PARTY_NOTICES.md`。没有额外引入 GSAP。

## 颜色与字体

HSL 语义色同一级别只改变 H，S/L 状态共享。primary=252、success=150、warning=38、error=4、info=195、purple=285；base/hover/active/soft/subtle/fill 令牌由 `scripts/build.cjs` 统一生成。代码优先 Maple Mono / Maple Mono NF CN / Maple Mono NF，数字使用本机等宽字体并启用 tabular-nums。字体未随包分发，Maple Mono 需本机安装。

## 开发与测试

```powershell
node scripts/build.cjs
node scripts/test.cjs
# 可选：复用已有 puppeteer 与本机 Chrome，不自动下载安装。
$env:SAX_TEST_DEPENDENCIES = 'D:\workspace\sax-design-vue'
$env:SAX_TEST_BROWSER = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
node scripts/test-motion.cjs
node scripts/test-dissolve.cjs
```

`themes/` 和 `renderer/dissolve-*-preview.js` / `renderer/dissolve-preview.js` 是生成产物。file:// 预览将同一份引擎及观察器构建成普通脚本；生产入口使用 ES Modules，预览开关不会注入宿主。

浏览器回归覆盖自然播放帧、退出状态、任务确认/失败/回滚/折叠/重排、敏感信息与裁剪、真实 SVG 像素变化、资源上限、减少动效、切换主题和卸载。实际宿主尚需安装授权后验收，不通过操作真实任务来代替测试数据。使用 PluginCheck / PluginPack 校验和打包。
