# 原生窗口外观对接 · Sax 0.3.2

要求 PI-Desktop >=0.17.0。使用宿主已有的声明式接口，不修改安装文件：

```json
{
  "permissions": ["ui.panel", "ui.theme", "ui.window.appearance"],
  "contributes": {
    "windowAppearance": {
      "backgroundColor": { "light": "#00000000", "dark": "#00000000" },
      "cornerRadius": 8
    }
  }
}
```

## 原始 layer 尺寸

不再保留 12/28px 阴影留白，不使用根容器 CSS 圆角、裁切、外框阴影或 transform。html / body / #root 无 margin 和 padding，内容使用原始窗口坐标。主题不再要求宿主为菜单、原生视图等扣除人工 inset。

宿主负责真实 8px 圆角、最大化/全屏/还原下的原生 shape、系统窗口阴影及缩放命中区域。主题不会在窗口外绘制 CSS 阴影；窗口内卡片和输入框仍保留右下投影。

## 安装与验收

安装更新后确认 ui.window.appearance 已授权，切换到内置主题再切回 Sax。0.3.1 到本版无新增权限；从更早版本更新需要批准该权限。

浏览器布局测试验证零留白、铺满 viewport 和固定按钮定位；不证明原生圆角、透明度或系统阴影生效。安装后应检查四角、最大化/还原、拖动/缩放以及右侧原生视图。原生表现若仍异常，再沿宿主主题参数传递与 Electron API 返回值排查，不用浏览器 CSS 模拟替代。
