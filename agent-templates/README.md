# Agent 本地模板（OpenCode / Reasonix）

Cursor 的 **Rules / Skills** 在仓库根 `.cursor/`（已纳入 Git，Settings 里可见）。

本目录仅保留其它 Agent 的本机模板：

| 模板 | 生成路径 | Git |
|------|----------|-----|
| `opencode.json` | 仓库根 | 否 |
| `opencode/plugins/ponytail.mjs` | `.opencode/plugins/` | 否 |
| `reasonix.toml.example` | `reasonix.toml` | 否 |
| `cursorrules.stub` | `.cursorrules` | 否 |

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\setup-agent-local.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\verify-tooling.ps1
```
