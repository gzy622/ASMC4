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

## 硬规则

1. 默认最小可用改动，复用现有模式，不主动加依赖、抽象、状态机或测试框架。
2. 改 DOM id 同步 `index.html` 和 `src/js/dom-refs.js`。
3. 用户输入进 `innerHTML` 前必须 `escapeHTML()`。
4. `state.js` 不导入 `render/`；状态变更后通常先 `saveAppState()` 再 `render()`。
5. 学生 id 比较统一转字符串。
6. 新状态值同步 `STATUS`、状态类、状态文本和 CSS。
7. 深拷贝用现有 `clone(value)`；花名册改动只影响新用户。
8. 全量渲染优先；只在明确需要时做局部更新。
9. 不做浏览器自动化测试；交互验证给手动步骤。
10. 复发或难定位的行为 bug 先读 `~/.agents/skills/hunt/SKILL.md`。
11. 改现有文件保持原换行符；小改却整文件 diff 时先还原再重做。
12. 改 `#quickPanel` 或 `panel-swipe.js` 前先读 [CodeGraph.md](CodeGraph.md)「手势」。

## 输出和提交

- 最终回复用简体中文，短结论优先，不加无关收束。
- 长输出才用 `rtk`；短命令不用。
- 提交同步只做 `git add`、`git commit`、`git push`，除非用户要求 PR。
- Commit 标题：英文标签加简体中文摘要；正文用简体中文，和标题空一行。

```text
feat: xxx
fix: xxx
refactor: xxx
docs: xxx
chore: xxx
```
