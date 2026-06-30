# ASMC4 — Agents

前端为主，另有 `android/` Capacitor 工程。

## 项目

| 项 | 值 |
|---|---|
| 入口 | `index.html` |
| JS | `src/js/`（ESM） |
| CSS | `src/css/` |
| 存储 | `localStorage["asmc4_assignments_v1"]` |
| Android | `android/`（Capacitor） |
| 语言 | `zh-CN` |

## 命令

```bash
.\dev.cmd                    # 统一预览（交互菜单 1–6）
npm run dev                  # 同上（npm）
npm run build                # 仅构建 dist/
npm run preview              # 仅静态服务（需先 build）
npm run cap:sync / cap:open / cap:run
```

无线 adb（可选）：`scripts/dev-device.local.json` 的 `adbWireless`（无线调试页当前 IP:端口，会变）；`adb devices` 已有设备时可不配。

**dev 会话热键：** B=rebuild dist · R=rebuild+install Android · Q=quit。Web 后台 `serve.mjs` + `--watch`；合并模式 `dev.cmd -Surface full -Target pc|lan|adb` 或菜单 6。

选项 4（Android）：`gradlew installDebug` + 启动 Activity；签名冲突时自动卸载重装。不用 `cap run`（无线设备上 native-run 不稳定）。选项 6 首次 Android 安装失败不杀会话，按 R 重试。

无线日常：**6→2 (LAN)** 预览 Web，同窗口 **R** 装 App；优于 6→3（adb reverse 在无线上常失败，脚本会降级 LAN）。

选项 5 / `build-apk.cmd` / `npm run apk`：构建 APK 到 `apkOutputDir`（默认桌面），供远控下载，无需 adb。

`preview.cmd` / `start-lan.cmd` / `start-usb-preview.cmd` 为兼容别名，转发至 `dev.cmd`。

## 索引

- `src/js/app.js`: 启动
- `src/js/state.js`: 状态
- `src/js/dom-refs.js`: DOM
- `src/js/events/`: 事件
- `src/js/business/`: 修改
- `src/js/render/`: 渲染
- `src/js/ui/`: 面板
- `src/js/score-sheet/`: 打分
- `src/js/gestures/`: 手势
- `src/js/utils/`: 工具

## 数据流

`用户操作 → events/ → business/ → state.js → saveAppState() → render()`

## 规则

1. 改 DOM id 时同步 HTML 和 `src/js/dom-refs.js`。
2. 用户输入进 `innerHTML` 前必须 `escapeHTML()`。
3. `state.js` 不导入 `render/`。
4. 状态变更后通常是 `saveAppState()` 再 `render()`。
5. 学生 id 比较统一转字符串。
6. 学生卡片点切可局部更新，不必全量重渲染。
7. 新状态值要同步 `STATUS`、状态类、状态文本、CSS。
8. 深拷贝用 `clone(value)`。
9. `saveAppState` 写满会吞错。
10. 花名册改动只影响新用户。
11. 全部 JS 使用 ESM。
12. 全量渲染优先，差量更新只在明确需要时做。
13. 默认按 ponytail 思路做最小根因修复。
14. 不为单个问题新增抽象、状态机或测试框架。
15. 不做浏览器自动化测试；交互验证给手动步骤。
16. 代码验证优先跑 `node build.mjs`、`python verify.py` 或现有轻量检查。
17. 复发或难定位的行为 bug 先读 `~/.agents/skills/hunt/SKILL.md`，说清根因再改。
18. 改现有文件保持原换行符；逻辑小改却整文件 diff 时 checkout 后重做。
19. 改 `#quickPanel` / `panel-swipe.js` 前先读 [CodeGraph.md](CodeGraph.md)「手势」；`is-open` 关闭路径勿整段排除 `.scroll-container`（面板下空白在此容器内）。
20. overlay 手势状态分工：`blocksPullToOpen`（各 overlay 的 `is-open`）与 `hasOpenOverlay`（另含 `#quickPanel.is-dragging`）；关闭手势只认 `is-open`。

## 提交约定

标题（英文标签 + 简体中文摘要）：

```text
feat: xxx
fix: xxx
refactor: xxx
docs: xxx
chore: xxx
```

正文用简体中文；空一行分隔标题和正文；无需维护 changelog 文件。

## RTK 使用规则

本机安装了 `rtk-ai/rtk`，不启用自动 hook。仅在输出可能很长时显式加 `rtk` 前缀：

```powershell
rtk git status
rtk git diff
rtk git log --oneline -50
rtk rg "keyword"
rtk npm test
rtk pnpm test
rtk pytest
rtk cargo test
```

排除：短命令、需完整原始输出、交互式、安装、修改系统/项目状态的命令。

## Token 节省偏好

- 当前已关闭：`browser`、GitHub 发布、文档/PDF/表格/演示相关技能。
- 不主动寻找或安装已关闭能力，除非用户明确要求。
- 长技能先判断性价比；简单前端 bug 走 ponytail。
- 提交同步只做 `git add`、`git commit`、`git push`，除非用户要求 PR。
- 最终回复优先短结论。

### Session 经验（可复用）

**硬开关（已验证有效）**

