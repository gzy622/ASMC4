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

## RTK 使用规则

本机安装了 rtk-ai/rtk，但不启用自动 hook、插件接管或透明命令改写。

只有在命令输出可能很长、会消耗大量上下文时，才显式使用 `rtk` 前缀，例如：

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

短命令、需要完整原始输出的命令、交互式命令、安装命令、会修改系统或项目状态的命令，不要默认加 `rtk`。

需要完整错误堆栈、完整日志、完整 JSON、完整 diff、完整测试输出时，直接运行原命令，不要使用 `rtk` 过滤。

如果 `rtk <command>` 的输出看起来缺失关键信息，立即改用原命令重新运行。
