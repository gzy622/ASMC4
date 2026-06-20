# CodeGraph — index.html 代码地图

> 面向修改、调试与问题修复的代码索引。所有行号基于当前工作区 `index.html`（共 1563 行）。
> 行号会随改动漂移，使用时请以函数名/选择器为准，行号仅作锚点。

## 1. 项目概览

- 单文件应用：`index.html`（HTML + 内联 CSS + 内联 vanilla JS，无构建、无依赖、无框架）。
- 运行方式：浏览器直接打开；无服务端。
- 持久化：`localStorage`，键名 `homework_ui_assignments_v4`。
- 语言/字符集：`zh-CN`，UTF-8。
- 仓库现状：`index.html` 有未提交改动（见 `git diff`）；分支 `master`。

## 2. 文件清单

| 路径 | 类型 | 行数 | 用途 |
|---|---|---|---|
| `index.html` | HTML+CSS+JS 单文件 | 1563 | 全部 UI 与逻辑 |
| `CodeGraph.md` | 文档 | — | 本文件，代码地图 |
| `README.md` | 文档 | — | 开发者自述 |

无 `package.json`、无构建脚本、无测试目录、无 `AGENTS.md`。

## 3. HTML 区域索引（行号区间）

| 区块 | 行号 | 关键 id/选择器 | 说明 |
|---|---|---|---|
| `<head>` / meta | 1–12 | `meta[theme-color]`、`title` | 标题默认“0619作业 UI” |
| `<style>` | 13–778 | — | 全部样式，见 §4 |
| `.phone` 主容器 | 782 | `main.phone` | 430×932 模拟手机视口 |
| `.app-bar` 顶栏 | 783–814 | `#menuButton` `#assignmentTitle` `#settingsButton` `#addButton` `#progressBar` | 标题/菜单/设置/新增/进度条 |
| `.scroll-container` + 网格 | 816–818 | `#studentGrid` | 学生卡片由 JS 注入 |
| 抽屉 `.drawer` | 820–833 | `#drawerScrim` `#assignmentDrawer` `#assignmentList` `#drawerCloseButton` | 作业列表侧栏 |
| 模态遮罩 | 835 | `#modalScrim` | 居中面板共用遮罩 |
| 设置面板 | 837–869 | `#settingsPanel` `#hideNameSwitch` `#invertButton` `#deleteAssignmentButton` | 快捷设置 |
| 新建作业面板 | 871–889 | `#newAssignmentPanel` `#newAssignmentInput` `#newAssignmentCreateButton` | 输入框 maxlength=24 |
| 确认对话框 | 891–904 | `#confirmPanel` `#confirmTitle` `#confirmMessage` `#confirmOkButton` `#confirmCancelButton` | 二次确认（删除/反选） |
| 无障碍播报 | 906 | `#liveStatus` | `aria-live` 公告区 |
| `<script>` | 909–1561 | — | 全部逻辑，见 §5 |

## 4. CSS 区段索引（行号区间）

| 区段 | 行号 | 关键类 | 用途 |
|---|---|---|---|
| 设计变量 `:root` | 14–24 | `--bg` `--card` `--text` `--muted` `--line` `--shadow` `--panel-shadow` `--motion` | 改主题色/缓动只动这里 |
| 重置 | 26–46 | `*` `html` `body` | body 用 grid 居中 phone |
| 手机壳 `.phone` | 48–56 | `.phone` | `min(100vw,430px) × min(100dvh,932px)` |
| 滚动容器 | 58–67 | `.scroll-container` | 隐藏滚动条 |
| 顶栏 | 69–76 | `.app-bar` | 高 44px，无底边线（进度条代替） |
| 进度条 | 78–101 | `.progress-bar` `::after` | 用 `--progress`（0–1）做 `scaleX` |
| 圆形按钮 | 103–135 | `.nav-button` `.icon-button` | 38×38，`:active` 变灰 |
| 标题区 | 137–176 | `.title-wrap` `.title-line` `.chevron` | 居中、溢出省略 |
| 右侧操作组 | 178–188 | `.right-actions` | 绝对定位右侧 14px |
| 学生网格 | 190–195 | `.grid` | 5 列等分，间距 8px |
| 学生卡片 | 197–313 | `.student-card` `.serial` `.badge` `.name` + `.is-registered` `.no-registration` | 三态样式分支 |
| 抽屉/模态遮罩 | 315–351 | `.drawer-scrim` `.modal-scrim` | 已移除 `backdrop-filter`，纯色叠加 |
| 抽屉本体 | 353–402 | `.drawer` `.drawer-head` `.drawer-list` `.assignment-item` | 左滑 320ms，`translateX(-120%)` |
| 居中面板 | 452–476 | `.center-panel` `#newAssignmentPanel` | 缩放+淡入；新建面板 `top:35%` |
| 面板头/体/关闭 | 482–515 | `.panel-head` `.panel-body` `.panel-close` | 通用结构 |
| 设置行/动作 | 517–583 | `.setting-row` `.setting-action` `.setting-action.danger` | 标题+描述+开关/按钮 |
| 开关 | 585–631 | `.switch` `.switch-knob` `.switch.is-on` | 46×28，旋钮位移 18px |
| 输入框 | 633–649 | `.field` | 16px 字号防 iOS 缩放 |
| 对话框按钮 | 651–682 | `.dialog-actions` `.dialog-button` `.primary` `.danger` | 两列等分 |
| 确认框 | 684–696 | `.confirm-panel` `.confirm-message` | z-index 80，最高层 |
| 无障碍 | 698–708 | `.sr-only` | 视觉隐藏 |
| 媒体查询 | 710–777 | `min-width:431px` `max-width:360px` | 桌面圆角阴影 / 小屏紧凑 |

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
| 项 | 行号 | 说明 |
|---|---|---|
| `appState` | 997 | `loadAppState()` 返回，启动即加载 |
| DOM 引用块 | 999–1032 | 所有 `querySelector` 集中于此，改 id 先改这里 |
| `pendingConfirmAction` | 1034 | 当前确认回调，`null` 表示无待确认 |
| 初始 `render()` | 1036 | 同步首屏 |

