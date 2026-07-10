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
- `src/js/gestures/`: 手势（14 个模块）
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
  instantScoringMode,
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
- **adb bug 复现**：`npm run debug:record`（`scripts/android-debug-record.mjs`）经 CDP 调用 `window.__ASMC4_DEBUG_TRACE__`（`createDebugTraceApi()`，`app.js` 安装）；准备后按回车开始，清空并开启 trace，同步抓 WebView trace + 包级 `logcat`，再按回车结束并落盘 `traces/debug/<时间戳>/`（`summary.md`、`manifest.json`、`app-trace.json`、`webview-trace.json`、`logcat.txt`），保存后可继续按回车开始下一次。智能体默认读 `traces/debug/` 最新目录；`npm run debug:record -- --latest` 打印路径。性能采样仍用 `npm run trace:android`（`traces/android/`）。共用 `scripts/android-adb-lib.mjs`（adb / WebView / CDP）。

## 打分 sheet

DOM（`index.html` + `dom-refs.js`）：

- `#scoreDisplay`：显示区容器；数值在 `#scoreDisplayValue`。
- `#scoreBackspaceBtn`：退格，叠在显示区右侧（不在数字键盘格内）。
- `.score-numpad`：1 到 9、×10、`0`、小数点（`data-action="decimal"`，占原退格格位）。

输入（`events/score.js` → `runtime.scoreInputValue`）：

- 整数部分最多 3 位（当前为 `0` 时下一数字键替换）。
- 小数点后最多 2 位；×10 模式禁用小数点。
- 确认（`score-sheet/index.js` `confirmScore`）：`parseFloat`，badge 四舍五入到 2 位小数。

按压反馈：`press-feedback.js` 从 `gesture-guards` 复用 `NAV_CHROME_SELECTOR`；含 `.score-display-backspace` 等专用项。

## 手势

`src/js/gestures/` 为手势入口；改交互前先读本节规则，再读对应文件。**勿直接** `classList` 操作 `is-motion-dragging` / `is-dragging`，经 `layer-motion-state.js` 登记。

### 模块索引

| 文件 | 职责 |
|------|------|
| `constants.js` | 手势阈值、`PANEL_TRANSITION_MS` 等共享常量 |
| `gesture-guards.js` | 手势开始判断、触点排除、浮层互斥查询 |
| `press-feedback.js` | 导航/按钮按压视觉反馈（复用 `NAV_CHROME_SELECTOR`） |
| `layer-motion-state.js` | 运动态单一来源（phase → 视觉 class） |
| `motion-registry.js` | 释放动画登记；薄 re-export 查询 API |
| `pointer-drag-lifecycle.js` | RAF transform、pointer capture、速度跟踪、动画样式清理、`bindPointerDragLifecycle`、Android `touchmove` 滚动拦截 |
| `utils/dom.js` | toast、`waitForTransition`（transitionend + timeout） |
| `swipe-release.js` | `evaluateSwipeRelease` 统一横/竖滑释放阈值 |
| `interactive-layer-controller.js` | 四类滑动面板的唯一运动控制器；开合、暂停接管、反向拖动、generation、Android pointer 生命周期 |
| `drag-gesture.js` | toast 保留的独立垂直拖动工厂 |
| `panel-swipe.js` | quickPanel 四类动作 + newAssignment，经统一控制器绑定 |
| `drawer-gestures.js` / `score-swipe.js` / `toast-swipe.js` | 各浮层手势绑定 |
| `gesture-motion-engine.js` | WAAPI 释放动画、`animateMotionRelease`（**勿改**算法参数） |
| `ui/floating-layers.js` | 关闭栈 `closeTopmostFloatingLayer()` |

方向判定、阈值、quickPanel 下拉预览等仍留在各工厂；各实例可传 `traceLabel`，操作日志经 `traceGesture` 记录 phase。

### 浮层开/关方式

