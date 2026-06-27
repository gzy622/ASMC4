# 手势层后续改进行动计划

> 承接 `gesture-refactor-plan.md` 第 4 节「本期不做的后续清单」。
> 前提：手势层结构重构（phase0~5）已完成，三组水平手势走统一原语 `horizontal-drag.js`，共享状态隔离完毕。
> 状态：F1 ✓（已修复），F5/F6 △（推进中），其余待启动。
> 本文只做方向规划与排序，**每条启动前需单独 think 评估**，不在此预先做详细设计。

---

## 0. 排序原则

| 原则 | 说明 |
|---|---|
| 先修 bug，后做升级 | 影响体验的既有行为缺陷优先于性能/动画升级 |
| 先独立，后耦合 | 不依赖他项的改动先做，基础层替换最后做 |
| 先低风险，后高风险 | 阈值/方向判定等小改先于 Pointer Events 大改 |
| 一步一 commit | 沿用 phase0~5 规范，每阶段单 commit，前缀 `gesture followup: <编号>` |
| 行为升级单独评估 | 动画语义、事件模型变更属「行为升级」，须 think 后再定方案，不混入同一 commit |

---

## 1. 待办清单与分级

| 编号 | 项 | 性质 | 风险 | 涉及文件 | 建议顺序 |
|---|---|---|---|---|---|
| F1 | 抽屉打开中/已打开时右滑≥50px 触发关闭 | 行为 bug | 低 | `ui/drawer.js`、`gestures/drawer-gestures.js` | 1 |
| F2 | `drawerClosedPx` 在 resize 时失效 | 潜在 bug（低频） | 低 | `gestures/horizontal-drag.js`、`gestures/drawer-gestures.js` | 2 |
| F3 | `armScoreSheetPointerGuard` 450ms 延时改事件时序 | 时序改进 | 中 | `score-sheet/index.js` | 3 |
| F4 | `requestAnimationFrame` 合帧 + `will-change` 合成层 | 性能优化 | 中 | `gestures/horizontal-drag.js`、`gestures/drag-gesture.js` | 4 |
| F5 | spring / WAAPI 释能动画取代 `transition` 硬切换 | 动画语义升级 | 中高 | `gestures/*`、CSS | 5 |
| F6 | Pointer Events 统一（替换 touch，兼容鼠标） | 事件模型替换 | 高 | `gestures/*` | 6 |

> F4~F6 为「行为/性能升级」，彼此可能耦合（如 F6 换 Pointer Events 后 F5 动画实现方式可能变），启动顺序可按 think 结果调整。

---

## 2. 各项详情

### F1 · 抽屉打开中/已打开时右滑≥50px 触发关闭 ✓

- **状态**：`9058b87` 已修复。
- **改动**：drawer/scrim 的 `onRelease` 改方向判定（仅 `dx <= -DRAG_CLOSE_THRESHOLD` 触发关闭）；`openDrawer()` 加 320ms `overlayTransitionBusy` 窗口。
- **验收**：抽屉打开中/已打开时右滑不关闭；左滑≥50px 关闭行为不变；打开动画期间不可二次起拖。
- **回滚**：`git revert 9058b87`。

### F2 · `drawerClosedPx` 在 resize 时失效

- **现状**：`closedPx = -1.2 * drawer.offsetWidth`，起拖时计算一次并缓存进实例闭包。若拖拽过程中窗口 resize，缓存的 `closedPx` 反映旧布局，clamp 范围错位。
- **风险**：低频（拖拽中 resize 罕见），plan D4 仅记录未修。
- **改动思路（待 think）**：
  - 方案 A：`getClosedPx` 改为每次 move 实时计算（放弃缓存，增加 offsetWidth 读取）。
  - 方案 B：监听 `resize`/`orientationchange`，拖拽中清缓存并重算。
- **验收**：拖拽中旋转屏幕/调整窗口，位移 clamp 范围跟随新布局。
- **回滚**：单 commit。

### F3 · `armScoreSheetPointerGuard` 450ms 延时改事件时序

- **现状**：`score-sheet/index.js:113-125`，打开打分面板时 arm guard，用 `setTimeout(releaseGuard, 450)` 兜底释放；正常由 `pointerup/pointercancel` 事件释放。
- **问题**：450ms 是经验值，与动画时长耦合；动画慢于 450ms 时 guard 提前释放，快于 450ms 时多余等待。
- **改动思路**：用 `transitionend` 事件驱动 guard 释放，取代固定延时兜底。
- **验收**：打开打分面板后，动画结束前点击穿透被拦截，结束后正常响应；无固定延时依赖。
- **回滚**：单 commit。
- **注意**：此项在 `score-sheet/`，不在 `gestures/`，属手势层边缘，仍单列。

### F4 · `requestAnimationFrame` 合帧 + `will-change` 合成层

