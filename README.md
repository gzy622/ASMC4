# ASMC4

纯前端作业管理应用。数据：`localStorage["asmc4_assignments_v1"]`。

## 预览（统一入口）

双击或在项目根目录运行：

```text
dev.cmd
```

按菜单选择 1–5；或直接带参数：

| 需求 | 命令 |
|------|------|
| Web · PC | `dev.cmd -Surface web -Target pc` |
| Web · 手机 · Wi-Fi | `dev.cmd -Surface web -Target lan` |
| Web · 手机 · adb | `dev.cmd -Surface web -Target adb` |
| Android 应用 · adb 安装 | `dev.cmd -Surface android` 或选 4 |
| Android APK · 远控下载 | `build-apk.cmd` 或 `dev.cmd -Surface apk` 或选 5 |

等价：`npm run dev`（交互菜单）、`npm run apk`（仅构建 APK）。

**无线 adb（可选）：** 若手机已通过 USB 或系统「无线调试」配对，无需配置。仅在没有可见设备时，复制 `scripts/dev-device.example.json` 为 `scripts/dev-device.local.json` 并填入 `adbWireless`（IP:端口）。

**选项 5 / `build-apk.cmd`：** 构建 APK 并复制到指定目录（默认桌面），无需 adb。适合用手机远控电脑后，通过远控软件把 APK 下载到手机安装。

可选配置 `scripts/dev-device.local.json`：

```json
{
  "apkOutputDir": "C:\\Users\\你\\Desktop",
  "apkVariant": "debug"
}
```

`apkVariant` 为 `release` 时需项目根目录有 `asmc4.keystore`，否则自动退回 `debug`。

**Android 选项 4：** 使用 `gradlew installDebug` 安装（不用 `cap run`）；若与已装正式版签名冲突会自动卸载后重装。

**构建：** `npm run build`（仅打包，不预览）

旧脚本 `preview.cmd` / `start-lan.cmd` / `start-usb-preview.cmd` 仍可用，内部转发到 `dev.cmd`。

## 入口

- `src/js/app.js`: 启动
- `src/js/state.js`: 持久状态
- `src/js/runtime.js`: 运行时可变状态
- `src/js/dom-refs.js`: DOM 引用
- `src/js/events/`: 事件
- `src/js/business/`: 修改
- `src/js/render/`: 渲染
- `src/js/ui/`: 面板
- `src/js/gestures/`: 手势
- `src/js/utils/`: 工具

详细结构：[CodeGraph.md](CodeGraph.md)。硬约束：[AGENTS.md](AGENTS.md)。
