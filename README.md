# ASMC4

静态前端打分系统；Web 与 Capacitor Android（`android/`）。数据：`localStorage["asmc4_assignments_v1"]`。

## 预览（统一入口）

双击或在项目根目录运行：

```text
dev.cmd
```

按菜单选择 1–7（**直接回车**重复上次）；或快捷命令：

| 需求 | 命令 |
|------|------|
| Web · 手机 · Wi-Fi（默认） | `dev.cmd web` 或 `dev.cmd web lan` |
| Web · PC | `dev.cmd web pc` |
| Web · 手机 · adb | `dev.cmd adb` 或 `dev.cmd web adb` |
| Android 应用 · adb 安装 | `dev.cmd android` 或选 4 |
| Android APK · 远控下载 | `build-apk.cmd` 或 `dev.cmd apk` 或选 5 |
| **Web + Android 同窗口** | `dev.cmd -Surface full -Target pc\|lan\|adb` 或选 6 |
| 无线 adb 配对 | `dev.cmd pair` 或选 7 |

仍支持完整参数：`dev.cmd -Surface web -Target lan` 等。

等价：`npm run dev`（交互菜单）、`npm run apk`（仅构建 APK）。

**会话内热键**（Web / Android / 选项 6）：**1** 手动重建 dist · **2** 重建并安装 Android · **0** 退出。后台 `--watch` 保存即编译；Web 刷新浏览器，Android 按 **2**。

**日常无线推荐：** 选 **6 → 2 (LAN)** 做手机浏览器预览；同一窗口按 **2** 推 Android。比 **adb reverse**（6→3）更稳。

**无线 adb（可选）：** 手机开启「无线调试」后，`dev.cmd` 会通过 `adb mdns` 自动发现当前 IP:端口并连接（端口每次会变，无需手改）。可选 `scripts/dev-device.local.json` 的 `adbWireless` 用于固定主机或 mdns 不可用时的回退。已 `adb devices` 可见设备时可不配。

**选项 5 / `build-apk.cmd`：** 构建 APK 并复制到指定目录（默认桌面），无需 adb。适合用手机远控电脑后，通过远控软件把 APK 下载到手机安装。

可选配置 `scripts/dev-device.local.json`：

```json
{
  "apkOutputDir": "C:\\Users\\你\\Desktop",
  "apkVariant": "debug"
}
```

`apkVariant` 为 `release` 时需项目根目录有 `asmc4.keystore`，否则自动退回 `debug`。

**Android 选项 4 / 6：** `gradlew installDebug` + 启动 Activity（不用 `cap run`）；签名冲突自动卸载重装。选项 6 下 Android 首次安装失败不退出，按 **2** 重试。

**构建：** `npm run build`（仅打包到 `dist/`，不预览）

## Bug 复现录制（adb）

手机连上 USB 或无线 adb 后，在项目根目录：

```powershell
npm run debug:record
```

脚本会启动 debug App、连接 WebView、清空并开启应用内操作日志，同步录制 WebView trace 与 `logcat`。在手机上复现问题后，在终端按回车结束。

输出目录：`traces/debug/<时间戳>/`，含 `summary.md`（人读摘要）、`manifest.json`、`app-trace.json`、`webview-trace.json`、`logcat.txt`。

- 多设备：`npm run debug:record -- --device SERIAL`
- 打印最新录制路径：`npm run debug:record -- --latest`

性能分析仍用 `npm run trace:android`（偏 WebView Performance，不含 logcat / 应用内 trace）。

## 验证

```powershell
node build.mjs
python verify.py
```

## 入口

```text
index.html -> src/js/app.js -> bindEvents() + render()
```

数据流：`events/` → `business/` → `state.js` → `saveAppState()` → `render()`。

- `src/js/app.js`: 启动
- `src/js/state.js`: 持久状态
- `src/js/runtime.js`: 运行时可变状态
- `src/js/dom-refs.js`: DOM 引用
- `src/js/data/defaults.js`: 默认值
- `src/js/constants.js`: 全局常量
- `src/js/native-shim.js`: Android 原生桥接垫片
- `src/js/events/`: 事件
- `src/js/business/`: 修改
- `src/js/render/`: 渲染
- `src/js/ui/`: 面板
- `src/js/score-sheet/`: 打分
- `src/js/gestures/`: 手势
- `src/js/utils/`: 工具
- `src/css/`: 样式

详细结构：[CodeGraph.md](CodeGraph.md)。硬约束：[AGENTS.md](AGENTS.md)。
