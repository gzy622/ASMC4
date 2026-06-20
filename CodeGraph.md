# CodeGraph — index.html 代码地图

> 面向修改、调试与问题修复的代码索引。行号会随改动漂移，使用函数名/选择器为准。

## 1. 项目概览

- 单文件应用：`index.html`（HTML + 内联 CSS + 内联 vanilla JS，无构建、无依赖、无框架）。
- 运行方式：浏览器直接打开；无服务端。
- 持久化：`localStorage`，键名 `homework_ui_assignments_v4`。
- 语言/字符集：`zh-CN`，UTF-8。
- 仓库现状：`index.html` 有未提交改动（见 `git diff`）；分支 `main`。

## 2. 文件清单

| 路径 | 类型 | 行数 | 用途 |
|---|---|---|---|
| `index.html` | HTML+CSS+JS 单文件 | — | 全部 UI 与逻辑 |
| `CodeGraph.md` | 文档 | — | 本文件，代码地图 |
| `README.md` | 文档 | — | 开发者自述 |

无 `package.json`、无构建脚本、无测试目录、无 `AGENTS.md`。

## 3. HTML 区域索引（行号区间）

| 区块 | 行号 | 关键 id/选择器 | 说明 |
|---|---|---|---|
| `<head>` / meta | 1–12 | `meta[theme-color]`、`title` | 标题默认“0619作业 UI” |
| `<style>` | 13–778 | — | 全部样式，见 §4 |
| `.phone` 主容器 | 782 | `main.phone` | 430×932 模拟手机视口 |
| `.app-bar` 顶栏 | — | `#menuButton` `#titleButton` `#assignmentTitle` `#settingsButton` `#addButton` `#progressBar` | 标题（可点击打开快捷面板）/菜单/打分模式切换/新增/进度条 |
| `.scroll-container` + 网格 | — | `#studentGrid` | 学生卡片由 JS 注入 |
| 抽屉 `.drawer` | — | `#drawerScrim` `#assignmentDrawer` `#assignmentList` `#drawerCloseButton` | 纯作业列表导航 |
| 模态遮罩 | — | `#modalScrim` | 居中面板共用遮罩 |
| 快捷面板 | — | `#quickPanel` `#quickPanelCloseButton` `#quickAssignmentList` `.quick-chip` `#hideNameSwitch` `#invertButton` `#deleteAssignmentButton` | 居中弹出：精简作业选择器（横向 chips）+ 快速设置（姓名/反选/删除） |
| 新建作业面板 | — | `#newAssignmentPanel` `#newAssignmentInput` `#newAssignmentCreateButton` | 输入框 maxlength=24 |
| 确认对话框 | — | `#confirmPanel` `#confirmTitle` `#confirmMessage` `#confirmOkButton` `#confirmCancelButton` | 二次确认（删除/反选） |
| 打分面板（底部弹出） | — | `#scoreSheet` `#scoreSheetScrim` `.score-numpad` | 数字键盘打分 |
| 无障碍播报 | — | `#liveStatus` | `aria-live` 公告区 |

## 4. CSS 区段索引（行号区间）

| 区段 | 行号 | 关键类 | 用途 |
|---|---|---|---|
| 设计变量 `:root` | — | `--bg` `--card` `--text` `--muted` `--line` `--shadow` `--panel-shadow` `--motion` | 改主题色/缓动只动这里 |
| 标题点击 | — | `.title-wrap` `:active` | 打开快捷面板入口，`cursor:pointer` + `user-select:none` |
| 圆形按钮 | — | `.nav-button` `.icon-button` `.icon-button.is-on` | 38×38，打分模式时绿色激活态 |
| 抽屉本体 | — | `.drawer` `.drawer-head` `.drawer-list` `.assignment-item` | 左滑 320ms，纯导航列表 |
| 快捷面板 chips | — | `.quick-assignment-selector` `.quick-chip` `.quick-chip.is-active` | 横向滚动药丸标签，当前作业绿色高亮 |
| 面板体分隔线 | — | `.panel-body-divider` | 1px 浅线，区分 chips 与设置项 |
| 设置行/动作 | — | `.setting-row` `.setting-action` `.setting-action.danger` | 标题+描述+开关/按钮（快捷面板内复用） |
| 开关 | — | `.switch` `.switch-knob` `.switch.is-on` | 46×28，旋钮位移 18px |

