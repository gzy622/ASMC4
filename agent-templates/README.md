# Agent 本地模板（可提交 Git）

本目录是**多 Agent 共享配置的唯一起源**，供 `scripts/setup-agent-local.ps1` 生成本机文件。

## 生成物（均在 .gitignore，勿 push）

| 生成路径 | 用途 |
|----------|------|
| `.cursor/rules/` | Cursor 规则 |
| `.cursor/skills/` | Cursor 可点名 ponytail 辅助 skill |
| `.cursorrules` | Cursor 遗留入口（空 stub，防 Headroom 冲突） |
| `opencode.json` | OpenCode Desktop 项目配置 |
| `.opencode/plugins/` | OpenCode ponytail 插件 |
| `reasonix.toml` | Reasonix Desktop（从 `reasonix.toml.example` 复制） |

## 所有 Agent 共同读取

- **`AGENTS.md`**（仓库根，已跟踪）：项目规则 + RTK + 多 Agent 说明

## 首次 / 克隆后

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\setup-agent-local.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\verify-tooling.ps1
```
