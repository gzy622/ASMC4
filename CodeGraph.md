# CodeGraph — ASMC4

纯前端作业管理应用。数据：`localStorage["asmc4_assignments_v1"]`。

## 入口

```text
index.html -> src/js/app.js -> bindEvents() + render()
```

- `src/js/app.js`: 启动 + 遮罩动画
- `src/js/state.js`: 持久状态（localStorage）
- `src/js/runtime.js`: 运行时可变状态（不持久化）
- `src/js/dom-refs.js`: DOM 引用快照
- `src/js/data/defaults.js`: 默认值
- `src/js/constants.js`: 全局常量
- `src/js/native-shim.js`: Android 原生桥接垫片
- `src/js/events/`: 事件
- `src/js/business/`: 修改
- `src/js/render/`: 渲染（含 7 个模块）
- `src/js/ui/`: 面板（含 7 个模块）
- `src/js/score-sheet/`: 打分
- `src/js/gestures/`: 手势（含 7 个模块）
- `src/js/utils/`: 工具

## 事件域

- `navigation.js`: 抽屉、中心面板、Esc
- `assignments.js`: 新建、切换、重命名、删除、反选
- `students.js`: 点击、姓名开关、打分模式、长按
- `score.js`: 数字键盘、小数点、显示区退格、备注、确认/取消
- `backup.js`: 导入、导出
- `settings.js`: 设置页、×10、花名册跳转
- `roster.js`: 花名册编辑

## 数据

### 持久化（`localStorage["asmc4_assignments_v1"]` → `state.js`）

```js
{
  hideNames,
  scoringMode,
  scoreTensMode,
  currentAssignmentId,
  assignments: [{ id, title, createdAt, subject, students: [{ id, serial, name, status, badge, badgeType, note, updatedAt }] }],
  roster: [{ id, serial, name, nonEnglish }]
}
```

### 运行时（`runtime.js`，不持久化）

- `pendingConfirmAction`, `scoreSheetStudent`, `scoreInputValue`, `scoreTensMode`
- `noteInputValue`, `longPressTimers`, `longPressTriggered`, `suppressNextCardClick`
- `overlayTransitionBusy`, `pointerDirectionLock`

## 打分 sheet

DOM（`index.html` + `dom-refs.js`）：

- `#scoreDisplay`：显示区容器；数值在 `#scoreDisplayValue`。
- `#scoreBackspaceBtn`：退格，叠在显示区右侧（不在数字键盘格内）。
- `.score-numpad`：1–9、×10、`0`、小数点（`data-action="decimal"`，占原退格格位）。

输入（`events/score.js` → `runtime.scoreInputValue`）：

- 整数部分最多 3 位（当前为 `0` 时下一数字键替换）。
- 小数点后最多 2 位；×10 模式禁用小数点。
- 确认（`score-sheet/index.js` `confirmScore`）：`parseFloat`，badge 四舍五入到 2 位小数。

按压反馈：`press-feedback.js` 含 `.score-display-backspace`。

## 手势

模块在 `src/js/gestures/`；顶部作业面板集中在 `panel-swipe.js`，通用拖动在 `drag-gesture.js`。

### `#quickPanel`（顶部 sheet）

| 方向 | 绑定元素 | 条件 |
|------|---------|------|
| 下拉打开 | `scrollContainer` | `canPullQuickPanel()` 且 `hasOpenOverlay()` 为 false |
| 上滑关闭（面板内） | `.panel-head`、`.top-sheet-handle-zone`、`.quick-action-grid` | `#quickPanel.is-open` |
| 上滑关闭（面板外） | `phoneEl`（`targetEl: quickPanel`） | `#quickPanel.is-open`，触点不在 `#quickPanel` 内 |

面板下方空白与学生列表同在 `.scroll-container` 内。**`phoneEl` 关闭的 `shouldStart` 在 `is-open` 时不得排除 `.scroll-container`**，否则只能面板内关闭；排除 `#quickPanel` 即可避免与面板内专用手势重复。

### overlay 状态（勿混用）