### 5.3 事件绑定（行号 1038–1146）
| 触发源 | 行号 | 处理 |
|---|---|---|
| `#menuButton` click | 1038 | `openDrawer` |
| `#drawerCloseButton` / `#drawerScrim` click | 1039–1040 | `closeDrawer` |
| `#settingsButton` click | 1042 | `openSettingsPanel` |
| `#settingsCloseButton` click | 1043 | `closeAllCenterPanels` |
| `#addButton` click | 1045 | `openNewAssignmentPanel` |
| `#newAssignmentClose` / `Cancel` click | 1046–1047 | `closeAllCenterPanels` |
| `#newAssignmentCreate` click | 1048 | `createAssignmentFromDialog` |
| `#modalScrim` click | 1050–1053 | 关闭居中面板，但确认框打开时不响应 |
| `#assignmentList` click（委托） | 1055–1063 | 切换 `currentAssignmentId` 后 `render` |
| `#studentGrid` click（委托） | 1065–1074 | `toggleStudent` |
| `#hideNameSwitch` click | 1076–1081 | 翻转 `hideNames` |
| `#invertButton` click | 1083–1097 | 走确认 → `invertCurrentAssignmentSubmission` |
| `#deleteAssignmentButton` click | 1099–1114 | 走确认（danger）→ `deleteCurrentAssignment` |
| `#confirmCancelButton` click | 1116 | `closeConfirm` |
| `#confirmOkButton` click | 1118–1122 | 执行 `pendingConfirmAction` |
| `document` keydown Esc | 1124–1140 | 优先级：确认框 > 设置/新建 > 抽屉 |
| `#newAssignmentInput` keydown Enter | 1142–1146 | 等价于点创建 |

### 5.4 渲染函数
| 函数 | 行号 | 作用 | 调用方 |
|---|---|---|---|
| `render()` | 1148–1158 | 总入口：标题→学生→列表→设置→进度 | 启动、所有状态变更后 |
| `renderStudents()` | 1160–1184 | 用 `innerHTML` 重建 50 张卡片 | `render` |
| `renderAssignmentList()` | 1186–1203 | 重建抽屉里的作业项 | `render` |
| `renderSettingsState()` | 1205–1214 | 同步姓名开关的 `is-on`/`aria-pressed` | `render` |
| `renderProgress()` | 1216–1221 | 写 `--progress` 与 `aria-valuenow` | `render` |

### 5.5 面板/抽屉控制
| 函数 | 行号 | 作用 |
|---|---|---|
| `setThemeColor(color)` | 1223–1228 | 改 `meta[theme-color]`；当前 open/close 都传 `#f4f4f4`，等价无操作 |
| `openDrawer()` / `closeDrawer()` | 1230–1242 | 切 `is-open` 与 `aria-hidden` |
| `openSettingsPanel()` | 1244–1251 | 先关其他，再开设置面板 |
| `openNewAssignmentPanel()` | 1253–1265 | 清空输入、聚焦 |
| `closeAllCenterPanels()` | 1267–1277 | 关设置/新建/确认，并收遮罩 |
| `openConfirm(opts)` | 1279–1291 | 保存回调、填文案、切 danger 样式 |
| `closeConfirm()` | 1293–1301 | 清回调；若其他面板未开则收遮罩 |

