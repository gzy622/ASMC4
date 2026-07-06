# CodeGraph：ASMC4

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
- `src/js/business/`: 业务修改（`assignment.js`、`settings.js`、`student.js`、`roster.js`）
- `src/js/render/`: 渲染（含 8 个模块）
- `src/js/ui/`: 面板与 UI 动作（含 `floating-layers.js` 浮层栈、`switch-bind.js` switch 绑定）
- `src/js/score-sheet/`: 打分
- `src/js/gestures/`: 手势（含 9 个模块）
- `src/js/utils/`: 工具

## 事件域

- `navigation.js`: 抽屉、空白处关浮层、Esc
- `assignments.js`: 新建、切换、删除、反选、确认框；quickPanel 输入委托 business
- `students.js`: 学生卡点击、顶栏打分按钮、长按
- `score.js`: 数字键盘、备注、确认/取消
- `backup.js`: 导入、导出
- `settings.js`: 设置页开关（含 quickPanel 偏好 switch、trace 开关）
- `roster.js`: 花名册编辑

## 数据

### 持久化（`localStorage["asmc4_assignments_v1"]` → `state.js`）

```js
{
  showRealNames,
  scoringMode,
  scoreStep10Mode,
  currentAssignmentId,
  assignments: [{ id, title, createdAt, subject, students: [{ id, serial, name, status, badge, badgeType, note, updatedAt }] }],
  roster: [{ id, serial, name, nonEnglish }]
}
```

旧备份中的 `scoreTensMode` 读取时会迁移到 `scoreStep10Mode`。
学生/花名册 `id` 经 `utils/normalize.js` 一律为字符串（旧 Number 静默迁移为同值字符串，不重编号）。

### 运行时（`runtime.js`，不持久化）

- `pendingConfirmAction`, `currentScoringStudent`, `scoreInputValue`
- `noteInputValue`, `longPressTimers`, `longPressTriggered`, `suppressNextCardClick`
- `uiTransitionBusy`, `pointerDirectionLock`

### 诊断日志（`localStorage["asmc4_trace_config_v1"]`，`utils/trace.js`）

- 设置页「启用操作日志」开关；内存环形缓冲（最多 800 条），可导出 JSON。
- `traceEvent` / `traceStep` / `traceGesture`；手势工厂可选 `traceLabel`（启用时才写入）。

## 打分 sheet

DOM（`index.html` + `dom-refs.js`）：

- `#scoreDisplay`：显示区容器；数值在 `#scoreDisplayValue`。
- `#scoreBackspaceBtn`：退格，叠在显示区右侧（不在数字键盘格内）。
- `.score-numpad`：1 到 9、×10、`0`、小数点（`data-action="decimal"`，占原退格格位）。

输入（`events/score.js` → `runtime.scoreInputValue`）：

- 整数部分最多 3 位（当前为 `0` 时下一数字键替换）。
- 小数点后最多 2 位；×10 模式禁用小数点。
- 确认（`score-sheet/index.js` `confirmScore`）：`parseFloat`，badge 四舍五入到 2 位小数。

按压反馈：`press-feedback.js` 含 `.score-display-backspace`。

## 手势

模块在 `src/js/gestures/`；顶部作业面板集中在 `panel-swipe.js`，通用拖动在 `drag-gesture.js`。各实例可传 `traceLabel`，启用操作日志时经 `traceGesture` 记录 phase（`pointerdown` / `dragStart` / `release` / `close` / `cancel` 等）。

### `is-motion-dragging`（渲染轻量化，勿混用）

通用手势在真实拖动开始时给 `targetEl` / `sheetEl` 加 `is-motion-dragging`，释放动画结束、取消、打断后的 abort、`pointercancel` 路径移除。仅表示**正在拖拽或释放动画中**，供 CSS 临时关掉阴影以降低 `DrawFn_DrawGL` 尖峰（drawer/score-sheet 关 `::after`，top-sheet 关元素 `box-shadow`）；静止 `.is-open` 仍保留原阴影。

**不得**用于：浮层关闭栈、`blocksQuickPanelPull()`、quickPanel 打开态判断。那些语义继续只用 `is-open` / `is-dragging`（下拉预览占用）。

### `is-shadow-pending`（点击打开阴影延后）

点击打开 drawer / top-sheet 时由 `ui/shadow-reveal.js` 加 `is-shadow-pending`，`transform` 展开结束后再渐入阴影（top-sheet 用元素 `box-shadow`，drawer 用 `::after`）。滑动手势释放走 `is-motion-dragging`，**不得**叠 `is-shadow-pending`（边缘开 drawer：`openDrawer({ deferShadow: false })`）。关闭或 snap 无动画路径须 `cancelShadowReveal(el)`。

### 收起释放动画（`motion-registry.js`）