- **现状**：touchmove 中每次直写 `transform`，未合帧；拖拽中无 `will-change`，可能触发合成层重建。
- **改动思路**：move 中用 rAF 合并多次 transform 写入；起拖时加 `will-change: transform`，结束移除。
- **风险**：rAF 合帧可能引入 1 帧延迟，需验收「跟手性」是否下降；`will-change` 长驻会增加内存，须确保结束移除。
- **验收**：拖拽跟手无感知延迟；快速滑动无掉帧；结束后 `will-change` 已清除（DevTools Layers 面板确认）。
- **回滚**：单 commit。

### F5 · spring / WAAPI 释能动画取代 `transition` 硬切换

- **现状**：起拖 `transition="none"`，松手 `transition=""` 依赖 CSS 默认值还原，释能动画由 CSS transition 接管，无惯性/回弹语义。
- **改动思路（待 think）**：松手后用 WAAPI 或 spring 模型驱动释能（基于松手瞬时速度），取代 `transition` 硬切换。
- **风险**：动画语义变化属「行为升级」，改变用户感知；须与 CSS 端协调（移除相关 transition 规则或保留 fallback）。
- **验收**：松手后释能带惯性；未达阈值回弹自然；阈值触发关闭/打开动画连贯。
- **回滚**：单 commit，还原 `transition` 硬切换与 CSS 规则。

### F6 · Pointer Events 统一（替换 touch，兼容鼠标）

- **现状**：全部手势用 `touchstart/move/end/cancel`，桌面端无鼠标拖拽调试能力；`press-feedback.js` 已用 pointer，手势层未统一。
- **改动思路（待 think）**：`horizontal-drag.js` 与 `drag-gesture.js` 的 touch 监听改为 pointer 监听，保留 preventDefault 语义；统一 `pointerId` 多指隔离。
- **风险**：最高。Pointer Events 在 Capacitor WebView 的 `touch-action`/`pointercancel` 行为需实测；鼠标与触摸的起拖阈值/坡度可能需差异化。
- **验收**：手机触摸行为与基线一致；桌面浏览器可用鼠标拖拽开关抽屉/面板；多指互不串扰。
- **回滚**：单 commit（建议作为独立大阶段，改动集中可整体 revert）。

---

## 3. 执行顺序与依赖

```
F1 (右滑关)        独立，风险低
F2 (resize)        独立，风险低
F3 (pointer-guard) 独立，score-sheet 范围
F4 (rAF+will-change) 性能，不改语义
F5 (spring/WAAPI)  动画语义升级，建议在 F4 后
F6 (Pointer Events) 基础层替换，建议最后，可能影响 F4/F5 实现
```

- F1/F2/F3 互不依赖，可任意顺序，建议按体验影响排序。
- F4→F5：先合帧再换动画，避免动画与合帧改动交织难定位。
- F6 最后：事件模型替换影响面最广，若先做则 F4/F5 须基于新事件模型实现。

---

## 4. 风险自查

| 类别 | 说明 |
|---|---|
| 依赖风险 | 无新增 npm 包；F5 若用 spring 库须单独评估引入 |
| 兼容性风险 | F6 需实测 Capacitor WebView 的 Pointer Events 行为，是最大不确定性 |
| 数据风险 | 无，全部纯 UI/手势，不碰 localStorage/state.js |
| 行为漂移风险 | F4/F5/F6 属行为升级，须每项 think 后再定方案，避免「越改越乱」重现 |
| 回滚风险 | 每项单 commit，`git revert <hash>` 精确回滚，互不连带 |

---

## 5. 验证

- 每项完成后跑 `docs/gesture-refactor-checklist.md` 全 6 组手势，确保未引入回归。
- F1 需额外验证「打开中右滑不关」新行为。
- F2 需额外验证「拖拽中 resize」场景。
- F3 需额外验证打分面板动画时序。
- F4 需 DevTools 确认合成层与帧率。
- F6 需桌面浏览器 + 手机 WebView 双端验收。

---

## 附录 A · 已完成的后重构改进

以下为重构计划之外完成的手势改善项：

| 编号 | 项 | 提交 | 说明 |
|---|---|---|---|
| A1 | 中层面板打开时阻止抽屉手势误触 | 本次 | `drawer-gestures.js` `shouldStart` 加 `quickPanel`/`newAssignmentPanel` 的 `.is-open` 检查，防止面板打开时横向拖拽误触 |
| A2 | 关闭中层面板时主动 blur | 本次 | `panels.js` `closeAllCenterPanels` 调用 `blurCenterPanelFocus()`，避免关闭后键盘/焦点残留 |

## 6. 撤回方法

- 单项撤回：`git revert <该项 commit hash>`。
- 全量回退：按 A→F6→F1 倒序 revert，或重置到本计划起点（无生产数据受影响）。
