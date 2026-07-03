# ASMC4 重构第一步：检查报告

日期：2026-07-03  
范围：只读检查，不改代码。目标：找出近期补丁可能留下的技术债。

## 结论

**建议进入修复阶段。** 验证全绿，但近期「按作业隔离历史」+ quick panel 补丁留下多条 P1 数据/撤回一致性问题，以及局部渲染与手势状态残留。

## P0/P1 必修问题

### [P1] 撤回「新建作业」无效

- **证据：** `business/assignment.js` `createAssignmentFromDialog()`；`state.js` `ensureAssignmentHistory()` L61 `??`；`saveAppState()` L161–164
- **触发路径：** 新建作业 → toast「撤回」→ `performUndo(newId)`
- **风险：** 新 id 在 `lastSerialized` 中不存在时，`null ?? getAssignmentById()` 仍取到已插入作业，初始 entry 与「新建」快照相同
- **修复方向：** 新 id 显式用 `snapshot: null`；`ensureAssignmentHistory` 区分「未传参」与「明确不存在」

### [P1] 删除最后一个作业后撤回会残留占位作业

- **证据：** `assignment.js` `deleteCurrentAssignment()` L81–94；`state.js` `applyAssignmentHistoryEntry()` L188–209
- **触发路径：** 仅剩 1 项 → 删除（自动 `push(fallback)`）→ 撤回
- **风险：** 删除路径补 fallback，撤回只插入被删快照，不回收 fallback
- **修复方向：** 撤回删除时移除 auto-fallback

### [P1] `saveAppState` 持久化失败后历史栈与磁盘失步

- **证据：** `state.js` L166–181：先 `push` + `index++`，再 `persistSerialized()`
- **触发路径：** `history: true` 写操作 → localStorage 满/超限
- **风险：** 内存 history 已前进，磁盘仍是旧数据
- **修复方向：** 失败时回滚 `entries`/`index`

### [P1] 导入备份未重置 `assignmentHistories`

- **证据：** `ui/backup.js` L119–130；`state.js` L9 仅启动时初始化
- **触发路径：** 同会话编辑 → 导入含同 id 备份 → 撤回
- **风险：** 持久层全量替换，history Map 仍绑定导入前快照
- **修复方向：** import 后重建 history Map

### [P1] 侧栏重命名 toast 撤回目标错误

- **证据：** `assignment.js` `renameAssignment()` L228–233；`utils/dom.js` `showToast()` L70–74
- **触发路径：** 抽屉打开 → 编辑非当前项 → 改名 → toast「撤回」
- **修复方向：** `announce` 传 `assignmentId`

### [P1] 局部切提交后 badge DOM 残留

- **证据：** `business/student.js` `toggleStudent()`；`render/students.js` L11–13
- **触发路径：** 非打分模式 → 点带分数标记卡片 → 切回「未交」
- **修复方向：** 改回调 `renderStudents()` 或同步 badge DOM

### [P1] 局部渲染未刷新侧栏作业统计

- **证据：** `toggleStudent()` 未调 `renderAssignmentList()`；`drawer.js` 仅打开时刷一次
- **触发路径：** 开侧栏不关 → 点卡片切提交
- **修复方向：** 补 `renderAssignmentList`

### [P1] `renderQuickPanel()` 覆写未提交表单

- **证据：** `render/quickPanel.js` L40–46；`toggleStudent()` L41
- **触发路径：** quick panel 输入未 blur → 点学生卡片
- **修复方向：** focus 时跳过 value 同步

### [P1] `is-dragging` 残留锁死下拉打开

- **证据：** `panel-swipe.js` `onPrepare`；`panels.js` `closeFloatingPanels()` 不清 `is-dragging`
- **触发路径：** 下拉预览中途点标题 `openQuickPanel()`
- **修复方向：** `closeFloatingPanels` 统一 teardown

### [P1] Quick panel 打开入口视图状态不一致

- **证据：** `openQuickPanel()` reset 视图；`closeFloatingPanels()` 不 reset；`onPrepare` 保留历史视图
- **修复方向：** 关闭时统一 `resetQuickPanelView()`

## P2 可选整理

- 历史 Map 仅内存、删除后不清理
- Quick panel 刷新逻辑三处复制
- `assignmentList` id 比较未字符串化
- DOM 查询散落（`bootMask`、`panel-swipe` querySelector）
- `quickCurrentSummary` 死引用
- `toggleStudent` 冗余 `renderScoringMode`
- `.quick-action-grid` 关闭手势未排除按钮
- Toast 双轨动画边界

## 需守住的约束

- 用户文本进 `innerHTML` 前 `escapeHTML()`
- `saveAppState()` → `render()` 数据流
- `index.html` id 与 `dom-refs.js` 同步
- `[hidden]` + `display:grid` 陷阱
- `.drawer:not(.is-open) { pointer-events: none }`
- 切换作业 `saveAppState({ history: false })`

## 验证结果（检查阶段）

- `node build.mjs`：通过
- `python verify.py`：通过

## 建议修复顺序

1. 历史/撤回一致性
2. 局部渲染
3. `is-dragging` teardown
4. quick panel 打开语义统一
