# README — 0619作业 UI

> 开发者自述：怎么跑、怎么改、坏了怎么修。详细代码地图见 `CodeGraph.md`。

## 这是什么

单文件 HTML 原型：在模拟手机视口里管理“作业→学生→提交状态”。纯前端、无构建、无依赖、无服务端，数据存在浏览器 `localStorage`。

只一个源文件：`index.html`（约 1563 行，HTML + 内联 CSS + 内联 vanilla JS）。

## 如何运行

- Windows 下双击 `start-lan-preview.cmd`，会自动打开浏览器并显示可供同一局域网设备访问的地址。
- 默认端口为 `8000`；也可在终端运行 `.\start-lan-preview.cmd 8001` 指定其他端口。保持命令窗口开启，按 `Ctrl+C` 停止服务。
- 也可使用 VS Code Live Server，或手动运行 `python -m http.server 8000 --bind 0.0.0.0`。
- 无需 `npm install`、无构建步骤。改完保存即生效，刷新页面查看。

## 数据与重置

- 存储键：`localStorage["homework_ui_assignments_v4"]`。
- 清空重来：控制台执行 `localStorage.removeItem("homework_ui_assignments_v4")` 后刷新；或 DevTools → Application → Local Storage → 删该键。
- 首次打开若无存储，自动加载 `defaultStudents`（50 人花名册）与默认作业 `0619作业`。
- 改 `defaultStudents` 只影响“无存储的新用户”；已有存储的用户仍读旧数据（除非清键）。

## 代码组织

全部在 `index.html`，分区固定，行号会随改动漂移：

1. **HTML 结构**：顶栏 / 学生网格容器 / 抽屉（纯作业导航） / 快捷面板 / 新建作业面板 / 确认对话框。
2. **CSS**（约 13–778 行）：设计变量在 `:root`（14–24），改主题色与缓动只动这里；三态卡片样式在 `.student-card.*`（278–313）；媒体查询在末尾（710–777）。
3. **JS**（约 900–1900+ 行）：
   - 常量/默认数据
   - DOM 引用（改 id 必须同步这里）
   - 事件绑定
   - 渲染函数（含 `renderScoringMode`）
   - 面板控制
   - 业务操作（含 `toggleScoringMode`）
   - 持久化/规整（含 `scoringMode` 字段）
   - 工具函数

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

- **改 DOM id**：HTML、JS 引用块（999–1032）、事件绑定区要三处同步。
- **新增状态值**：`STATUS` 枚举 + `getStateClass` + `getStatusText` + CSS 三态样式，四处同步。
- **改持久化结构**：要么改 `STORAGE_KEY` 放弃旧数据，要么在 `normalizeAssignment`/`normalizeStudent` 里加兼容字段。无自动迁移。
- **配额风险**：`saveAppState` 无 try/catch，存储写满会抛未捕获异常；如需稳健，包一层。
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