侧栏/面板手势释放后的收起动画由 `beginTargetReleaseAnimation(targetEl)` / `endTargetReleaseAnimation` 登记。**同一 `targetEl` 释放动画播放中**：不再接受该元素上的新手势（`isTargetReleaseAnimating`），且不会 `interruptRelease` 打断旧动画。**其它浮层**在收起动画中视为未占用（`isLayerOpenForGestureBlock`：`is-open` 且非释放中），可立即触发打开手势。`blocksQuickPanelPull()` / 边缘开 drawer 用后者，勿再靠全局 `isUiTransitionBusy("panel"|"drawer")` 拦跨层手势。

### `#quickPanel`（顶部 sheet）

| 方向 | 绑定元素 | 条件 |
|------|---------|------|
| 下拉打开 | `scrollContainer` | `canPullQuickPanel()` 且 `blocksQuickPanelPull()` 为 false |
| 上滑关闭（面板内） | `#quickPanel` | `#quickPanel.is-open` 且不在 `#quickPanelHistoryView` 内 |
| 上滑关闭（面板外） | `appShell`（`targetEl: quickPanel`） | `#quickPanel.is-open`，触点不在 `#quickPanel` 内 |

下拉打开的 `onPrepare` 调 `refreshQuickPanelContent()`（`render/quickPanel.js`），按当前 view 刷新标题与内容。

`closeFloatingPanels()`（`ui/panels.js`）须 `teardownQuickPanelDrag()`（清 `is-dragging` + abort 下拉预览）并 `resetQuickPanelView()`，避免残留 `is-dragging` 或历史 view 与点标题打开不一致。

面板下方空白与学生列表同在 `.scroll-container` 内。**`appShell` 关闭的 `shouldStart` 在 `is-open` 时不得排除 `.scroll-container`**，否则只能面板内关闭；排除 `#quickPanel` 即可避免与面板内专用手势重复。

### 浮层状态（勿混用）

- **关闭栈**（`ui/floating-layers.js` → `closeTopmostFloatingLayer()`）：确认框 → 打分 sheet → 名单编辑 → 设置 → quickPanel/newAssignment → 侧栏。浏览器后退（`back-guard.js`）、Android 返回键（`native-shim.js`）、Esc（`navigation.js`）共用此顺序。
- `anyFloatingLayerOpen()`（同文件）：上述浮层任一 `is-open`；`back-guard` 的 MutationObserver 也监听 `FLOATING_LAYER_ELS`（含 `#confirmScrim`）。
- `panel-swipe.js` 内 `blocksQuickPanelPull()` 用 `isLayerOpenForGestureBlock` 遍历 `FLOATING_LAYER_ELS`（收起释放中不算占用）；`shouldStart` 里对 `#confirmPanel` 的单独判断保留。
- `blocksQuickPanelPull()`：上式 **或** `#quickPanel.is-dragging` **或** `isTargetReleaseAnimating(quickPanel)` → 打开手势 `canStart` 用。
- 关闭手势以 **`is-open` 为准**；勿把仅 `is-dragging`（下拉未 commit）当作已打开，否则 Android 上易闪关。

### 手势 `shouldStart` 边界（勿与关闭栈混用）

关闭栈（`closeTopmostFloatingLayer`）只管 Esc/后退/返回键的**逐层 pop**；各拖动手势的 `shouldStart` 须按场景单独判断——打开/关闭方向不同、可见态类名不同（toast 用 `is-visible`）、shell 关闭须排除面板自身 DOM，且部分实例只拦 confirm 而不拦其它浮层。

| 模块 | 手势 | `shouldStart` / `canStart` 主要检查 |
|------|------|-------------------------------------|
| `panel-swipe.js` | quickPanel 下拉打开 | `blocksQuickPanelPull()`（`isLayerOpenForGestureBlock` + `is-dragging` + 自身释放中）；排除非 `.student-card` 的 button/input/select/textarea |
| `panel-swipe.js` | quickPanel 壳关闭 | `!isTargetReleaseAnimating(quickPanel)`；`#confirmPanel.is-open` → false；`#quickPanel.is-open`；触点不在 `#quickPanel`；排除 drawer/score-sheet/fullscreen/nav/icon/title-wrap；排除 `#newAssignmentPanel`、`#confirmPanel`、`#rosterEditorPanel`、`#settingsPanel` |
| `panel-swipe.js` | newAssignment 壳关闭 | 同 quickPanel 壳：`!isTargetReleaseAnimating(panel)`；`#confirmPanel.is-open`；面板 `is-open`；排除其它浮层 DOM |
| `drawer-gestures.js` | 边缘左滑打开 | 排除 drawer/score-sheet/top-sheet/modal/fullscreen/nav/icon/title-wrap；`!isTargetReleaseAnimating(drawer)`；`isLayerOpenForGestureBlock(quickPanel|newAssignment|scoreSheet)` → false |
| `drawer-gestures.js` | 侧栏内/壳关闭 | `!isTargetReleaseAnimating(drawer)`；壳关闭须 `drawer.is-open`；排除 `.drawer-filter`（搜索/科目筛选） |
| `score-swipe.js` | 打分 sheet 壳关闭 | `!isUiTransitionBusy("sheet")`；`#confirmPanel.is-open` → false；`scoreSheet.is-open`；排除 score-sheet 自身与其它浮层 DOM |
| `toast-swipe.js` | toast 下滑关闭 | `#appToast.is-visible` 且非 `hidden`（**不用** `is-open` / 关闭栈）；`stopPropagation` 防穿透 sheet |

