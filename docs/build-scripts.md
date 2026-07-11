# ASMC4 构建与预览脚本说明

本文记录 Web 构建、本地预览、Capacitor 同步、Android 安装与 APK 导出的当前结构。修改脚本前建议先确认职责归属和下方的保持项，避免同一流程再次出现多份实现。

## 入口一览

| 入口 | 用途 | 实际执行 |
|------|------|----------|
| `dev.cmd` | Windows 双击或快捷命令 | `scripts/dev.ps1` |
| `build-apk.cmd` | 独立导出 APK | `scripts/build-apk.ps1` |
| `npm run build` | 只构建 Web | `node build.mjs` |
| `npm run build:watch` | 监听 Web 源文件 | `node build.mjs --watch` |
| `npm run dev` | 开发菜单 | `scripts/dev.ps1` |
| `npm run apk` | 导出 APK | `scripts/build-apk.ps1` |
| `npm run preview` | 只启动静态服务 | `scripts/serve.mjs` |
| `npm run cap:sync` | 直接调用 Capacitor | `npx cap sync android` |

`dev.cmd` 支持交互菜单，也支持 `web`、`adb`、`android`、`apk`、`pair` 等快捷参数。这些是已公开的使用方式，内部整理时应优先保持。

## 文件与职责

```text
dev.cmd / build-apk.cmd
        |
        v
dev.ps1 / build-apk.ps1          参数、菜单、会话和输出文件
        |
        v
scripts/lib.ps1                  固定顺序加载公共模块
        |
        +-- lib/common.ps1       路径、编码、本机配置、通用交互
        +-- lib/adb.ps1          ADB 命令、设备选择、无线连接、端口转发
        +-- lib/android-build.ps1 Web 构建、Capacitor、Gradle、安装、APK
```

### `scripts/lib.ps1`

该文件只是加载器，不放业务函数。加载顺序不可随意调换：

1. `common.ps1` 建立 `$script:ProjectRoot` 和本机配置函数。
2. `adb.ps1` 使用 common 中的配置读写能力。
3. `android-build.ps1` 使用 common 的项目路径和 adb 的设备函数。

### `common.ps1`

主要函数：

- `Initialize-Asmc4Console()`：设置 Windows 终端为 UTF-8。
- `Get-DevDeviceConfig()` / `Update-DevDeviceConfig()`：读写本机配置。
- `Get-LastDevChoice()` / `Save-LastDevChoice()`：保存菜单上次选择。
- `Read-DevRetryOnce()`：构建完成或失败后读取重试选择。

`common.ps1` 和 `android-build.ps1` 包含中文文本，文件必须保持 **UTF-8 with BOM**，否则 Windows PowerShell 5.1 可能把中文当成本地编码，甚至导致引号解析失败。

### `adb.ps1`

模块分为四组能力：

- 执行：`Invoke-Adb()` 统一处理 `-s <device>`、标准输出和退出状态。
- 选择：`Get-AdbReadyDevices()`、`Resolve-AdbDevices()` 过滤异常行并选择设备。
- 连接：`Connect-AdbWirelessAuto()` 先尝试 mDNS，再尝试已保存地址。
- 交互：`Show-AdbWirelessMenu()` 提供状态、TLS 配对、直接连接和 USB 转 TCPIP。

ADB 输出不能只看退出码。某些版本在失败时仍可能返回 `0`，因此 `Test-AdbConnectOk()` 和 `Test-AdbReverseOk()` 会先检查 `failed`、`cannot`、`unable` 和 `error:`。

### `android-build.ps1`

主要函数及调用关系：

```text
Invoke-WebBuild

Sync-CapAndroid

Deploy-AndroidToDevice
  -> Sync-CapAndroid
  -> Install-AndroidDebug
       -> Resolve-AdbDevices
       -> Invoke-Gradle installDebug
  -> Start-AndroidApp

Invoke-AndroidApkBuild
  -> Invoke-WebBuild
  -> Sync-CapAndroid
  -> Invoke-Gradle assembleDebug/assembleRelease
  -> Get-BuiltApkPath
```

`Invoke-WebBuild()` 和 `Sync-CapAndroid()` 会捕获外部命令输出，再用 `Write-Host` 显示。这一点不能改成直接输出，因为 `Invoke-AndroidApkBuild()` 的返回值只能是一个 APK 路径；如果子命令把日志写入 PowerShell 成功输出流，调用方会收到一个数组，`Copy-Item` 将无法使用。

`Invoke-Gradle()` 返回结构化对象：

```powershell
@{
    Output = @("Gradle 输出行")
    ExitCode = 0
}
```

Gradle 结果由 `Test-GradleOk()` 统一判断。安装失败时，`Get-GradleFailureTail()` 返回最有用的错误片段。

## Web 构建

`build.mjs` 负责：

1. 获取 `.build.lock`，避免 watch、手动重建和 Android 构建同时写 `dist/`。
2. 清理并重建 `dist/js` 和 `dist/css`。
3. 使用 esbuild 打包 ESM，保留 Capacitor 动态导入分块。
4. 按固定顺序合并 CSS。
5. 重写 `index.html` 中的样式和脚本路径。

