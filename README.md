# README — 0619作业 UI

> 开发者自述：怎么跑、怎么改、坏了怎么修。详细代码地图见 `CodeGraph.md`。

## 这是什么

模块化纯前端应用：在模拟手机视口里管理“作业→学生→提交状态”。无运行时依赖、无服务端，数据存在浏览器 `localStorage`。

`index.html` 只保留页面骨架；样式位于 `src/css/`，ES Module 逻辑位于 `src/js/`。

## 如何运行

### 方式一：双击脚本（推荐）

**`start-lan-preview.cmd`**（CMD 脚本，后台 watch 需 PowerShell）：

```bash
# 默认端口 8000，绑定 127.0.0.1（本地访问）
.\start-lan-preview.cmd

# 指定端口
.\start-lan-preview.cmd 3000

# 局域网访问（绑定 0.0.0.0，可能触发防火墙）
.\start-lan-preview.cmd --lan
```

启动时自动执行 `node build.mjs` 构建到 `dist/`，并在后台启动 `node build.mjs --watch` 监听 src/ 与 index.html 变更、自动增量构建。端口被占用时自动递增。保持命令窗口开启，按 `Ctrl+C` 停止服务。

也可使用 PowerShell 脚本：

```powershell
.\scripts\start-lan-preview.ps1              # 127.0.0.1:8000
.\scripts\start-lan-preview.ps1 -Lan          # 0.0.0.0:8000
.\scripts\start-lan-preview.ps1 3000 -NoOpen  # 不打开浏览器
```

### 方式二：构建后预览

```bash
npm install          # 仅首次，安装 esbuild
npm run build        # 打包到 dist/（JS 合并压缩、CSS 合并压缩、HTML 引用替换）
node build.mjs --watch  # 监听文件变更自动增量构建
npm run preview      # 在 dist/ 目录启动 HTTP 服务预览
```

`build.mjs` 使用 esbuild 将 `src/js/app.js` + 所有 CSS 文件打包到 `dist/`，替换 HTML 中的引用为压缩后的单文件。无需 `npm install`、无构建步骤也可直接打开开发版（开发时改完保存即生效，刷新即可）。

### 方式三：其他方式

- VS Code Live Server
- `python -m http.server 8000 --bind 127.0.0.1`

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
   - `events/`：按导航、作业、学生、打分、备份、设置、花名册七个交互域绑定事件。
   - `business/`：作业、学生、花名册业务操作。
   - `render/`：全量渲染编排与子渲染器（含设置页、作业列表、快捷面板）。
   - `ui/`：抽屉、面板、确认框、全屏 overlay、设置页、花名册编辑、备份导入导出。
   - `score-sheet/`、`gestures/`：打分面板与滑动手势。
   - `state.js`、`runtime.js`：持久状态与临时运行状态。
   - `utils/`：无界面依赖的通用函数。

完整函数表、调用图、数据模型见 `CodeGraph.md`。

## 状态与交互逻辑

- 学生三态：`NORMAL`（普通）/ `REGISTERED`（已交）/ `NONE`（无登记，锁定不可点）。
- 点卡片：默认 `NORMAL ⇄ REGISTERED`；开启打分模式后直接调出打分面板。`NONE` 始终不响应。
- 反选：当前作业内 `NORMAL ⇄ REGISTERED` 互换，`NONE` 不动；会清/补“已交”标记。注意：`NORMAL + 分数` 反选后会变 `REGISTERED + 分数`，语义可能不符预期（见 CodeGraph §10 #5）。
- 删除作业：二次确认；删完切相邻作业；若一个不剩则自动新建空白作业。
- 新建作业：基于当前花名册复制，可选科目（英语/数学/语文…），状态重置为 `NORMAL`（`NONE` 保留），清空 badge。
- 隐藏姓名：开关开=显示真名，关=用天干地支代号（`甲子`/`乙丑`…，按 index 取模）。
- 打分模式：顶栏右侧按钮（剪贴板/对勾图标）切换。开启后点卡片直接打分（长按仍可打分）；关闭后需长按调出打分面板。状态持久化。
- **×10 模式**：打分面板中 ×10 按钮的开关状态持久化（`state.scoreTensMode`），关闭打分面板后恢复。
- **科目标签**：作业可附带科目（英语/数学/语文…），在抽屉列表中以标签显示；新建作业时可选科目。
- **内联重命名**：抽屉作业列表中点击作业名称可内联修改标题和科目（名称变为输入框，科目标签变为下拉菜单）。Enter 确认，Esc 取消，失焦自动提交。
- 快捷面板：顶栏中部标题（含 ▼ chevron）点击打开，内含精简作业选择器（横向标签）、内联名称/科目编辑、姓名显示开关、反选提交、删除当前作业。
- **全屏设置页**：齿轮按钮打开全屏 overlay 设置页，内容包含姓名显示开关、打分模式开关、×10 模式开关、导入/导出备份、花名册编辑入口。参见「全屏设置页」一节。
- **抽屉**：侧边抽屉用于长作业列表管理。全屏 overlay（设置/花名册编辑）使用 expand→fade→contract 三段式动画，与抽屉互斥。
- **懒渲染**：抽屉、快捷面板、overlay 面板仅在展开时才渲染列表内容，减少全量 `render()` 开销。
- **花名册编辑**：全屏 overlay 编辑器，支持增删行、拖拽排序、标记非中文姓名、重置与保存同步到所有作业。参见「花名册编辑」一节。
- Esc 键优先级：确认框 > 打分面板 > 花名册编辑/设置页 overlay > 快捷面板/新建作业面板 > 抽屉。