## 5. JS 模块索引（行号区间）

### 5.1 常量与默认数据
| 项 | 行号 | 说明 |
|---|---|---|
| `STORAGE_KEY` | 921 | `"homework_ui_assignments_v4"`，改名=清空用户数据 |
| `STATUS` | 923–927 | `NORMAL`/`REGISTERED`/`NONE` 三态枚举 |
| `STEMS` / `BRANCHES` | 929–930 | 天干地支，用于隐藏姓名时的代号 |
| `defaultStudents` | 932–988 | 50 人硬编码花名册（id/serial/name/status/badge/badgeType） |
| `defaultAssignment` | 990–995 | 默认作业 `assignment-0619`，`students` 为深拷贝 |

### 5.2 全局状态与 DOM 引用
| 项 | 说明 |
|---|---|
| `appState` | `loadAppState()` 返回，含 `scoringMode` 字段 |
| DOM 引用块 | 所有 `querySelector` 集中于此，改 id 先改这里 |
| `pendingConfirmAction` | 当前确认回调，`null` 表示无待确认 |
| `scoreSheetStudent` | 当前打分学生引用 |
| `scoreInputValue` | 打分键盘输入值 |
| `longPressTimer` / `longPressTriggered` | 长按 400ms 防抖 |

### 5.3 事件绑定
| 触发源 | 处理 |
|---|---|
| `#menuButton` click | `openDrawer` |
| `#drawerCloseButton` / `#drawerScrim` click | `closeDrawer` |
| `#settingsButton` click | `toggleScoringMode`（翻转 `scoringMode` 并持久化） |
| `#titleButton` click / Enter / Space | `openQuickPanel`（打开快捷面板） |
| `#quickPanelCloseButton` click | `closeAllCenterPanels` |
| `#quickAssignmentList` click（委托） | 切换 `currentAssignmentId` → `render` → 关面板 |
| `#addButton` click | `openNewAssignmentPanel` |
| `#newAssignmentClose` / `Cancel` click | `closeAllCenterPanels` |
| `#newAssignmentCreate` click | `createAssignmentFromDialog` |
| `#modalScrim` click | 关闭居中面板，但确认框打开时不响应 |
| `#assignmentList` click（委托） | 切换 `currentAssignmentId` 后 `render` |
| `#studentGrid` click（委托） | 打分模式→`openScoreSheet`；否则→`toggleStudent`；`NONE` 不响应 |
| `#hideNameSwitch` click | 翻转 `hideNames` |
| `#invertButton` click | 走确认 → `invertCurrentAssignmentSubmission` |
| `#deleteAssignmentButton` click | 走确认（danger）→ `deleteCurrentAssignment` |
| `#confirmCancelButton` click | `closeConfirm` |
| `#confirmOkButton` click | 执行 `pendingConfirmAction` |
| `document` keydown Esc | 优先级：确认框 > 打分面板 > 新建作业面板 > 抽屉 |
| `#newAssignmentInput` keydown Enter | 等价于点创建 |
| `grid` touchstart/touchend/touchcancel/mousedown/mouseup/mouseleave | 长按 400ms 调出打分面板 |

### 5.4 渲染函数
| 函数 | 作用 | 调用方 |
|---|---|---|
| `render()` | 总入口：标题→学生→列表→姓名开关→快捷选择器→打分模式→进度 | 启动、所有状态变更后 |
| `renderStudents()` | 用 `innerHTML` 重建 50 张卡片 | `render` |
| `renderAssignmentList()` | 重建抽屉里的作业项 | `render` |
| `renderSettingsState()` | 同步姓名开关的 `is-on`/`aria-pressed` | `render` |
| `renderScoringMode()` | 同步打分按钮的 `is-on`/`aria-pressed`/`aria-label` | `render` |
| `renderQuickAssignmentList()` | 重建快捷面板中的横向 chips 选择器 | `render` |
| `renderProgress()` | 写 `--progress` 与 `aria-valuenow` | `render` |