- `blocksPullToOpen()`：侧栏 / 各 center-panel 的 `is-open` → 禁止再下拉打开。
- `hasOpenOverlay()`：上式 **或** `#quickPanel.is-dragging` → 打开手势 `canStart` 用（拖动预览中也算 overlay）。
- 关闭手势以 **`is-open` 为准**；勿把仅 `is-dragging`（下拉未 commit）当作已打开，否则 Android 上易闪关。

### 侧栏与触摸

`.drawer:not(.is-open) { pointer-events: none }`（`components.css`）— 侧栏关断后勿挡 `scrollContainer` 下拉。切换作业应先关 drawer 再改状态（`assignments.js`）。

### 改手势后手动测

1. 列表顶下拉打开；面板内、**面板下空白**、学生区上滑关闭。
2. 打开后立刻上滑关闭；侧栏切换后立刻下拉。
3. Android WebView：`is-dragging` 与 `pointercancel` 不闪退。

## Agent 会话

按需读取，勿每轮重注入；这里只保留 ASMC4 项目经验。

### 硬开关

- 不用 browser MCP。
- DOM/CSS 先推理优先级/数据流；必要时 `node -e`；预览用 `dev.cmd`。
- ponytail 小 diff；探索类回复短结论。

### 读代码

- 先本文件索引 + `Grep`，再 `Read`（带 offset/limit）。
- 已读文件优先 grep 变更行；`Grep` 限定 `src/` 或具体文件。

### 复发 bug

- 第 2 次复发：读 `~/.agents/skills/hunt/SKILL.md` 定根因。
- 「设置不生效」：grep `hidden`/`display`/同类设置；`display:grid` 盖 `[hidden]` 时加 `display:none !important`。

### dev.ps1 / 无线 adb

- **Invoke-Adb** 用 `Invoke-Adb -Command @('devices')`；禁止 `Invoke-Adb devices`。
- 多设备：优先 `adbWireless` IP；`Get-AdbReadyDevices` 过滤假序列号。
- **StrictMode**：管道结果 `@(...).Count`；端口插值 `"${host}:"` 非 `"$host:"`。
- **Gradle**：看 `BUILD SUCCESSFUL` / `Installed on N device`；装前 `Resolve-AdbDevices` + `ANDROID_SERIAL`。
- **adb reverse** 无线常失败 → 降级 LAN；排障 `adb kill-server; adb start-server; adb connect IP:端口`。

### 顶栏 / 当前作业

- `#quickPanel`：`quick-settings-card` 两行；行可点，`switch` 上 `stopPropagation`。
- `showBarXxx`（默认 true，`!== false`）→ 设置页 switch → `render/*` 设 `hidden`；备份同步 `backup.js`。
- **`[hidden]` 陷阱**：`.icon-button` / `.bar-stats` 须 `[hidden] { display: none !important; }`。
- 顶栏打分 → `render/scoringMode.js`；已交人数 → `render/progress.js`（`#barStats`）。

### Android 触觉

- `utils/haptics.js`：统一 `Haptics.impact(Light)`；**勿单独** `selectionChanged()`（Android 须先 `selectionStart` 才振）。
- `state.hapticsEnabled`（默认 true）；设置「振动反馈」用 `.settings-section.native-only`（仅 `body.is-native`）。
- 触点：键盘、全部 switch、撤销/重做；打分数字键与显示区退格用 `hapticSelection`；卡片与 sheet 开闭沿用 `hapticLight`。

### Toast / announce

- 批量改：先 `rg 'announce\(' src/`（长输出用 `rtk rg`）。
- 落点：`utils/dom.js`；undo/redo 仅 `events/history.js`。
- 文案 4–8 字；撤回/重做 toast 固定「已撤回」「已重做」。
- 显示类设置、`selectAssignment` 用 `saveAppState({ history: false })`，toast 不带撤回。

## 约束

- DOM 查询只放在 `dom-refs.js`
- 用户文本进 `innerHTML` 前先 `escapeHTML()`
- 学生 id 比较统一转字符串
- `state.js` 不依赖 `render/`；`runtime.js` 不依赖 `state.js`
- 持久状态进 `state.js`，运行时可变状态进 `runtime.js`
- 新交互优先放进对应的 `events/*.js`