## 全屏设置页

齿轮按钮打开全屏 overlay，包含以下功能：

- **姓名显示**：切换真实姓名 / 天干地支代号。
- **打分模式**：等同顶栏右侧按钮，开关持久化。
- **×10 模式**：开启后打分面板数字键自动 ×10（关闭面板后状态保持）。
- **导入 / 导出备份**：导出为 JSON 文件；导入时验证格式并自动迁移旧数据。
- **花名册编辑**：跳转到花名册编辑 overlay（先关设置再打开，避免重叠）。

设置页使用 `ui/overlay.js` 提供的三段式动画：抽屉先横向展开 → 面板淡入 → 抽屉吸附回位。关闭时反向。

## 花名册编辑

全屏 overlay 编辑器，数据源取自 `state.roster`（独立于作业的学生基准名单）。

- **增删行**：底部「+」添加空行；每行右侧 × 删除。Enter 向下跳转，末行 Enter 自动新建。
- **拖拽排序**：行首拖拽手柄（⠿），使用 Pointer Events 实现，支持移动端长按拖动。
- **非中文标记**：勾选「非中文」的条目在作业列表中不参与反选、不受 `isStudentForceNone` 逻辑影响。
- **重置**：恢复为 `data/defaults.js` 的 50 人默认花名册。
- **保存**：将当前编辑器内容写入 `state.roster`，并同步更新所有作业的学生列表（新增条目添加为 `NORMAL` 状态，已有条目只更新序号和姓名，保留状态数据）。

保存成功后自动关闭编辑器并触发全量 `render()`。

## 开发与调试要点

- **改 DOM id**：同步修改 HTML 与 `src/js/dom-refs.js`；事件模块统一复用 DOM 引用。
- **新增状态值**：`STATUS` 枚举 + `getStateClass` + `getStatusText` + CSS 三态样式，四处同步。
- **改持久化结构**：要么改 `STORAGE_KEY` 放弃旧数据，要么在 `normalizeAssignment`/`normalizeStudent` 里加兼容字段。无自动迁移。
- **配额风险**：`saveAppState` 会捕获并记录写入失败，但目前不会在界面中显示失败提示。
- **渲染性能**：卡片区域每次操作全量 `innerHTML` 重建（50 项可接受）；抽屉、快捷面板、overlay 面板采用懒渲染，仅在展开时填充内容。
- **overlay 动画**：全屏 overlay（设置/花名册）使用 `overlayTransitionBusy` 互斥锁，动画期间忽略其他交互。若面板不出现，检查 `runtime.js` 中该锁是否被某处遗漏重置。
- **无障碍**：`#liveStatus` 是 `aria-live` 公告区，状态变更后调 `announce(msg)` 触发屏读器。

## 常见问题修复路径

| 现象 | 先看这里 |
|---|---|
| 改了花名册不生效 | 用户已有 localStorage；清键或改 `loadAppState` 回退逻辑 |
| 改了样式没反应 | 检查是否被三态类（`.is-registered`/`.no-registration`）覆盖；媒体查询 `max-width:360px` 可能覆盖 |
| 点卡片没反应 | 学生 `status` 是否为 `NONE`；`card.dataset.id` 与 `student.id` 比较是否一致（String） |
| 点卡片调出打分面板而非切换状态 | 顶栏右侧按钮开启了打分模式，点一下关闭 |
| 确认框点遮罩不关 | 设计如此；确认框打开时 `modalScrim` 点击被忽略 |
| 存储异常/数据回退 | `loadAppState` catch 吞错；加 `console.warn` 排查 |
| 进度条不动 | `renderProgress` 依赖 `getAssignmentStats`；`NONE` 学生不计入分母 |
| 抽屉/面板 Esc 不关 | 确认框可能仍开着，Esc 先关确认框 |
| 科目标签不显示 | 旧 localStorage 数据无 `subject` 字段；新建作业或手动补字段 |
| 设置页 / 花名册编辑点不开 | `overlayTransitionBusy` 锁定未释放；检查是否有未完成的动画回调 |
| 花名册改完不生效 | 保存逻辑调 `saveRoster` → `applyRosterToAllAssignments`，排查 `state.roster` 是否正确写入 |
| 拖拽排序在移动端无效 | 确认使用 Pointer Events（`pointerdown`/`pointermove`/`pointerup`），非 `touch` 事件 |
