# ASMC4

纯前端作业管理应用。数据：`localStorage["asmc4_assignments_v1"]`。

## 运行

```bash
.\start-lan-preview.cmd
node build.mjs
npm run preview
```

## 入口

- `src/js/app.js`: 启动
- `src/js/state.js`: 状态
- `src/js/dom-refs.js`: DOM
- `src/js/events/`: 事件
- `src/js/business/`: 修改

## 约束

- 改 DOM id 时同步 HTML 和 `src/js/dom-refs.js`
- 用户输入进 `innerHTML` 前先 `escapeHTML()`
- `state.js` 不依赖 `render/`
- 状态变更后通常是 `saveAppState()` 再 `render()`
- 输出方案、计划、交接计划时先读 `PlanHandoffGuide.md`

细图：[CodeGraph.md](CodeGraph.md)。硬约束：[AGENTS.md](AGENTS.md)。
