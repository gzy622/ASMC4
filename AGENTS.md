# ASMC4

中文静态前端打分系统；`android/` 是 Capacitor 工程。

- 入口：`index.html` -> `src/js/app.js`
- 代码：`src/js/` ESM，样式在 `src/css/`
- 存储：`localStorage["asmc4_assignments_v1"]`
- 数据流：`events/ -> business/ -> state.js -> saveAppState() -> render()`

## 验证

```powershell
node build.mjs
python verify.py
```

## 工程原则

- 先读数据流和 caller，再最小 diff；复用现有代码，不主动加依赖/抽象/测试框架。
- 复杂细节按需读 [CodeGraph.md](CodeGraph.md)。

## 收尾

小改完成后在**同一会话**打 `/ship`（或说「提交同步」）。流程见 [.agents/skills/ship/SKILL.md](.agents/skills/ship/SKILL.md)。

### 文档维护（默认不改）

| diff 命中 | 更新 |
|-----------|------|
| 样式 / bugfix / 不改行为 | 否 |
| DOM id | `index.html` + `dom-refs.js`；打分 sheet → CodeGraph「打分 sheet」 |
| 手势 | CodeGraph「手势」 |
| 状态 / 持久化字段 | CodeGraph「数据」+ 硬规则 5 |
| 预览命令 | `README.md` |
| agent 约定 | `AGENTS.md` |

## 硬规则

1. 改 DOM id 同步 `index.html` 和 `src/js/dom-refs.js`。
2. 用户输入进 `innerHTML` 前必须 `escapeHTML()`。
3. `state.js` 不导入 `render/`；状态变更后通常先 `saveAppState()` 再 `render()`。
4. 学生 id 比较统一转字符串。
5. 新状态值同步 `STATUS`、状态类、状态文本和 CSS。
6. 深拷贝用现有 `clone(value)`；花名册改动只影响新用户。
7. 全量渲染优先；只在明确需要时做局部更新。
8. 不做浏览器自动化测试；交互验证给手动步骤。
9. 改 `#quickPanel` 或 `panel-swipe.js` 前先读 [CodeGraph.md](CodeGraph.md)「手势」。
10. 改现有文件保持原换行符；小改却整文件 diff 时先还原再重做。

## 输出

- 简体中文，短结论优先；长输出才用 `rtk`。
- 仅用户明确要求时 commit/push/PR。
