# README — 0619作业 UI

> 开发者自述：怎么跑、怎么改、坏了怎么修。详细代码地图见 `CodeGraph.md`。

## 这是什么

模块化纯前端应用：在模拟手机视口里管理“作业→学生→提交状态”。无构建、无依赖、无服务端，数据存在浏览器 `localStorage`。

`index.html` 只保留页面骨架；样式位于 `src/css/`，ES Module 逻辑位于 `src/js/`。

## 如何运行

### 方式一：双击脚本（推荐）

**`start-lan-preview.cmd`**（纯 CMD，不依赖 PowerShell）：

```bash
# 默认端口 8000，绑定 127.0.0.1（本地访问）
.\start-lan-preview.cmd

# 指定端口
.\start-lan-preview.cmd 3000

# 局域网访问（绑定 0.0.0.0，可能触发防火墙）
.\start-lan-preview.cmd --lan
```

端口被占用时自动递增。保持命令窗口开启，按 `Ctrl+C` 停止服务。

也可使用 PowerShell 脚本：

```powershell
.\scripts\start-lan-preview.ps1              # 127.0.0.1:8000
.\scripts\start-lan-preview.ps1 -Lan          # 0.0.0.0:8000
.\scripts\start-lan-preview.ps1 3000 -NoOpen  # 不打开浏览器
```

### 方式二：其他方式

- VS Code Live Server
- `python -m http.server 8000 --bind 127.0.0.1`
- 如需构建后预览：`npm run build && npm run preview`

无需 `npm install`、无构建步骤。改完保存即生效，刷新页面查看。

## 数据与重置

- 存储键：`localStorage["homework_ui_assignments_v4"]`。
- 清空重来：控制台执行 `localStorage.removeItem("homework_ui_assignments_v4")` 后刷新；或 DevTools → Application → Local Storage → 删该键。
- 首次打开若无存储，自动加载 `defaultStudents`（50 人花名册）与默认作业 `0619作业`。
- 改 `defaultStudents` 只影响“无存储的新用户”；已有存储的用户仍读旧数据（除非清键）。

## 代码组织

1. **HTML**：`index.html` 仅包含顶栏、学生网格、抽屉和各面板的语义骨架。
2. **CSS**：`src/css/` 按设计变量、基础、组件、响应式四层组织。
3. **JS**：
   - `app.js`：启动入口，只负责绑定事件和首次渲染。
   - `events/`：按导航、作业、学生、打分、备份五个交互域绑定事件。
   - `business/`：作业和学生业务操作。
   - `render/`：全量渲染编排与子渲染器。
   - `score-sheet/`、`gestures/`、`ui/`：独立交互组件。
   - `state.js`、`runtime.js`：持久状态与临时运行状态。
   - `utils/`：无界面依赖的通用函数。

完整函数表、调用图、数据模型见 `CodeGraph.md`。

## 状态与交互逻辑

- 学生三态：`NORMAL`（普通）/ `REGISTERED`（已交）/ `NONE`（无登记，锁定不可点）。
- 点卡片：默认 `NORMAL ⇄ REGISTERED`；开启打分模式后直接调出打分面板。`NONE` 始终不响应。
- 反选：当前作业内 `NORMAL ⇄ REGISTERED` 互换，`NONE` 不动；会清/补“已交”标记。注意：`NORMAL + 分数` 反选后会变 `REGISTERED + 分数`，语义可能不符预期（见 CodeGraph §10 #5）。
- 删除作业：二次确认；删完切相邻作业；若一个不剩则自动新建空白作业。
- 新建作业：基于当前花名册复制，状态重置为 `NORMAL`（`NONE` 保留），清空 badge。
- 隐藏姓名：开关开=显示真名，关=用天干地支代号（`甲子`/`乙丑`…，按 index 取模）。
- 打分模式：顶栏铅笔按钮切换。开启后点卡片直接打分（长按仍可打分）；关闭后需长按调出打分面板。状态持久化。
- 快捷面板：顶栏中部标题（含 ▼ chevron）点击打开，内含精简作业选择器（横向标签）和 3 项设置（显示姓名/反选/删除当前作业）。
- Esc 键优先级：确认框 > 打分面板 > 快捷面板/新建作业面板 > 抽屉。

## 开发与调试要点

- **改 DOM id**：同步修改 HTML 与 `src/js/dom-refs.js`；事件模块统一复用 DOM 引用。
- **新增状态值**：`STATUS` 枚举 + `getStateClass` + `getStatusText` + CSS 三态样式，四处同步。
- **改持久化结构**：要么改 `STORAGE_KEY` 放弃旧数据，要么在 `normalizeAssignment`/`normalizeStudent` 里加兼容字段。无自动迁移。
- **配额风险**：`saveAppState` 会捕获并记录写入失败，但目前不会在界面中显示失败提示。
- **渲染性能**：当前每次操作全量 `innerHTML` 重建 50 卡片，可接受；扩到上百项需改差量更新。
- **无障碍**：`#liveStatus` 是 `aria-live` 公告区，状态变更后调 `announce(msg)` 触发屏读器。

## 常见问题修复路径

| 现象 | 先看这里 |
|---|---|
| 改了花名册不生效 | 用户已有 localStorage；清键或改 `loadAppState` 回退逻辑 |
| 改了样式没反应 | 检查是否被三态类（`.is-registered`/`.no-registration`）覆盖；媒体查询 `max-width:360px` 可能覆盖 |
| 点卡片没反应 | 学生 `status` 是否为 `NONE`；`card.dataset.id` 与 `student.id` 比较是否一致（String） |
| 点卡片调出打分面板而非切换状态 | 顶栏铅笔按钮开启了打分模式，点一下关闭 |
| 确认框点遮罩不关 | 设计如此；确认框打开时 `modalScrim` 点击被忽略 |
| 存储异常/数据回退 | `loadAppState` catch 吞错；加 `console.warn` 排查 |
| 进度条不动 | `renderProgress` 依赖 `getAssignmentStats`；`NONE` 学生不计入分母 |
| 抽屉/面板 Esc 不关 | 确认框可能仍开着，Esc 先关确认框 |