**为何不能统一成关闭栈或单一 `isConfirmOpen()`：** 打开手势（下拉 quickPanel、边缘开 drawer）与关闭栈方向相反；toast 不在 `FLOATING_LAYER_ELS`；shell 关闭须允许 `.scroll-container` 空白上滑关 panel 但禁止在 panel 内重复绑定；confirm 仅阻断部分 shell 手势，侧栏/ toast 有独立规则。改手势前先对照上表，勿把 `anyFloatingLayerOpen()` 塞进所有 `shouldStart`。

### 侧栏与触摸

`.drawer:not(.is-open) { pointer-events: none }`（`components.css`）：侧栏关断后勿挡 `scrollContainer` 下拉。切换作业应先关 drawer 再改状态（`assignments.js`）。

侧栏作业项按压：`.assignment-item-action` 在 `press-feedback.js` 单独接 `is-pressed`；父项 `.assignment-item` 的 `:active` / `is-pressed` 须排除 `.assignment-item-actions` 与操作钮，避免点编辑/删除时整条缩放。

侧栏筛选行（`.drawer-filter`）里的搜索框和科目筛选不参与侧栏横向拖动；`drawer-gestures.js` 里要直接放行这两个控件，避免输入/点选时误触发抽屉滑动。

### `#appToast`

- 底栏居中 pill（`left: 50%` + `translateX(-50%)`）；下滑关闭：`toast-swipe.js` → `createVerticalDragGesture`（`closeDirection: 1`，`formatTransform` 含 `translateX(-50%)`），仅 `is-visible` 时响应；阈值 48px。
- 关闭位移：`getCloseTargetPx` → `offsetHeight + 24`；释放动画同样走 `formatTransform`，并同步淡出 `opacity`。
- `showToast` 先 `abortToastDismiss()`，再 `clearToastInlineStyles()`；若 toast 仍可见或正在 `is-fading-out`，只更新文案与撤回/重做按钮并续期定时器。
- `hideToast()` 来自手势关闭时不再 abort 当前 release；非手势关闭先 abort。定时关闭走 `is-fading-out` 淡出（`transitionend` + 超时兜底），手势关闭仍 `transition: none` 直隐。
- 关闭后若 toast 带 `assignmentId` 且作业已不在列表，调 `pruneAssignmentHistoryIfOrphan()` 释放 Map。
- 可见态 `.app-toast.is-visible` 设 `touch-action: none`，toast 指针事件须阻止冒泡，避免穿透到底层 sheet 手势。

### 改手势后手动测

1. 列表顶下拉打开；面板内、**面板下空白**、学生区上滑关闭。
2. 打开后立刻上滑关闭；侧栏切换后立刻下拉。
3. toast 显示时框内下滑关闭；轻点「撤回/重做」不误关；连续打分/撤回时 toast 仍可点、可滑、不挡点击。
4. Android WebView：`is-dragging` 与 `pointercancel` 不闪退；快速拖动/半途取消/释放中再触摸后无残留 `is-motion-dragging`。
5. 侧栏或面板收起动画中：可立刻边缘开侧栏 / 下拉开面板（交叉）；同一元素收起中不能再滑自己；旧收起动画不被新手势打断。

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

- 会话内热键：**1** 重建 dist、**2** 安装 Android、**0** 退出（原 B/R/Q）。
- **Invoke-Adb** 用 `Invoke-Adb -Command @('devices')`；禁止 `Invoke-Adb devices`。
- 多设备：优先 `adbWireless` IP；`Get-AdbReadyDevices` 过滤假序列号。
- 无线调试：`Connect-AdbWirelessAuto` 先 `adb mdns services`（`_adb-tls-connect._tcp`）再连配置里的 `adbWireless`；成功会回写 `dev-device.local.json`。
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
- 落点：`utils/dom.js` 的 `announce()`（内部 `showToast()`，不对外 export）；下滑关闭见上文 `#appToast`；undo/redo 仅 `events/history.js`（**不**先 `hideToast()`，与上一条 toast 并存续期）。
- 文案 4 到 8 字；撤回/重做 toast 固定「已撤回」「已重做」。
- 显示类设置、`selectAssignment` 用 `saveAppState({ history: false })`，toast 不带撤回。

## 约束

- DOM 查询只放在 `dom-refs.js`；例外：`ui/roster.js` 拖拽反馈用 `document.querySelectorAll(".roster-row.drag-over-*")`（动态行 class）
- 确认框 `#confirmScrim` 与 `#confirmPanel` 同步 `is-open`；关闭栈查 scrim，部分手势 `shouldStart` 查 panel
- 用户文本进 `innerHTML` 前先 `escapeHTML()`
- 学生 id 比较统一转字符串
- `state.js` 不依赖 `render/`；`runtime.js` 不依赖 `state.js`
- 持久状态进 `state.js`，运行时可变状态进 `runtime.js`
- 新交互优先放进对应的 `events/*.js`
