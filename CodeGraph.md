# CodeGraph — ASMC4

纯前端作业管理应用。数据：`localStorage["asmc4_assignments_v1"]`。

## 运行

```bash
.\start-lan-preview.cmd
node build.mjs
npm run preview
```

## 入口

```text
index.html -> src/js/app.js -> bindEvents() + render()
```

- `src/js/app.js`: 启动
- `src/js/state.js`: 状态
- `src/js/dom-refs.js`: DOM 引用
- `src/js/events/`: 事件
- `src/js/business/`: 数据修改
- `src/js/render/`: 渲染
- `src/js/ui/`: 面板、抽屉
- `src/js/score-sheet/`: 打分
- `src/js/gestures/`: 手势
- `src/js/utils/`: 工具

## 分层

- `state.js`: localStorage、当前作业、统计、默认回退
- `runtime.js`: 确认框、打分、长按、overlay 锁
- `events/`: DOM 事件绑定
- `business/`: 作业、学生、花名册修改
- `render/`: 全量界面重建
- `ui/`: 抽屉、面板、确认框、overlay
- `score-sheet/`: 打分面板
- `gestures/`: 抽屉、打分、拖拽手势
- `utils/`: 转义、显示、ID、深拷贝、规整

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

## 规则

- DOM 查询只放在 `dom-refs.js`
- 用户文本进 `innerHTML` 前先 `escapeHTML()`
- 学生 id 比较统一转字符串
- `state.js` 不依赖 `render/`
- 新交互优先放进对应的 `events/*.js`