### 5.5 面板/抽屉控制
| 函数 | 作用 |
|---|---|
| `openDrawer()` / `closeDrawer()` | 切 `is-open` 与 `aria-hidden` |
| `openQuickPanel()` | 关闭打分面板/抽屉/其他面板后，打开快捷面板 + 遮罩 |
| `openNewAssignmentPanel()` | 清空输入、聚焦 |
| `closeAllCenterPanels()` | 关快捷/新建/确认，并收遮罩 |
| `openConfirm(opts)` | 保存回调、填文案、切 danger 样式 |
| `closeConfirm()` | 清回调；若新建/快捷面板未开则收遮罩 |
| `openScoreSheet(student)` | 打开打分面板，回填已有分数 |
| `closeScoreSheet()` | 关打分面板与遮罩 |
| `updateScoreDisplay()` | 同步数字键盘输入值 |
| `appendDigit(d)` / `multiplyScore()` / `confirmScore()` | 打分键盘逻辑 |

### 5.6 业务操作
| 函数 | 作用 | 副作用 |
|---|---|---|
| `toggleScoringMode()` | 翻转 `appState.scoringMode` 并持久化 | `saveAppState` |
| `createAssignmentFromDialog()` | 新建作业，`unshift` 到列表头并切为当前 | `saveAppState` |
| `createFreshStudentsFrom(students)` | 复制花名册，重置为 NORMAL（NONE 保留），清 badge | 纯函数，返回新数组 |
| `invertCurrentAssignmentSubmission()` | NORMAL↔REGISTERED 互换；NONE 不动；清/补"已交"标记 | `saveAppState` |
| `deleteCurrentAssignment()` | 删除当前作业，切相邻项；空则建空白作业 | `saveAppState` |
| `toggleStudent(student)` | 单卡点击：NORMAL↔REGISTERED，清 submit badge | `saveAppState` |

### 5.7 持久化与规整
| 函数 | 作用 | 易错点 |
|---|---|---|
| `loadAppState()` | 读 localStorage，解析失败/为空→回退默认；含 `scoringMode` 字段（`Boolean(parsed.scoringMode)` 降级） | 任何异常都静默回退 |
| `saveAppState()` | 整体 `JSON.stringify` 写回 | 无节流，每次操作都写 |
| `normalizeAssignment()` | 补字段、规整 id/title/createdAt | id 缺失会用 `assignment-{index}` |
| `normalizeStudent()` | 补 serial/name/status/badge/badgeType/updatedAt | status 非枚举值→降级 NORMAL；badgeType 不校验 |

### 5.8 纯工具函数
| 函数 | 作用 |
|---|---|
| `getCurrentAssignment()` | 取当前作业；找不到则回落第一个并修正 id |
| `getAssignmentStats(assignment)` | 统计已交/总数/未交（NONE 不计入） |
| `getStateClass(student)` | 返回 `is-registered`/`no-registration`/`""` |
| `getDisplayName(student, index)` | `hideNames` 开→天干地支，否则真名 |
| `getStemBranchName(index)` | `STEMS[i%10] + BRANCHES[i%12]` |
| `getCardAriaLabel(student, index)` | 拼无障碍标签 |
| `getStatusText(status)` | "已登记"/"无登记"/"普通状态" |
| `makeDefaultAssignmentTitle()` | `MMDD作业` |
| `makeId(prefix)` | `prefix-时间戳-随机16进制` |
| `escapeHTML(value)` | 转义 5 个字符，渲染用户输入前必经 |
| `clone(value)` | `JSON.parse(JSON.stringify)` 深拷贝 |
| `announce(message)` | 写 `#liveStatus` 触发屏读器播报 |
| `handleLongPressStart(event)` / `handleLongPressEnd()` | 长按 400ms 防抖，调 `openScoreSheet` |

## 6. 函数调用关系

