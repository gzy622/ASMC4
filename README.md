# ASMC4

纯前端作业管理应用。数据：`localStorage["asmc4_assignments_v1"]`。

## 运行

```bash
.\start-lan.cmd              # 同 Wi-Fi 手机访问（首次右键管理员）
.\start-usb-preview.cmd      # USB 直连，adb reverse
node build.mjs               # 构建
npm run preview              # 预览构建产物
```

## 入口

- `src/js/app.js`: 启动
- `src/js/state.js`: 持久状态
- `src/js/runtime.js`: 运行时可变状态
- `src/js/dom-refs.js`: DOM 引用
- `src/js/events/`: 事件
- `src/js/business/`: 修改
- `src/js/render/`: 渲染
- `src/js/ui/`: 面板
- `src/js/gestures/`: 手势
- `src/js/utils/`: 工具

## 约束

- 改 DOM id 时同步 HTML 和 `dom-refs.js`
- 用户输入进 `innerHTML` 前先 `escapeHTML()`
- `state.js` 不依赖 `render/`
- 新交互优先放进 `events/*.js`

详细结构：[CodeGraph.md](CodeGraph.md)。硬约束：[AGENTS.md](AGENTS.md)。
