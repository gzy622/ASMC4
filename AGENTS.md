# ASMC4 — AGENTS.md

模块化多文件作业管理应用：学生三态、作业切换、打分面板、localStorage 持久化。纯前端、无运行时依赖。

## Project

| 属性 | 值 |
|---|---|
| 入口 | `index.html`（HTML 骨架，302 行） |
| CSS | `src/css/`（4 文件：设计变量、基础、组件、响应式） |
| JS | `src/js/`（ESM 模块，42 个文件） |
| 栈 | Vanilla JS ESM / CSS3 / HTML5 |
| 存储 | `localStorage["asmc4_assignments_v1"]` |
| 语言 | zh-CN |

## Commands

不支持 `file://` 协议（ESM 限制），必须通过 HTTP 服务：

```bash
.\start-lan-preview.cmd          # 127.0.0.1:8000，自动打开浏览器
.\start-lan-preview.cmd --lan    # 0.0.0.0:8000，局域网可访问
.\start-lan-preview.cmd 3000     # 指定端口
# 也可用: python -m http.server 8000 --bind 127.0.0.1
```

## Architecture

### CSS 层 — `src/css/`

| 文件 | 职责 |
|---|---|
| `design-tokens.css` | `:root` 设计变量（`--bg`/`--card`/`--text`/`--muted`/`--motion`），改主题色只动这里 |
| `base.css` | reset、body 居中、`.phone` 容器、`.grid`、`.app-bar`、`.progress-bar` |
| `components.css` | 全部组件样式（student-card、drawer、panel、score-sheet、numpad 等） |
| `responsive.css` | 媒体查询窄屏适配 |

### JS 层 — `src/js/`

| 模块 | 职责 |
|---|---|
| `constants.js` | `STATUS` 枚举、`STORAGE_KEY`、天干地支表 |
| `data/defaults.js` | 50 人默认花名册数据 |
| `state.js` | **核心枢纽** — `appState` 模块私有，通过 `getState()` 只读访问 |
| `dom-refs.js` | 所有 `querySelector` 唯一集中于此，**改 DOM id 只改此一处** |
| `runtime.js` | 运行时可变状态（`pendingConfirmAction`、打分输入值、手势变量等） |
| `render/` | `render()` 编排 + 7 个子渲染函数 |
| `ui/` | `drawer`、`panels`、`confirm`、`overlay`、`settings`、`roster`、`backup` UI 控制 |
| `business/` | `assignment`、`student`、`roster` 业务逻辑 |
| `score-sheet/` | 打分面板交互 + 长按检测 |
| `gestures/` | 滑动手势（score-swipe、drawer-gestures），副作用模块 |
| `events/` | 按导航、作业、学生、打分、备份、设置、花名册拆分事件绑定，`index.js` 统一启动 |
| `app.js` | 入口，导入 events + gestures（副作用）后调用 `render()` |

### 数据流

```
用户操作 → events/ → business/ → state.js (修改) → saveAppState()
                                                      ↓
                                               localStorage
                                                      ↓
                                               render()（大多数路径）
                                               或就地 DOM class 切换 + 部分渲染（学生点切）
```

## Conventions

1. **改 DOM id**：HTML 属性 → `src/js/dom-refs.js` 中 `querySelector`，**两处同步**（不再需要同步事件绑定，因为使用 class 委托）。
2. **新增状态值**：`STATUS` 枚举 + `getStateClass` + `getStatusText` + CSS 三态样式，**四处同步**。
3. **状态变更**：通过 `state.js` 的 `getState()` 获取可变引用，修改后依次调用 `saveAppState()` → `render()`。例外：学生卡片点切（`toggleStudent`）就地更新 DOM class + 部分渲染（`renderProgress` + `renderScoringMode`），不调全量 `render()`。
4. **学生 id 比较**：始终用 `String(item.id) === card.dataset.id`。
5. **Esc 优先级**：确认框 > 打分面板 > 花名册编辑/设置页 overlay > 快捷面板/新建作业面板 > 抽屉。
6. **渲染**：全量 `innerHTML` 重建（50 卡片可接受），不要改为差量更新除非性能出问题。学生卡片点切例外（就地 class 切换 + 部分渲染，见约定 3）。
7. **用户输入**：必须经 `escapeHTML()` 转义 5 字符（`& < > " '`）。
8. **深拷贝**：用 `clone(value)` = `JSON.parse(JSON.stringify(value))`。
9. **存储写满**：`saveAppState` 会捕获并记录异常；如需更强反馈，在 UI 公告保存失败。
10. **花名册修改**：改 `defaultStudents` 只影响新用户；老用户需清 `localStorage`。
11. **ESM 模块**：所有 JS 文件使用 ES Module 语法，`index.html` 通过 `<script type="module" src="src/js/app.js">` 加载。
12. **无循环依赖**：`state.js` 不导入 `render/`，业务模块导入 `render/` 但 `render/` 不导入业务模块。


## Notes

_（快速备忘区，随时追加）_
