# ASMC4 — HTML & UI/UX 术语汇总

## 一、容器与布局

| 术语 | 说明 |
|---|---|
| `.phone` | 手机外壳容器，`width: min(100vw, 430px)`，居中显示 |
| `.app-bar` | 顶栏（44px），含菜单钮、标题、进度条、右侧操作钮 |
| `.scroll-container` | 可滚动内容区，`flex: 1; overflow-y: auto` |
| `.grid` | 学生卡片网格，5 列，gap 8px |
| `.drawer` | 左抽屉，`width: min(78%, 310px)`，`translateX(-120%)` 进出 |
| `.center-panel` | 居中弹窗面板（新建作业、快捷面板、确认框），z-index 60 |
| `.top-sheet-handle` | 顶置面板底部拖拽手柄装饰（36×4px 圆角条） |
| `.score-sheet` | 底部上滑打分面板（底部弹出，border-radius 24px 顶部圆角） |
| `.roster-editor` | 全屏花名册编辑器（inset: 0，z-index 70） |
| `.drawer-scrim` / `.modal-scrim` / `.confirm-scrim` / `.score-sheet-scrim` | 遮罩层（半透明，z-index 层级递增） |

## 二、UI 控件与组件

| 术语 | 说明 |
|---|---|
| `.student-card` | 学生卡片，`aspect-ratio: 1/1`，三态切换 |
| `.badge` | 卡片右上角分数标记 |
| `.serial` | 左下角序号装饰（大号斜体半透明） |
| `.name` | 学生姓名 |
| `.note-text` | 卡片底部备注小字 |
| `.progress-bar` | 顶栏底部细进度条（2px），`transform: scaleX(var(--progress))` |
| `.switch` | 开关控件（46×28px 胶囊，knob 滑动 18px） |
| `.field` | 通用输入框（`border-radius: 16px`，`box-shadow` 样式） |
| `.numpad-btn` | 打分面板数字键（58px 高，3 列网格） |
| `.numpad-btn-function` | 功能键（×10、退格），灰底有边框 |
| `.score-tens-btn` | ×10 模式切换键，绿底白字 `is-on` 状态 |
| `.score-display` | 大号分数显示屏（80px 高，48px 字重） |
| `.score-note-input` / `.score-note-clear` | 分数备注输入框 + 清除钮 |
| `.score-action-btn` / `.score-action-primary` | 打分面板底部操作钮（取消 / 确认） |
| `.quick-chip` | 快捷切换作业的胶囊按钮（`border-radius: 999px`） |
| `.assignment-item` | 抽屉列表中的作业项（54px 高，左右结构） |
| `.assignment-item-add` | 新建作业的虚线加号按钮 |
| `.assignment-subject-tag` | 科目标签（绿底绿字小标签） |
| `.assignment-edit-input` | 作业行内编辑输入框（焦点绿框） |
| `.quick-action-btn` / `.quick-action-btn.danger` | 快捷面板操作钮（反选提交 / 删除作业） |
| `.dialog-button` / `.primary` / `.danger` | 弹窗双按钮（取消 + 确认，绿 / 红两色） |
| `.roster-row` | 名单编辑行（含拖拽手柄、输入框、删除钮） |
| `.roster-row-handle` | 拖拽手柄（`cursor: grab`，`touch-action: none`） |
| `.roster-row-nonenglish` | 非英专 checkbox 行 |
| `.roster-add-row` | 添加学生虚线按钮 |
| `.sr-only` | 屏幕阅读器专属（`clip: rect` 隐藏但可访问） |
| `.chevron` | 标题旁下拉箭头（CSS border 三角实现） |

## 三、CSS 设计概念

| 术语 | 说明 |
|---|---|
| `--bg` / `--card` / `--text` / `--muted` | CSS 设计变量（design-tokens.css），主题色集中管理 |
| `--motion: cubic-bezier(.2, .8, .2, 1)` | 统一缓动曲线，所有动画共用 |
| `--shadow: 0 1px 0…` | 卡片轻投影 |
| `--panel-shadow: 0 22px 70px…` | 弹窗重阴影 |
| `no-anim` | 无动画 class（抽屉 / 编辑器初始或关闭时禁用 transition） |
| `is-open` / `is-pressed` / `is-on` / `is-active` | BEM-like 状态 class |
| `is-registered` / `no-registration` | 学生三态的两种特殊样式（已交 / 未交） |
| `is-flashing` | 确认框边框闪烁动画（`confirm-flash`） |
| `focus-visible` | 键盘焦点圈 |
| `touch-action: manipulation` | 移动端防双击缩放 |
| `-webkit-overflow-scrolling: touch` | iOS 顺滑滚动 |
| `appearance: none` / `-webkit-appearance: none` | 重置按钮默认样式 |
| `-webkit-tap-highlight-color: transparent` | 移动端点触高亮消除 |

## 四、交互与手势

| 术语 | 说明 |
|---|---|
| 学生三态 | `normal`（未交灰色）/ `registered`（已交深绿）/ `none`（未布置半透明） |
| 点切 | 直接点击学生卡片切换三态，就地更新 DOM class + 部分渲染 |
| 长按 | `LONG_PRESS_MS = 400ms`，长按打开打分面板 |
| 打分模式 | 开关开启后点击卡片直接打开打分面板，无需长按 |
| ×10 模式 | 数字键按一次输入十位，便于快速打分 |
| 滑动手势 | `score-swipe` 打分面板拖拽关闭；`drawer-gestures` 抽屉拖拽展开宽度 |
| Esc 关闭优先级 | 确认框 > 打分面板 > 花名册编辑 / 设置 > 快捷面板 / 新建作业 > 抽屉 |

## 五、JS 架构概念

| 术语 | 说明 |
|---|---|
| ESM 模块 | 42 个 ES Module 文件，`<script type="module">` 加载 |
| `state.js` | 核心枢纽，`appState` 模块私有，`getState()` 只读访问 |
| `saveAppState()` | 将状态序列化写入 `localStorage["asmc4_assignments_v1"]` |
| `render()` | 全量渲染编排 + 7 个子渲染函数 |
| `dom-refs.js` | DOM 引用集中地，`querySelector` 唯一出口 |
| `escapeHTML()` | 5 字符转义（`& < > " '`） |
| `clone()` | 深拷贝（`JSON.parse(JSON.stringify(value))`） |
| `events/` | 按功能拆分的事件绑定模块 |
| `gestures/` | 副作用模块，滑动与拖拽 |
| `business/` | 业务逻辑（作业、学生、花名册） |
| 事件委托 | 使用 class 委托，而非逐元素绑定 |

## 六、数据结构

| 术语 | 说明 |
|---|---|
| `STATUS` | `{ NORMAL, REGISTERED, NONE }` 三态枚举 |
| `STORAGE_KEY` | `"asmc4_assignments_v1"` |
| 天干地支 | `STEMS: ["甲","乙"…]` 10 个，`BRANCHES: ["子","丑"…]` 12 个，组合 60 花名代号 |
| `defaultStudents` | 50 人默认花名册 |
| `pendingConfirmAction` | 运行时可变状态，待确认操作 |

## 七、可访问性（a11y）

| 使用方式 | 示例 |
|---|---|
| `aria-label` | 按钮 / 面板标签（`aria-label="打开作业列表"`） |
| `aria-hidden="true"` | 隐藏装饰元素 |
| `role="button"` | 非 button 元素模拟按钮 |
| `role="progressbar"` | 进度条语义 |
| `aria-live="polite"` | 实时状态公告（`#liveStatus`） |
| `.sr-only` | 视觉隐藏但屏幕阅读器可读 |