| 浮层 | 打开 | 关闭 |
|------|------|------|
| **quickPanel** | 列表顶下拉 | 面板内上滑 / 壳层空白上滑 / 关闭栈 / `closeFloatingPanels()` |
| **newAssignmentPanel** | 点击新建 | 内外上滑 / 关闭栈 |
| **drawer** | 左边缘横滑 | 内左滑 / 壳层左滑 / 关闭栈 |
| **scoreSheet** | 点学生卡片 | 下滑 / 壳层下滑 / 关闭栈 |
| **confirmPanel** | 业务触发 | 返回键 / Esc / 后退优先；阻断底下主要滑动手势 |
| **settings / roster** | 入口点击 | 关闭栈 |
| **toast** | `showToast` | 下滑（`is-visible`）/ 定时淡出；**不在**关闭栈 |

**关闭栈顺序**（`closeTopmostFloatingLayer()`）：确认框 → 打分 sheet → 名单编辑 → 设置 → quickPanel/newAssignment → 侧栏。`back-guard.js`、Android 返回键、`navigation.js` Esc 共用。

### 互斥规则

**跨层打开阻塞**（`isLayerOpenForGestureBlock` → `isCrossPanelOpenBlocked()`）：下列任一为真时，`openDrawer` / `openQuickPanel` / `openNewAssignmentPanel` / `openDrawerFullscreenPanel` 早退。

- 静止 `is-open`（且非收起释放中）
- 打开释放（`settling-open`）
- 点击打开（统一控制器登记为打开释放）
- quickPanel 下拉预览（`is-dragging`）
- drawer 未 `is-open` 时的边缘滑开预览（`dragging` 且非释放中）

**不阻塞跨层打开**：收起释放（`settling-close`）。面板/侧栏收起动画中可立刻打开另一浮层。

**同元素**：drawer 的动画可在非控件区域按下暂停；quickPanel、newAssignmentPanel、scoreSheet 还允许从面板内按钮、输入框和选择框按下暂停或开始拖动。方向成立后从当前画面位置接管；未形成拖动、`pointercancel` 或应用切后台时继续原目标。toast 仍不接管自己的释放动画。

**确认框**：`isConfirmPanelOpen()` 阻断 quickPanel / newAssignment / scoreSheet 壳层关闭；下拉打开另走 `blocksQuickPanelPull()`。

**方向锁**：同一 pointer 横/竖只能一个方向（`runtime.js` `claimDirection`）。

**按下等待**：quickPanel 的下拉预览只在竖向拖动成立后准备；单纯按下不能清除学生卡片长按计时，也不能提前让卡片失去 pointer。尚未取得方向的触点结束或取消时只清理监听状态，不得让关闭态控制器执行 settle 或接管共享遮罩。

**关闭手势可见态**：以 `is-open` 为准；仅 `is-dragging`（下拉未 commit）不算已打开。

### 运动状态与视觉 class

`layer-motion-state.js` 为单一事实来源；`motion-registry.js` 对外 re-export。

| phase / 标记 | 含义 | 输出 class |
|--------------|------|-----------|
| `dragging` | 手指拖动 | `is-motion-dragging` |
| `settling-open` / `settling-close` | 释放动画 | `is-motion-dragging` |
| `explicit-opening` | drawer 全屏切换的独立打开编排 | 无视觉 class |
| pullPreview | quickPanel 下拉预览 | `is-dragging`（仅 quickPanel） |

统一控制器内部保留 `opening` / `closing`，对 `layer-motion-state.js` 统一登记为 `settling-open` / `settling-close`；`explicit-opening` 只供 drawer 全屏切换的独立编排使用。

其它视觉 class：`is-open`、`is-expanding`（drawer 全屏 scale）、`no-anim`（仅 `withNoAnimLayer` 瞬时 snap 与 fullscreen 子元素）、`is-pointer-guarded`（scoreSheet 防误触）。

`is-motion-dragging` 表示拖动或释放运动；同时维持 scoreSheet 关闭途中的可见性，不用于关闭栈或占用判断。

