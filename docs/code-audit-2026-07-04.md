# ASMC4 代码体检清单

体检日期：2026-07-04。只读扫描，未改代码。

## 总体结论

项目结构清晰，硬规则（`innerHTML` 转义、`state.js` 不导入 `render/`、localStorage 入口集中）基本遵守。主要不一致在**层职责**（events/business 混写状态变更）、**渲染策略**（全量 vs 局部）、**浮层关闭栈**三处重复，以及 `scoreStep10Mode` 双份存储。未发现必须立即修复的安全或数据损坏问题；不需要升级为重构。

---

## 必须修

（无）

当前扫描未发现违反硬规则且会稳定出 bug 的项。用户文本渲染（学生卡、作业列表、历史、名单）均已 `escapeHTML()`；`localStorage` 仅 `state.js` 与 `utils/trace.js`（独立 trace 配置）使用。

---

## 建议修

### 1. events 层直接改持久状态

- **问题**：切换作业、quickPanel 重命名/改科目、多个设置开关在 `events/` 内直接 `getState().xxx = …` + `saveAppState()`，未走 `business/`。
- **文件**：`events/assignments.js`（`selectAssignment`、quickRename、quickSubject）、`events/settings.js`（4 个 switch）、`events/students.js`（`toggleShowRealNames`）
- **收益**：统一数据流，后续 Agent 易找入口。
- **风险**：低；搬函数时注意 caller 和 `scheduleRender`/`render` 调用差异。

### 2. business 层夹 DOM 操作

- **问题**：`renameAssignment()` 在 `business/assignment.js` 内创建 input/select、改 DOM；与「business 不操作 DOM」标准不符。
- **文件**：`business/assignment.js`
- **收益**：职责边界清楚；与 quickPanel 重命名逻辑可对比后决定是否合并。
- **风险**：中；侧栏 inline 编辑交互复杂，改动需全测 drawer 编辑流。

### 3. 渲染策略不统一

- **问题**：`toggleStudent()` 手动调 4 个 render 函数；`selectAssignment()` 用同步 `render()`，其余多用 `scheduleRender()`。
- **文件**：`business/student.js`、`events/assignments.js`、`render/students.js`（局部 patch 缓存）
- **收益**：减少「改一处漏一处」；文档可写清何时允许局部更新。
- **风险**：中；学生卡频繁点击路径，性能与正确性需手动测。

### 4. `scoreStep10Mode` 双份存储

- **问题**：持久字段在 `state.scoreStep10Mode`，运行时镜像在 `runtime.scoreStep10Mode`；打开 sheet 时从 state 同步，sheet 内 toggle 写两边。
- **文件**：`state.js`、`runtime.js`、`score-sheet/index.js`、`events/settings.js`、`score-sheet/score-step10-ui.js`
- **收益**：单一来源，减少漂移可能。
- **风险**：低中；需确认 render 与 sheet 内按钮状态仍同步。

### 5. 浮层关闭栈三处重复

- **问题**：关闭顺序（confirm → scoreSheet → roster → settings → floating panels → drawer）在 `utils/back-guard.js`、`native-shim.js`、`events/navigation.js` 各写一份。
- **文件**：上述三文件
- **收益**：改栈顺序时只改一处。
- **风险**：低；提取后须测浏览器后退与 Android 返回键。

### 6. business/ui 反向依赖 render

- **问题**：`business/student.js`、`business/assignment.js` 等 import `render/*`；标准期望 business 只改状态，由上层触发 render。
- **文件**：`business/student.js`、`business/assignment.js`；同类还有 `ui/drawer.js` 等调 `renderAssignmentList`
- **收益**：依赖方向更干净。
- **风险**：中；与第 3 项联动，宜与渲染策略一并整理。

### 7. 学生/作业 id 类型不一致

- **问题**：`normalize.js` 把 `assignment.id` 存为 String、`student.id` 存为 Number；比较处已统一 `String()`，但类型本身不统一。
- **文件**：`utils/normalize.js` 及所有 id 读写
- **收益**：符合 AGENTS 硬规则 4 的精神；减少边缘比较 bug。
- **风险**：中；涉及持久化迁移，整理「状态与持久化」阶段再做。

### 8. Switch 交互绑定方式不一致

- **问题**：设置页 switch 只绑 switch 元素；quickPanel 用 `bindQuickSettingRow`（整行可点）；顶栏 `scoringToggle` 单独绑。
- **文件**：`events/settings.js`、`events/students.js`、`render/settings.js`
- **收益**：同类 UI 同类实现。
- **风险**：低。

---

## 暂时不碰

| 位置 | 原因 |
|------|------|
| `gestures/` 全目录 | 稳定、Android WebView 回归风险高；CodeGraph 已有记录 |
| `render/students.js` 局部 patch | 性能优化，行为正确 |
| `business/assignment.js` inline 编辑 DOM | 稳定，与第 2 项建议修联动但可后置 |
| `score-sheet/index.js` pointer guard 180ms | 防误触边界，无 bug 报告 |
| `ui/roster.js` 拖拽 `querySelectorAll` | 动态行 class，非 id 查询，改收益低 |

---

## 需要记录

| 内容 | 建议写入 |
|------|----------|
| `scoreStep10Mode`：state 持久 + runtime 镜像；打开 sheet 时 `syncScoreStep10Ui(state)` | CodeGraph「数据」 |
| trace 开关存 `localStorage["asmc4_trace_config_v1"]`，不进主备份 | CodeGraph「数据」 |
| 确认框：`confirmScrim` 与 `confirmPanel` 同时加 `is-open`；back-guard 查 scrim，gestures/navigation 查 panel | CodeGraph「手势」或局部注释 |
| toast 统一走 `announce()` → 内部 `showToast()`，不对外 export | CodeGraph 或 AGENTS |
| 名单编辑 `document.querySelectorAll(".roster-row.drag-over-*")` 为拖拽反馈例外 | CodeGraph「DOM」 |
| 备份导出入口：drawer `#exportBackupBtn` 与设置 `#settingsExportBtn` 均调 `ui/backup.exportBackup` | 无需改代码，整理时知悉即可 |

---

## 第三步整理顺序建议

按原计划优先级，结合本清单：

1. **状态与持久化** — id 类型、`scoreStep10Mode` 双份、trace 字段文档
2. **DOM 与渲染** — 渲染策略、events 状态变更下沉 business
3. **打分 sheet** — ×10 同步规则（与第 1 步重叠部分在此验收）
4. **作业/学生列表** — `selectAssignment` 路径、switch 绑定
5. **设置与名单** — settings toggle 统一、roster 不动拖拽
6. **手势与 toast** — 浮层关闭栈提取、gestures 仅记录不主动改

---

## 是否升级重构

**否。** 无「多核心功能绕过 state」「同一状态多份无同步」等信号；问题均为局部不一致，适合小步整理。