watch 模式会监听 `src/css`、`src/js` 和 `index.html`。多个文件事件可能触发多次构建，构建锁保证它们串行执行。

## 预览会话

`dev.ps1` 只负责会话级逻辑：

- 解析菜单和快捷参数。
- 选择本机、LAN 或 adb reverse 访问方式。
- 启动 `build.mjs --watch` 和 `serve.mjs`。
- 管理热键 `1` 重建、`2` 安装 Android、`0` 退出。
- 在 `finally` 中停止子进程并移除 adb reverse。

LAN 模式首次使用时可能请求管理员权限添加 Windows 防火墙规则。ADB reverse 不可用时，会在能获取 LAN IP 的情况下转用 LAN。

`serve.mjs` 只服务 `dist/`，具备：

- MIME 类型。
- URL 查询参数处理。
- 非法 URL 的 `400` 响应。
- 超出 `dist/` 的路径拒绝。
- 未找到文件时的 `index.html` 回复。

## Android 安装与 APK

### 开发安装

`Deploy-AndroidToDevice()` 的顺序是：

1. 把最新 `dist/` 同步到 Android 工程。
2. 再次确认当前 ADB 设备。
3. 设置 `ANDROID_SERIAL`，执行 `gradlew installDebug`。
4. 如果检测到签名不匹配，卸载旧包后重试。
5. 使用 Activity 全名启动应用。
6. 在 `finally` 中移除 `ANDROID_SERIAL`。

### APK 导出

`build-apk.ps1` 保留与用户相关的逻辑：

- 读取 `-OutputDir` 和 `-Variant`。
- 参数未提供时读取本机配置。
- 没有 release keystore 时转用 debug。
- 把 Gradle 产物复制为 `ASMC4-yyyyMMdd-HHmmss-<variant>.apk`。

实际构建交给 `Invoke-AndroidApkBuild()`。该函数必须只返回一个已存在的 APK 路径。

## 本机配置

`scripts/dev-device.local.json` 不进入 Git。支持字段：

| 字段 | 含义 |
|------|------|
| `adbWireless` | ADB 固定地址或 mDNS 不可用时的备用地址 |
| `apkOutputDir` | APK 默认复制目录 |
| `apkVariant` | `debug` 或 `release` |
| `lastSurface` | 开发菜单上次的主选项 |
| `lastTarget` | 上次的 Web 访问方式或 APK 变体 |

模板位于 `scripts/dev-device.example.json`。

## 修改时保持项

1. 入口脚本不直接执行 `node build.mjs` 或 `npx cap sync android`，应调用公共函数。
2. Gradle 只经 `Invoke-Gradle()` 执行，不各自解析输出。
3. ADB 只经 `Invoke-Adb -Command @(...)` 执行，带设备时传 `-DeviceId`。
4. `Invoke-WebBuild()` 和 `Sync-CapAndroid()` 不向成功输出流写日志。
5. `Invoke-AndroidApkBuild()` 只返回 APK 路径。
6. `dev.ps1` 的会话子进程必须在 `finally` 中停止。
7. 包含中文的 Windows PowerShell 脚本保持 UTF-8 BOM。
8. 管道输出需要统计时使用 `@(...).Count`，以兼容 StrictMode。
9. 主机名或 IP 后紧跟冒号时使用 `"${host}:"`，避免 PowerShell 把它当成驱动器变量。
10. 新增公开命令或改参数时同步 `README.md`。

## 验证清单

小改至少执行：

```powershell
node build.mjs
python verify.py
git diff --check
```

改 PowerShell 模块时额外检查：

- Windows PowerShell 5.1 能够加载 `scripts/lib.ps1`。
- 全部 `.ps1` 可通过 PowerShell Parser。
- 公共函数没有重复定义。
- `Invoke-WebBuild` 的成功输出数量为 `0`。

改 Android 构建时再执行：

```powershell
cd android
.\gradlew.bat :app:assembleDebug
```

改 APK 流程时，使用临时输出目录完整运行一次 `scripts/build-apk.ps1`，确认只生成一个命名正确的 APK。

改预览服务时检查：

- `/css/style.min.css?v=1` 返回 `200` 和 CSS MIME。
- 编码后的上级目录请求返回 `403`。
- 非法 URL 编码返回 `400`。

## 适合重构的方向

当前结构已将通用能力集中，暂时不需要再拆。出现以下情况时可以考虑进一步调整：

- `adb.ps1` 继续增长，可将交互配对界面与底层 ADB 函数分开。
- 需要 CI 构建 APK，可增加无交互入口，复用 `Invoke-AndroidApkBuild()`。
- 需要多平台开发，可把纯 Node 能力与 Windows 会话编排分开，但不应在两边各写一套构建流程。
- 需要更强的自动检查，可为公共 PowerShell 函数增加无设备的输入输出检查，不必引入新测试框架。