```
启动
  loadAppState() ──┬─> normalizeAssignment() ─> normalizeStudent()
                   └─> 失败回退 defaultAssignment(clone defaultStudents)
  render() ──┬─> renderStudents()
             ├─> renderAssignmentList()
             ├─> renderSettingsState()
             ├─> renderQuickAssignmentList()
             ├─> renderScoringMode()
             └─> renderProgress()

用户交互
  点卡片（打分模式关） grid click ─> toggleStudent() ─> saveAppState() ─> render()
  点卡片（打分模式开） grid click ─> openScoreSheet(student) ─> confirmScore() ─> saveAppState() ─> render()
  长按卡片        longPress ─> openScoreSheet(student) ─> confirmScore() ─> saveAppState() ─> render()
  打分模式切换    settingsButton click ─> toggleScoringMode() ─> saveAppState() ─> render()
  打开快捷面板    titleButton click ─> openQuickPanel()
  快捷面板内选作业  quick chip click ─> 改 currentAssignmentId ─> saveAppState() ─> render() ─> closeAllCenterPanels()
  点作业项（抽屉）  list click ─> 改 currentAssignmentId ─> saveAppState() ─> render()
  姓名开关        hideNameSwitch click ─> 翻转 hideNames ─> saveAppState() ─> render()
  反选            invertButton click ─> openConfirm() ─> confirmOk ─> invertCurrentAssignmentSubmission()
  删除作业        deleteAssignmentButton click ─> openConfirm(danger) ─> confirmOk ─> deleteCurrentAssignment()
  新建作业        addButton click ─> openNewAssignmentPanel() ─> createAssignmentFromDialog()
                                                              └> createFreshStudentsFrom()
  Esc             keydown ─> closeConfirm() / closeScoreSheet() / closeAllCenterPanels(快捷/新建) / closeDrawer()
```

## 7. 数据模型

### 7.1 Student（学生）
```ts
{
  id: number;            // 1..50，与 dataset.id 用 String 比较
  serial: string;        // "01".."50"，两位补零
  name: string;
  status: "normal" | "registered" | "none";
  badge: string;         // 显示在右上角，如 "98"/"已交"/"需重写"/"已阅"
  badgeType: "" | "score" | "submit" | "note" | "review";  // 仅用于逻辑判断，未做枚举校验
  updatedAt?: string;    // toggleStudent 时写 ISO 时间；旧数据可能缺
}
```

### 7.2 Assignment（作业）
```ts
{
  id: string;            // "assignment-0619" 或 makeId 生成
  title: string;
  createdAt: string;     // ISO
  students: Student[];
}
```

### 7.3 AppState（顶层）
```ts
{
  hideNames: boolean;
  scoringMode: boolean;        // 打分模式，持久化；老数据自动降级 false
  currentAssignmentId: string;
  assignments: Assignment[];   // 新建项 unshift 到头部
}
```

## 8. 状态机（status 流转）

```
            toggleStudent / invert
  NORMAL  ───────────────────────►  REGISTERED
    ▲                                  │
    │  toggleStudent / invert          │
    └──────────────────────────────────┘

  NONE  ──(toggleStudent 直接 return)──►  NONE   （锁定，不可点击切换）
  NONE  ──(invert 直接 return)────────►  NONE

invert 细节：
  REGISTERED + badgeType==="submit" 或 badge==="已交"  →  降为 NORMAL 并清 badge
  REGISTERED + 其他 badge（score/note/review）         →  降为 NORMAL 但保留 badge
  NORMAL + 无 badge                                    →  升为 REGISTERED 并补 "已交"
  NORMAL + 有 badge                                    →  升为 REGISTERED 但保留 badge
```

> 注意：`invert` 对“NORMAL+已有分数”会变成“REGISTERED+分数”，可能与产品预期不符。修复点在 `invertCurrentAssignmentSubmission` 1341–1368。

## 9. localStorage 持久化

- 键名：`homework_ui_assignments_v4`（`STORAGE_KEY`，index.html:921）。
- 写入：`saveAppState()` 整体 `JSON.stringify(appState)`，无节流、无 try/catch（配额超限会抛错且未被捕获）。
- 读取：`loadAppState()` 带 try/catch，任何异常→回退默认作业。
- 版本/迁移：**无迁移机制**。改 `STORAGE_KEY` 即放弃旧数据；不改键名但改结构时，`normalizeAssignment`/`normalizeStudent` 兜底补字段。
- 清空用户数据：DevTools → Application → Local Storage → 删 `homework_ui_assignments_v4`，或控制台 `localStorage.removeItem("homework_ui_assignments_v4")`。

