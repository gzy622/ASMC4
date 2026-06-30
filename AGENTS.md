# ASMC4 Agent Guide

中文静态前端打分系统；`android/` 是 Capacitor 工程。

- 入口：`index.html` -> `src/js/app.js`
- 代码：`src/js/` ESM，样式在 `src/css/`
- 存储：`localStorage["asmc4_assignments_v1"]`
- 数据流：`events/ -> business/ -> state.js -> saveAppState() -> render()`
- 细节按需读：[CodeGraph.md](CodeGraph.md)（dev / Android / adb / 手势）

## 验证

```powershell
node build.mjs
python verify.py
```

## 工程原则

- 先读懂任务与数据流，再最小 diff；复用优于新写；删优于增；不主动加依赖/抽象/测试框架。
- Bug 修根因与共享函数；改函数前 Grep 所有 caller；有意简化用 `ponytail:` 注释标上限。
- 过度设计审查、`/ponytail-*`、review/audit 时再读 `.cursor/rules/ponytail.mdc` 或相关 skill。

## 硬规则

1. 改 DOM id 同步 `index.html` 和 `src/js/dom-refs.js`。
2. 用户输入进 `innerHTML` 前必须 `escapeHTML()`。
3. `state.js` 不导入 `render/`；状态变更后通常先 `saveAppState()` 再 `render()`。
4. 学生 id 比较统一转字符串。
5. 新状态值同步 `STATUS`、状态类、状态文本和 CSS。
6. 深拷贝用现有 `clone(value)`；花名册改动只影响新用户。
7. 全量渲染优先；只在明确需要时做局部更新。
8. 不做浏览器自动化测试；交互验证给手动步骤。
9. 复发或难定位的行为 bug 先读 `~/.agents/skills/hunt/SKILL.md`。
10. 改现有文件保持原换行符；小改却整文件 diff 时先还原再重做。
11. 改 `#quickPanel` 或 `panel-swipe.js` 前先读 [CodeGraph.md](CodeGraph.md)「手势」。

## 输出

- 简体中文，短结论优先；长输出才用 `rtk`。
- 仅用户明确要求时 commit/push/PR；标题 `feat|fix|refactor|docs|chore` + 中文摘要，正文简体中文。
