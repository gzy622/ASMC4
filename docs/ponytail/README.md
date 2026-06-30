# Ponytail Skills（按需）

Cursor 每轮只加载 `.cursor/skills/` 下的 skill 元数据。为减上下文，仅 **ponytail-review** 保留在 `.cursor/skills/`；其余按需读取本目录。

| Skill | 路径 | 触发 |
|-------|------|------|
| ponytail-review | `.cursor/skills/ponytail-review/` | `/ponytail-review`、过度设计审查 |
| ponytail-help | `docs/ponytail/ponytail-help/` | `/ponytail-help` |
| ponytail-gain | `docs/ponytail/ponytail-gain/` | `/ponytail-gain` |
| ponytail-debt | `docs/ponytail/ponytail-debt/` | `/ponytail-debt` |
| ponytail-audit | `docs/ponytail/ponytail-audit/` | `/ponytail-audit` |

Codex 仍可用 `@ponytail-review` 等；Cursor 说触发词后 Agent 读对应 `SKILL.md`。