**共享遮罩**：drawer / quickPanel / newAssignmentPanel / scoreSheet 不绘制面板阴影，共用 `#mainPage` 内的 `#layerScrim`。统一控制器根据 transform 位置把打开进度换算为遮罩透明度；拖动时同帧更新，WAAPI 开合时与 transform 使用同一时长和缓动。遮罩不接收指针，完全关闭后隐藏；确认框仍使用独立 `#confirmScrim`。

**drawer → 新建作业**：侧栏列表中的“新建作业”传入 `fromDrawer`，先等待 drawer 完整播放关闭动画并释放共享遮罩，再启动 newAssignmentPanel。重复请求共用同一个 Promise；若 drawer 关闭被手指接管而未到达 closed，本次打开请求结束，不能并行动画或强抢遮罩。该来源关闭新建面板后不把焦点转移到顶栏加号，避免紧接着横滑时 WebView 将旧输入续接到加号按钮。

**generation 令牌**：四类滑动面板由各自 `InteractiveLayerController` 持有唯一 generation；按钮、手势和动画接管共用。旧动画完成回调不得修改新状态。

**释放动画**：四类滑动面板位移仅经统一控制器调用 WAAPI；CSS 不设 transform transition（drawer 全屏 scale 除外）。top-sheet / scoreSheet 的 open 位移为 `0`；drawer 的 closed 位移为 `0`，open 位移为侧栏宽度。

**拖动后 click**：方向成立并完成拖动后，统一控制器按 pointerup 坐标登记一次 500ms click guard；只拦截同位置的延迟合成 click。连续拖动各自保留独立 guard，后一次拖动不能清除前一次；坐标不匹配的 click 也不能提前消耗其它 guard，避免 WebView 在动画结束后把旧 click 当成空白点击再次关闭面板。

### 手势守卫（`gesture-guards.js`）

触点 `closest()` 与浮层互斥集中在此；业务文件只绑定回调。

| 函数 | 用途 |
|------|------|
| `blocksQuickPanelPull()` / `canQuickPanelPullAtScrollTop()` | 下拉打开互斥与列表顶判断 |
| `blocksDrawerEdgeOpen()` | 边缘开 drawer 时拦 quickPanel / newAssignment / scoreSheet |
| `canStartQuickPanelPullOpen` | 下拉预览 + 释放打开 |
| `canStartQuickPanelInnerClose` | 面板内上滑关闭 |
| `canStartQuickPanelShellClose` | 面板外上滑关闭 |
| `canStartTopSheetInnerClose` / `canStartTopSheetShellClose` | newAssignment 内外关闭 |
| `canStartDrawerEdgeOpen` / `InnerClose` / `ShellClose` | drawer 三类横滑 |
| `canStartScoreSheetInnerClose` | scoreSheet 内下滑关闭 |
| `canStartScoreSheetShellClose` | scoreSheet 壳层下滑关闭 |
| `canStartToastDismiss` | toast 下滑关闭 |

| 模块 | 手势 | 守卫 |
|------|------|------|
| `panel-swipe.js` | quickPanel 下拉 / 内关 / 壳关 | `canStartQuickPanelPullOpen` 等 |
| `panel-swipe.js` | newAssignment 内外关 | `canStartTopSheetInnerClose` / `ShellClose` |
| `drawer-gestures.js` | 边缘 / 内 / 壳 | `canStartDrawerEdgeOpen` 等 |
| `score-swipe.js` | 内 / 壳下滑 | `canStartScoreSheetInnerClose` / `ShellClose` |
| `toast-swipe.js` | 下滑关闭 | `canStartToastDismiss`（`stopPropagation` 在 `toast-swipe.js`） |

