# 0619作业 UI — AGENTS.md

单文件 HTML 作业管理原型：学生三态、作业切换、打分面板、localStorage 持久化。纯前端、无构建、无依赖。

## Project

| 属性 | 值 |
|---|---|
| 入口 | `index.html`（HTML + 内联 CSS + 内联 JS，~2395 行） |
| 栈 | 纯 vanilla JS / CSS3 / HTML5 |
| 存储 | `localStorage["homework_ui_assignments_v4"]` |
| 语言 | zh-CN |

## Commands

无构建/测试步骤。直接打开即可：

```bash
# 浏览器直接打开
start index.html          # Windows
open index.html           # macOS

# 或启动一个本地服务器调试
python -m http.server 8000
# 访问 http://localhost:8000/
```

## Architecture

全部在 `index.html` 中按顺序组织：

| 区段 | 位置 | 说明 |
|---|---|---|
| CSS 设计变量 | `:root` (14–24) | `--bg`/`--card`/`--text`/`--muted`/`--motion`，改主题色只动这里 |
| CSS 三态样式 | `.student-card.*` (278–313) | `NORMAL` / `REGISTERED`(`.is-registered`) / `NONE`(`.no-registration`) |
| 媒体查询 | 末尾 (710–777) | 小屏适配 |
| JS 常量/默认数据 | `STORAGE_KEY` / `STATUS` / `defaultStudents` / `defaultAssignment` | 50 人花名册，三态枚举 |
| JS DOM 引用 | 所有 `querySelector` 集中段 | **改 DOM id 必须同步这里** |
| JS 事件绑定 | 委托到 `.student-grid` / `#assignmentList` / `#quickAssignmentList` 等 | `closest()` 找目标 |
| JS 渲染函数 | `render()` → 子渲染函数 | 每次全量 `innerHTML` 重建 |
| JS 业务操作 | `toggleStudent` / `invertCurrentAssignmentSubmission` / `deleteCurrentAssignment` / `createAssignmentFromDialog` | 每次操作后调 `saveAppState` → `render` |
| JS 持久化 | `loadAppState` / `saveAppState` / `normalizeAssignment` / `normalizeStudent` | try/catch 静默回退，无迁移机制 |
| 打分面板 | `openScoreSheet` / `confirmScore` + 数字键盘 | 长按或打分模式点击触发 |

## Conventions

1. **改 DOM id**：HTML 属性 → JS 的 `querySelector` → 事件绑定的引用，**三处同步**。
2. **新增状态值**：`STATUS` 枚举 + `getStateClass` + `getStatusText` + CSS 三态样式，**四处同步**。
3. **状态变更**：每次操作后依次调用 `saveAppState()` → `render()`。
4. **学生 id 比较**：始终用 `String(item.id) === card.dataset.id`。
5. **Esc 优先级**：确认框 > 打分面板 > 新建/快捷面板 > 抽屉。
6. **渲染**：全量 `innerHTML` 重建（50 卡片可接受），不要改为差量更新除非性能出问题。
7. **用户输入**：必须经 `escapeHTML()` 转义 5 字符（`& < > " '`）。
8. **深拷贝**：用 `clone(value)` = `JSON.parse(JSON.stringify(value))`。
9. **存储写满**：`saveAppState` 无 try/catch，改健壮性时添加。
10. **花名册修改**：改 `defaultStudents` 只影响新用户；老用户需清 `localStorage`。

## Notes

_（快速备忘区，随时追加）_
