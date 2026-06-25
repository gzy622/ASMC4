# CodeGraph — ASMC4

纯前端作业管理应用。数据：`localStorage["asmc4_assignments_v1"]`。

## 入口

```text
index.html -> src/js/app.js -> bindEvents() + render()
```

- `src/js/app.js`: 启动
- `src/js/state.js`: 状态
- `src/js/dom-refs.js`: DOM
- `src/js/events/`: 事件
- `src/js/business/`: 修改
- `src/js/render/`: 渲染
- `src/js/ui/`: 面板
- `src/js/score-sheet/`: 打分
- `src/js/gestures/`: 手势
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

## 约束

- DOM 查询只放在 `dom-refs.js`
- 用户文本进 `innerHTML` 前先 `escapeHTML()`
- 学生 id 比较统一转字符串
- `state.js` 不依赖 `render/`
- 新交互优先放进对应的 `events/*.js`
- 输出方案、计划、交接计划时先读 `PlanHandoffGuide.md`