**触点排除选择器**：`NAV_CHROME_SELECTOR`（与 `press-feedback` 共用）、`FORM_CONTROL_SELECTOR`、`FLOATING_UI_EXCLUDE_SELECTOR`、`PRIMARY_CHROME_SELECTOR`（顶栏 `.app-bar` 内菜单/图标/标题）、`QUICK_PANEL_SHELL_EXCLUDE_SELECTOR`、`OTHER_MODAL_PANELS_SELECTOR`、`DRAWER_FILTER_SELECTOR`、`QUICK_PANEL_HISTORY_SELECTOR`。`isPanelVisuallyOpen()` / `isConfirmPanelOpen()` / `isToastVisible()` 查可见态。`navigation.js` `bindEmptyAreaClose` 须 `isPrimaryChromeClick()` 早退。

关闭栈只管 Esc/后退/返回键 pop；各 `shouldStart` 按场景单独判断（打开与关闭方向相反、toast 用 `is-visible`、shell 关闭排除面板自身 DOM）。

### quickPanel

| 动作 | 绑定元素 | 守卫 |
|------|---------|------|
| 下拉打开 | `scrollContainer` | `canStartQuickPanelPullOpen` + `canQuickPanelPullAtScrollTop` |
| 面板内上滑关闭 | `#quickPanel` | `canStartQuickPanelInnerClose`（排除 `#quickPanelHistoryView`） |
| 面板外上滑关闭 | `appShell`（`targetEl: quickPanel`） | `canStartQuickPanelShellClose` |

下拉 `onPrepare`：`restoreQuickPanelViewFromPreference()` → `refreshQuickPanelContent(...)` → `beginQuickPanelPullPreview()`。

`closeFloatingPanels()` 须 `teardownQuickPanelDrag()` + `resetQuickPanelView()`；**不**清 `quickPanelPrefersHistoryView`。重开由 `restoreQuickPanelViewFromPreference()` 恢复子视图。

壳层关闭**不得**排除 `.scroll-container`（面板下空白与学生列表同容器）；排除 `#quickPanel` 即可避免与面板内手势重复。

### drawer

- `.drawer` 固定在底层；普通开合只移动 `#mainPage`。closed 为 `translateX(0)`，open 为侧栏宽度；主页活动时显示左侧圆角与描边，静止 open 后显示阴影。
- `.drawer:not(.is-open) { pointer-events: none }`：关闭后不挡主页；边缘预览时由 `.is-drawer-revealing` 临时启用。
- 切换作业先关 drawer（`assignments.js`）。
- `.drawer-filter` 内搜索/筛选不参与横滑（`canStartDrawerInnerClose` 放行）。
- 作业项按压：`.assignment-item-action` 在 `press-feedback.js` 单独处理；父项 `:active` 排除 `.assignment-item-actions`。

### drawer 全屏页（`drawer-fullscreen.js`）

设置 / 名单编辑从侧栏进入的全屏流程，**有意**不加入普通侧栏的触摸接管：

- 多段 CSS 编排：drawer `is-open` → `is-expanding` scale → 全屏 panel `opacity` → `snapResetDrawer` / `snapPrepareDrawer`；`expandDrawer` / `contractDrawer` 前须 `releaseLayerTransformLock(drawer)`（侧栏 WAAPI 滑入 `fill:forwards` 会盖住 CSS `scaleX`）；缩回靠 `.drawer.is-open` 的 `transform` transition。
- 普通侧栏稳定 open 后才进入全屏流程；展开和缩回时 drawer 临时升到 `#mainPage` 上方，退出后恢复圆角主页右移状态。
- 已共享 `waitForTransition`；`busyKey` 为 `drawer-fullscreen`；`beginTargetExplicitOpenAnimation` 登记互斥。

### scoreSheet

- 点击打开、按钮关闭和下滑手势均经 `scoreSheetController`；关闭真正完成后才保存即时打分并清理学生与输入状态，反向接管回 open 时不清理。
- 打开后短暂 `is-pointer-guarded` 防误触（仅挡 body 点击，不挡下滑关）；内关 / 壳关均经 `canStartScoreSheetInnerClose` / `canStartScoreSheetShellClose`（release 中、sheet busy、确认框）。
- **关闭可见性**（`components.css`）：`.score-sheet` 默认 `visibility:hidden` + `transform:translateY(100%)`；`.is-open` 与 `.is-motion-dragging` 为 `visibility:visible`。拖动/释放动画期间靠 `is-motion-dragging` 显示；结束后清掉该类即不可见，避免 WebView 合成层多画一帧错误 `transform` 时底部闪现。详见 `docs/gesture-animation-refactor-tracker.md`「可复用结论」。
- toast 指针事件 `stopPropagation`，不穿透 sheet。