- 不用 browser MCP、不派 Task/explore 子 agent（双份上下文）。
  - 「不用 browser MCP」含自起 HTTP server + CDP 调试。DOM/CSS 行为先在脑中推理优先级/数据流，必要时 `node -e` 跑最小样例；真要预览用 `dev.cmd`。
- ponytail 小 diff：少抽象、少测试框架；探索类回复短结论，长表格仅用户明确要求时写。

**该用却常漏**

- 多文件 `git diff` / 长 `git log`：显式 `rtk`（见上节）；短 `--stat` 可不用。
- 同一 bug **第 2 次复发**：先读 `~/.agents/skills/hunt/SKILL.md` 定根因，勿多轮「读文件 → 试 fix」。
  - 「设置不生效」类 bug 先 grep `hidden`/`display`/现有同类设置的处理，套既有模式；CSS 优先级问题（`display:grid` 盖过 `[hidden]`）无需浏览器即可定根因。
- 架构/域知识：写进 [CodeGraph.md](CodeGraph.md)（如「手势」），对话里只给结论与路径，避免每 session 重探索。

**读代码**

- 先 `CodeGraph.md` 索引 + `Grep`，再带 `offset/limit` 的 `Read`。
- 本 session 已读过的文件：优先 grep 变更行，避免整文件反复 Read（上下文压缩后会再读一遍，浪费更大）。
- `Grep` 默认带 `path` 限定 `src/` 或具体文件，避免扫到 `android/build/`、`dist/` 构建产物。

**任务分工**

- 大 feature 可由低成本 agent 先实现；本 agent 负责验收、根因 fix、文档与提交。

**上下文**

- 对话触达压缩说明总量偏高；压缩是补救，不能替代上面几条。
- 写新设置/新隐藏控件前先 grep 既有同类处理（`[hidden]`、`display:none !important` 模式），一次写对，省掉事后浏览器调试整轮。

**dev.ps1 / 无线 adb（可复用）**

- **Invoke-Adb** 必须 `Invoke-Adb -Command @('devices')` 等形式；禁止 `Invoke-Adb devices` / `Invoke-Adb start-server`（PowerShell 会误绑参数或把 `start-server` 当开关）。
- **多设备**：`IP:端口` 与 `adb-…_adb-tls-connect._tcp` 并存时，优先 `adbWireless` 的 IP，断开 mDNS 重复项；`Get-AdbReadyDevices` 过滤 adb 帮助文本假序列号。
- **StrictMode**：管道/`Where-Object` 结果用 `@(...).Count`；字符串插值带端口用 `"${host}:"` 不能 `"$host:"`。
- **Gradle**：`installDebug` 成败看 `BUILD SUCCESSFUL` / `Installed on N device`，不单信 `$LASTEXITCODE`；装前 `Resolve-AdbDevices` + `ANDROID_SERIAL`。
- **adb reverse** 无线上常失败 → 自动降级手机 Web 为 LAN URL；排障：`adb kill-server; adb start-server; adb connect IP:端口`。

**顶栏 / 当前作业（可复用）**

- **当前作业快捷开关**：`#quickPanel` 用 `quick-settings-card` 纵向两行（显示真实姓名、打分模式）；行容器可点，`switch` 上 `stopPropagation` 防双触发；说明文字放设置页，面板保持紧凑。
- **顶栏显示类设置**：状态字段 `showBarXxx`（默认 `true`，读写用 `!== false` 兼容旧 localStorage）→ 设置页 `switch` → 对应 `render/*` 设 DOM `hidden`；备份导入同步 `backup.js`。
- **`[hidden]` 陷阱**：本项 `.icon-button { display: grid }`、`.bar-stats { position: absolute }` 会盖过 UA 的 `[hidden]`，顶栏隐藏须配 `.icon-button[hidden]` / `.bar-stats[hidden] { display: none !important; }`（同 `#quickPanel .assignment-subject-tag[hidden]` 模式）。
- **渲染落点**：顶栏打分按钮 → `render/scoringMode.js`；顶栏已交人数 → `render/progress.js`（`#barStats`）；打分模式逻辑仍共用 `toggleScoringMode` / `state.scoringMode`。

## 多 Agent 栈

| 层级 | 内容 | Git |
|------|------|-----|
| 项目规则 | `AGENTS.md` | 是 |
| **Cursor Rules/Skills** | `.cursor/rules/`、`.cursor/skills/` | **是**（Settings 可见） |
| 其它 Agent 本机 | `opencode.json`、`.opencode/`、`reasonix.toml`、`.cursorrules` | 否 |

克隆后（OpenCode/Reasonix 本机文件）：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\setup-agent-local.ps1
```

**在 Cursor 里查看**：`Ctrl+Shift+J` → **Rules** → **Project Rules**（应见 `ponytail`、`tooling-stack`）；**Skills** 页见 `ponytail-review` 等。`AGENTS.md` 在 **Project Rules** 或 Agent 说明里单独出现。

**Waza**（hunt/check 等）在用户目录 `~/.agents/skills/`，不会出现在本项目 Skills 列表，Agent 仍可按任务读取。

冲突时：**AGENTS.md > `.cursor/rules` > 全局插件注入**。
