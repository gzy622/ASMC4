# CodeGraph — ASMC4

## 启动链

```text
index.html
  └─ src/js/app.js
       ├─ bindEvents()
       ├─ gestures/*（副作用模块）
       └─ render()
```

## 模块边界

| 路径 | 职责 | 允许依赖 |
|---|---|---|
| `state.js` | 持久状态、当前作业、统计、localStorage | constants / data / utils |
| `runtime.js` | 确认框、打分、长按等临时状态 | 无 |
| `business/` | 修改作业或学生数据并触发保存、渲染 | state / render / ui |
| `events/` | 绑定 DOM 事件并调用业务或 UI API | dom-refs / business / ui |
| `render/` | 根据状态重建界面 | state / dom-refs / utils |
| `ui/` | 抽屉、面板、确认框、备份 | dom-refs / state |
| `score-sheet/` | 打分面板和长按行为 | state / runtime / render |
| `gestures/` | 抽屉与打分面板滑动手势 | dom-refs / ui |
| `utils/` | 转义、规整、显示、ID、深拷贝 | constants（按需） |

## 事件域

| 文件 | 负责交互 |
|---|---|
| `events/navigation.js` | 抽屉、中心面板、Esc 优先级 |
| `events/assignments.js` | 新建、切换、重命名、删除、反选 |
| `events/students.js` | 学生点击、姓名开关、打分模式、长按 |
| `events/score.js` | 数字键盘、备注、确认/取消打分 |
| `events/backup.js` | 导入、导出 |

## 核心数据流

```text
用户事件
  → events/*
  → business/* 或 ui/*
  → state.js 中的对象修改
  → saveAppState()
  → render()
```

## 持久化模型

```js
{
  hideNames: boolean,
  scoringMode: boolean,
  currentAssignmentId: string,
  assignments: [{
    id: string,
    title: string,
    createdAt: string,
    students: [{
      id: number,
      serial: string,
      name: string,
      status: "normal" | "registered" | "none",
      badge: string,
      badgeType: string,
      note: string,
      updatedAt: string
    }]
  }]
}
```

存储键为 `asmc4_assignments_v1`。读取和导入都会经过
`normalizeAssignment()` / `normalizeStudent()` 兼容旧数据。

## 维护约束

- DOM 查询只放在 `dom-refs.js`。
- 用户可控文本进入 `innerHTML` 前必须调用 `escapeHTML()`。
- 学生 ID 与 `dataset.id` 比较时统一转字符串。
- `state.js` 不依赖 `render/`，避免形成循环。
- 新交互优先加入对应的 `events/*.js`，不要重新堆回入口文件。