### toast

- 仅 `is-visible` 响应下滑；阈值 48px；`formatTransform` 含 `translateX(-50%)`。
- `showToast` 先 `abortToastDismiss()`；手势关闭与定时淡出 (`is-fading-out`) 互不打架。
- 关闭后孤儿 `assignmentId` 调 `pruneAssignmentHistoryIfOrphan()`。

### 验收清单

**quickPanel**：列表顶下拉（够/不够阈值）；内外上滑关闭；操作记录视图轻微上滑不误关；主/操作记录切换高度不变；快速连滑无残留 transform。

**drawer**：边缘开 / 内关 / 壳关；筛选可输入；关闭后列表可滚动点击；切作业先关 drawer。

**scoreSheet**：点开、防误触、下滑关；打开后其它入口不抢手势；toast 不穿透；**下滑关后视口底无闪现**（Android）。

**浮层冲突**：确认框阻断底下手势；打开动画中不可交叉打开；收起动画中打开另一浮层前先瞬间结束旧收起；四类滑动面板允许接管自己的未完成动画。

**异常**：快速来回滑无残留 transform；`pointercancel` 后界面干净；Android 不闪关；返回键/Esc 关闭顺序不变。

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
- **scoreSheet 下滑关后底部闪现**：勿再绕 transform / `is-open` / WAAPI `cancel` 顺序 PATCH；关闭态用 `visibility:hidden`，手势期靠 `is-motion-dragging` 保持 `visible`。全文见 `docs/gesture-animation-refactor-tracker.md`「可复用结论」。
- **设置全屏伸展/缩回消失**：侧栏 WAAPI 结束后 `fill:forwards` 占住 transform；`gesture-motion-engine` 须在 `commitStyles` 后 `cancel()`；全屏 `expand`/`contract` 前 `releaseLayerTransformLock`。

### dev.ps1 / 无线 adb

- 会话内热键：**1** 重建 dist、**2** 安装 Android、**0** 退出（原 B/R/Q）。
- **Invoke-Adb** 用 `Invoke-Adb -Command @('devices')`；禁止 `Invoke-Adb devices`。
- 多设备：优先 `adbWireless` IP；`Get-AdbReadyDevices` 过滤假序列号。
- 无线调试：`Connect-AdbWirelessAuto` 先 `adb mdns services`（`_adb-tls-connect._tcp`）再连配置里的 `adbWireless`；成功会回写 `dev-device.local.json`。
- **StrictMode**：管道结果 `@(...).Count`；端口插值 `"${host}:"` 非 `"$host:"`。
- **Gradle**：看 `BUILD SUCCESSFUL` / `Installed on N device`；装前 `Resolve-AdbDevices` + `ANDROID_SERIAL`。
- **adb reverse** 无线常失败 → 降级 LAN；排障 `adb kill-server; adb start-server; adb connect IP:端口`。

### 顶栏 / 当前作业

- `#quickPanel`：`quick-settings-card` 三行；行可点，`switch` 上 `stopPropagation`。
- `showBarXxx`（默认 true，`!== false`）→ 设置页 switch → `render/*` 设 `hidden`；备份同步 `backup.js`。
- **`[hidden]` 陷阱**：`.icon-button` / `.bar-stats` 须 `[hidden] { display: none !important; }`。
- 顶栏打分 → `render/scoringMode.js`；已交人数 → `render/progress.js`（`#barStats`）。
- `instantScoringMode` → 设置页/当前作业 switch → 打分 sheet 隐藏取消/确认、显示重置；分数/备注变更时静默保存，面板关闭或 ×10 自动确认时再写历史并提示。

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
