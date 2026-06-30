# ASMC4

静态前端打分系统；Web 与 Capacitor Android（`android/`）。数据：`localStorage["asmc4_assignments_v1"]`。

## 预览（统一入口）

双击或在项目根目录运行：

```text
dev.cmd
```

按菜单选择 1–6；或直接带参数：

| 需求 | 命令 |
|------|------|
| Web · PC | `dev.cmd -Surface web -Target pc` |
| Web · 手机 · Wi-Fi | `dev.cmd -Surface web -Target lan` |
| Web · 手机 · adb | `dev.cmd -Surface web -Target adb` |
| Android 应用 · adb 安装 | `dev.cmd -Surface android` 或选 4 |
| Android APK · 远控下载 | `build-apk.cmd` 或 `dev.cmd -Surface apk` 或选 5 |
| **Web + Android 同窗口** | `dev.cmd -Surface full -Target pc\|lan\|adb` 或选 6 |

等价：`npm run dev`（交互菜单）、`npm run apk`（仅构建 APK）。

**会话内热键**（Web / Android / 选项 6）：**B** 手动重建 dist · **R** 重建并安装 Android · **Q** 退出。后台 `--watch` 保存即编译；Web 刷新浏览器，Android 按 **R**。

**日常无线推荐：** 选 **6 → 2 (LAN)** 做手机浏览器预览；同一窗口按 **R** 推 Android。比 **adb reverse**（6→3）更稳。

**无线 adb（可选）：** 复制 `scripts/dev-device.example.json` 为 `scripts/dev-device.local.json` 并填入 `adbWireless`（手机「无线调试」页当前 **IP:端口**，每次配对可能变）。已 `adb devices` 可见设备时可不配。

**选项 5 / `build-apk.cmd`：** 构建 APK 并复制到指定目录（默认桌面），无需 adb。适合用手机远控电脑后，通过远控软件把 APK 下载到手机安装。

可选配置 `scripts/dev-device.local.json`：

```json
{
  "apkOutputDir": "C:\\Users\\你\\Desktop",
  "apkVariant": "debug"
}
```

`apkVariant` 为 `release` 时需项目根目录有 `asmc4.keystore`，否则自动退回 `debug`。

**Android 选项 4 / 6：** `gradlew installDebug` + 启动 Activity（不用 `cap run`）；签名冲突自动卸载重装。选项 6 下 Android 首次安装失败不退出，按 **R** 重试。

**构建：** `npm run build`（仅打包到 `dist/`，不预览）

旧脚本 `preview.cmd` / `start-lan.cmd` / `start-usb-preview.cmd` 仍可用，内部转发到 `dev.cmd`。

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
