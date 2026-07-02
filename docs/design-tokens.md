# Design Tokens

当前项目的基础 token 都放在 `src/css/design-tokens.css`。组件层允许保留少量一次性局部色值，但高频语义色、状态色和共享阴影优先收敛到这里。

## 基础层

| Token | 值 | 用途 |
| --- | --- | --- |
| `--bg` | `#f4f4f4` | 页面底色、手机壳背景 |
| `--card` | `#ffffff` | 卡片和白底容器 |
| `--text` | `#1f2024` | 主文本 |
| `--muted` | `#8b8f97` | 次级文本 |
| `--icon` | `#1d1f23` | 图标颜色 |
| `--line` | `rgba(31, 32, 36, 0.055)` | 常规分割线 |
| `--shadow` | `0 1px 0 rgba(0, 0, 0, 0.018)` | 轻量卡片阴影 |
| `--shadow-panel` | `0 22px 70px rgba(0, 0, 0, 0.16)` | 弹层阴影 |
| `--motion` | `cubic-bezier(.2, .8, .2, 1)` | 通用动效曲线 |

## 语义层

| Token | 值 | 用途 |
| --- | --- | --- |
| `--accent` | `#166534` | 主操作、提交态 |
| `--accent-soft` | `#f0fbf5` | 主操作浅底 |
| `--accent-soft-2` | `#e8f5ee` | 标签底色 |
| `--danger` | `#b91c1c` | 危险操作 |
| `--danger-soft` | `#fecaca` | 危险描边 |
| `--warning` | `#c2410c` | 特殊提示 |
| `--status-submitted-bg` | `#16302a` | 已交学生卡背景 |
| `--status-none-bg` | `#ededf0` | 无登记学生卡背景 |
| `--overlay-scrim` | `rgba(244, 244, 244, 0.34)` | 遮罩层 |
| `--overlay-toast` | `rgba(28, 30, 34, 0.94)` | Toast 背景 |

## 组件辅助层

| Token | 值 | 用途 |
| --- | --- | --- |
| `--surface-muted` | `#f0f1f3` | 轻灰底 |
| `--surface-muted-2` | `#f3f4f5` | 控件底 |
| `--surface-muted-3` | `#e9ebed` | 按下态底色 |
| `--surface-muted-4` | `#e6e7ea` | 开关轨道 |
| `--surface-muted-5` | `#d0d1d5` | 把手、分隔条 |
| `--text-soft` | `#5a5e66` | 辅助文字 |
| `--text-disabled` | `#a5a8ae` | 占位和辅助图标 |
| `--text-serial` | `rgba(31, 32, 36, 0.12)` | 学生序号 |
| `--icon-muted` | `#8a8f98` | 次级图标 |
| `--surface-border` | `#dfe2e5` | 轻边框 |

## 阴影与状态辅助

| Token | 值 | 用途 |
| --- | --- | --- |
| `--shadow-drawer` | `6px 0 24px rgba(0, 0, 0, 0.08)` | 抽屉阴影 |
| `--shadow-sheet` | `0 8px 30px rgba(0, 0, 0, 0.12)` | 上拉面板阴影 |
| `--shadow-toast` | `0 10px 32px rgba(0, 0, 0, 0.22)` | Toast 阴影 |
| `--shadow-knob` | `0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 8px rgba(0, 0, 0, 0.06)` | 开关圆点 |
| `--phone-shadow` | `0 22px 70px rgba(0, 0, 0, 0.18)` | 桌面端手机壳阴影 |