### 5.6 业务操作
| 函数 | 行号 | 作用 | 副作用 |
|---|---|---|---|
| `createAssignmentFromDialog()` | 1303–1323 | 新建作业，`unshift` 到列表头并切为当前 | `saveAppState` |
| `createFreshStudentsFrom(students)` | 1325–1339 | 复制花名册，重置为 NORMAL（NONE 保留），清 badge | 纯函数，返回新数组 |
| `invertCurrentAssignmentSubmission()` | 1341–1368 | NORMAL↔REGISTERED 互换；NONE 不动；清/补“已交”标记 | `saveAppState` |
| `deleteCurrentAssignment()` | 1370–1395 | 删除当前作业，切相邻项；空则建空白作业 | `saveAppState` |
| `toggleStudent(student)` | 1397–1411 | 单卡点击：NORMAL↔REGISTERED，清 submit badge | `saveAppState` |

### 5.7 持久化与规整
| 函数 | 行号 | 作用 | 易错点 |
|---|---|---|---|
| `loadAppState()` | 1413–1450 | 读 localStorage，解析失败/为空→回退默认 | 任何异常都静默回退（数据丢失风险） |
| `saveAppState()` | 1452–1454 | 整体 `JSON.stringify` 写回 | 无节流，每次操作都写 |
| `normalizeAssignment()` | 1456–1463 | 补字段、规整 id/title/createdAt | id 缺失会用 `assignment-{index}` |
| `normalizeStudent()` | 1465–1479 | 补 serial/name/status/badge/badgeType/updatedAt | status 非枚举值→降级 NORMAL；badgeType 不校验 |

### 5.8 纯工具函数
| 函数 | 行号 | 作用 |
|---|---|---|
| `getCurrentAssignment()` | 1481–1490 | 取当前作业；找不到则回落第一个并修正 id |
| `getAssignmentStats(assignment)` | 1492–1502 | 统计已交/总数/未交（NONE 不计入） |
| `getStateClass(student)` | 1504–1508 | 返回 `is-registered`/`no-registration`/`""` |
| `getDisplayName(student, index)` | 1510–1513 | `hideNames` 开→天干地支，否则真名 |
| `getStemBranchName(index)` | 1515–1519 | `STEMS[i%10] + BRANCHES[i%12]` |
| `getCardAriaLabel(student, index)` | 1521–1526 | 拼无障碍标签 |
| `getStatusText(status)` | 1528–1532 | “已登记”/“无登记”/“普通状态” |
| `makeDefaultAssignmentTitle()` | 1534–1539 | `MMDD作业` |
| `makeId(prefix)` | 1541–1543 | `prefix-时间戳-随机16进制` |
| `escapeHTML(value)` | 1545–1552 | 转义 5 个字符，渲染用户输入前必经 |
| `clone(value)` | 1554–1556 | `JSON.parse(JSON.stringify)` 深拷贝 |
| `announce(message)` | 1558–1560 | 写 `#liveStatus` 触发屏读器播报 |

## 6. 函数调用关系

```
启动
  loadAppState() ──┬─> normalizeAssignment() ─> normalizeStudent()
                   └─> 失败回退 defaultAssignment(clone defaultStudents)
  render() ──┬─> renderStudents()   (escapeHTML / getStateClass / getDisplayName / getCardAriaLabel)
             ├─> renderAssignmentList() (getAssignmentStats)
             ├─> renderSettingsState()
             └─> renderProgress() (getAssignmentStats / getCurrentAssignment)

用户交互
  点卡片        grid click ─> toggleStudent() ─> saveAppState() ─> render()
  点作业项      list click  ─> 改 currentAssignmentId ─> saveAppState() ─> render()
  姓名开关      hideNameSwitch click ─> 翻转 hideNames ─> saveAppState() ─> render()
  反选          invertButton click ─> openConfirm() ─> confirmOk ─> invertCurrentAssignmentSubmission()
  删除作业      deleteAssignmentButton click ─> openConfirm(danger) ─> confirmOk ─> deleteCurrentAssignment()
  新建作业      addButton click ─> openNewAssignmentPanel() ─> createAssignmentFromDialog()
                                                              └─> createFreshStudentsFrom()
  Esc           keydown ─> closeConfirm() / closeAllCenterPanels() / closeDrawer()（按优先级）
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
| 新增顶栏按钮 | HTML 797–809 + JS DOM 引用 999–1032 + 事件绑定区 |
| 新增设置项 | HTML 847–868 + JS 引用 + 事件 + `renderSettingsState` |
| 新增状态值 | `STATUS` 923 + `getStateClass` 1504 + `getStatusText` 1528 + CSS 三态样式 278–313 |
| 改持久化键/结构 | `STORAGE_KEY` 921 + `loadAppState`/`saveAppState`/`normalize*` |
| 改进度条颜色 | `.progress-bar::after` background 97 |
| 改抽屉宽度 | `.drawer` width 358 |
