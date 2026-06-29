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
.\start-lan.cmd              # 右键管理员(首次)，同 Wi-Fi 手机访问
.\start-lan.cmd 3000         # 指定端口
.\start-usb-preview.cmd
.\start-usb-preview.cmd 3000
node build.mjs
node build.mjs --watch
npm run preview
npm run cap:sync
npm run cap:open
npm run cap:run
```

预览方式：

- `start-lan.cmd`：同 Wi-Fi，手机访问 PC 局域网 IP（首次需右键管理员运行以添加防火墙规则）
- `start-usb-preview.cmd`：USB 直连，`adb reverse` 转发，手机访问 `localhost`，无需 Wi-Fi

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
