# Agent 本地模板（Reasonix）

Cursor 项目说明见 **AGENTS.md**；`.cursor/` 仅保留少量共享配置（已纳入 Git）。

本目录仅保留其它 Agent 的本机模板：

| 模板 | 生成路径 | Git |
|------|----------|-----|
| `reasonix.toml.example` | `reasonix.toml` | 否 |
| `cursorrules.stub` | `.cursorrules` | 否 |

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\setup-agent-local.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\verify-tooling.ps1
```
