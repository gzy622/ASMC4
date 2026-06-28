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
- `score.js`: 数字键盘、备注、确认/取消
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

## 约束

- DOM 查询只放在 `dom-refs.js`
- 用户文本进 `innerHTML` 前先 `escapeHTML()`
- 学生 id 比较统一转字符串
- `state.js` 不依赖 `render/`；`runtime.js` 不依赖 `state.js`
- 持久状态进 `state.js`，运行时可变状态进 `runtime.js`
- 新交互优先放进对应的 `events/*.js`