## 10. 脆弱点 / 易错点清单

| # | 位置 | 风险 | 修复建议 |
|---|---|---|---|
| 1 | `STORAGE_KEY` 921 | 改键名=静默清空用户作业 | 若要升级结构，保留旧键做迁移读取 |
| 2 | `loadAppState` 1447 | catch 吞所有错，用户无感知数据已回退 | 至少 `console.warn` 或 `announce` 提示 |
| 3 | `saveAppState` 1453 | 无 try/catch，配额满会抛未捕获异常 | 包 try/catch + 用户提示 |
| 4 | `normalizeStudent` 1472 | `badgeType` 不校验，旧数据可能含任意字符串 | 用枚举白名单过滤 |
| 5 | `invertCurrentAssignmentSubmission` 1341 | NORMAL+score 反选后变 REGISTERED+score，语义混淆 | 明确策略：反选时是否清非 submit badge |
| 6 | `defaultStudents` 932 | 改花名册只影响新用户；老用户从 localStorage 读旧数据 | 提供“重置花名册”入口或按版本号合并 |
| 7 | `setThemeColor` 1234/1241 | open/close 都传 `#f4f4f4`，实际无差别，疑似未完成 | 如需差异化，按抽屉开闭传不同色 |
| 8 | `clone` 1555 | `JSON` 法无法复制 `undefined`/函数；当前数据全是 JSON 兼容，安全 | 保留现状即可，勿塞非 JSON 值 |
| 9 | `makeId` 1541 | `Date.now()+Math.random` 理论可撞，未做去重 | 容忍；或换 `crypto.randomUUID()` |
| 10 | `renderStudents` 1163 | 每次 `innerHTML` 全量重建，50 卡片尚可，扩展到上百项会卡 | 大数据量考虑差量更新或虚拟列表 |
| 11 | `grid click` 1065 | 用 `String(item.id)===card.dataset.id` 比较，id 必须稳定唯一 | 勿用纯数字可能的前导零问题；serial 仅显示，不参与匹配 |
| 12 | `modalScrim click` 1051 | 确认框打开时点遮罩不关，但用户可能误以为卡死 | 可考虑点击遮罩=取消确认，或显式提示 |
| 13 | `Esc` 优先级 1124 | 确认框开时 Esc 只关确认框，不关底层面板，符合预期但需知晓 | 行为正确，记录即可 |
| 14 | `#newAssignmentPanel` top:35% 478 | 硬编码偏移，与 `.center-panel` 默认 50% 不一致 | 如需统一，移到 CSS 变量 |

## 11. 常见修改速查

| 需求 | 改这里 |
|---|---|
| 改主题色/缓动 | `:root` 14–24 |
| 改学生网格列数 | `.grid` 190–195 的 `repeat(5, …)` |
| 改花名册初始数据 | `defaultStudents` 932–988 |
| 改默认作业标题 | `defaultAssignment` 990–995、`makeDefaultAssignmentTitle` 1534 |
| 新增顶栏按钮 | HTML `.right-actions` 内 + JS DOM 引用 + 事件绑定区 |
| 新增设置项 | HTML `#quickPanel .panel-body` 内 + JS 引用 + 事件 + `renderSettingsState` |
| 新增打分/快捷面板逻辑 | `openScoreSheet` / `confirmScore` / `appendDigit` / `toggleScoringMode` / `renderScoringMode` / `openQuickPanel` / `renderQuickAssignmentList` |
| 新增状态值 | `STATUS` + `getStateClass` + `getStatusText` + CSS 三态样式 |
| 改持久化键/结构 | `STORAGE_KEY` + `loadAppState`/`saveAppState`/`normalize*` |
| 改进度条颜色 | `.progress-bar::after` background |
| 改抽屉宽度 | `.drawer` width |
