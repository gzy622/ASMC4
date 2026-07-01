---
name: ship
description: >
  ASMC4 收尾：按 diff 按需更新文档、验证、commit；用户说「同步」或 push 时再 push。
  触发：/ship、提交同步、ship、收尾、提交并同步。
disable-model-invocation: true
---

# Ship — 按需文档 + 验证 + 提交

**先读本文件，勿通读 CodeGraph/README。** 项目约定见 `AGENTS.md`。

## 流程（顺序执行）

1. **并行**：`git status`、`git diff`、`git log -1 --format='%s'`
2. **文档**：查下表；**默认不改任何 md**
3. **验证**：`node build.mjs` → `python verify.py`（失败则修，不 commit）
4. **提交**：仅含本回合相关文件；遵循 User Rules 的 commit 格式（`feat|fix|refactor|docs|chore` + 中文标题，正文空一行后简体中文）
5. **同步**：仅当用户消息含「同步」「push」或 `/ship sync` 时 `git push`；纯 `/ship` 只 commit
6. **汇报**：改了哪些文档（或无）、commit hash、是否 push

## 文档影响表

| diff 命中 | 更新 | 节/位置 |
|-----------|------|---------|
| 无下表命中（样式、bugfix、重构不改行为） | **否** | — |
| DOM id | 是 | `index.html` + `dom-refs.js`；打分 sheet 相关再改 `CodeGraph.md`「打分 sheet」 |
| `src/js/gestures/`、`panel-swipe.js` | 是 | `CodeGraph.md`「手势」对应小节 |
| 持久化字段、`STATUS`、状态类/CSS | 是 | `CodeGraph.md`「数据」；`AGENTS.md` 硬规则 5 若变 |
| `dev.cmd` / `dev.ps1` / 预览流程 | 是 | `README.md`「预览」 |
| agent 硬规则、验证命令 | 是 | `AGENTS.md` |
| `CodeGraph.md`「Agent 会话」经验 | 是 | 仅复发 bug / dev 排障新结论时追加 |

**边界**：架构细节 → `CodeGraph.md`；命令与环境 → `README.md`；agent 约定 → `AGENTS.md`。不三处重复同段。

## 不要做的事

- 不要为「可能有用」通读 `CodeGraph.md` / `README.md`
- 不要 commit `dist/`（已在 `.gitignore`）
- 不要改 git config；不要 `--no-verify` / force push（除非用户明确要求）
- hook 失败：修问题后**新** commit，不 amend（除非用户要求且未 push）

## 示例

用户：`/ship`  
→ diff 仅改 `src/css/` → 0 文档 → verify 绿 → `fix: 顶栏间距` → 不 push

用户：`提交同步`  
→ diff 改 `panel-swipe.js` → 更新 CodeGraph「手势」一行 → verify → commit → push
