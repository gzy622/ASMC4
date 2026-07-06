# 手势与动画重构 · 进度追踪指南

> **用途**：跨会话、跨 Agent、跨阶段保持「最终目标」与「当前做到哪」一致。  
> **交互规则原文**：[手势和动画重构目标文档.md](../手势和动画重构目标文档.md)  
> **实现索引**：[CodeGraph.md](../CodeGraph.md)「手势」  
> **质量审查基线**：2026-07-06（三路子 Agent 审查 + 主 Agent 核实）

---

## 新对话如何接续（复制给 Agent）

```
请读 docs/gesture-animation-refactor-tracker.md，按「当前快照」和「短期目标」继续。
不要扩大范围；每完成一项就更新该文档的勾选与「当前快照」。
改手势前先读 CodeGraph「手势」和 手势和动画重构目标文档.md。
验证：node build.mjs && python verify.py；手势改动需按文档「验收清单」手动点一遍。
```

---

## 最终目标（不变）

整理手势与动画代码，使**当前好用的交互习惯保持不变**，同时做到：

| # | 承诺 |
|---|------|
| F1 | **状态来源单一**：phase / 释放动画 / 阴影延后经 `layer-motion-state`（及 `motion-registry` 门面）登记，不散写 `classList` 操作 motion class |
| F2 | **阅读路径清楚**：先看交互规则（CodeGraph + 重构目标文档），再看 `gesture-guards` 与具体绑定文件 |
| F3 | **浮层互斥可预期**：打开阻塞打开、关闭不阻塞打开、同元素释放中不重复接管——与重构目标文档「冲突处理」一致 |
| F4 | **动画结束后界面干净**：无残留 transform、无双动画、无遗留 `is-motion-dragging` / `is-shadow-pending` |
| F5 | **文档与实现一致**：死代码删除、模块表与真实 import 链对齐 |

**明确不做（除非单独立项）**：重写 `release-animation` 算法参数、改 CSS 时长/缓动、改 Android `touchmove` 策略、改浮层关闭栈顺序、改 quickPanel 高度行为。

---

## 当前快照

| 字段 | 值 |
|------|-----|
| **最后更新** | 2026-07-06 |
| **当前阶段** | 三阶段收官完成（维护模式） |
| **阶段进度** | 阶段 1 = 100% · 阶段 2 = 100% · 阶段 3 = 100% |
| **短期目标** | 无待办（见下方「维护模式」） |
| **进行中** | 无 |
| **阻塞** | （无） |
| **最近决策** | S29：D2-C `no-anim` 仅 snap；显式 WAAPI 不再挂 class，D2 收官 |

### 短期目标（本批）

三阶段任务已全部完成。后续手势改动走常规 bugfix / 功能立项，不再从此表取短期项。

- [x] **S25** P3：收官——CodeGraph 模块数对齐（9→15）、tracker 标记维护模式
- [x] **S26** P3：D10——top-sheet `::after` 阴影，与 drawer/scoreSheet 统一；调阴影改 `design-tokens.css` 三个 token
- [x] **S27** P1：D2-A——drawer / top-sheet / score-sheet 去掉 CSS `transform` transition；位移仅 WAAPI
- [x] **S28** P1：D2-B——瞬时开/关路径统一；`snapMotionLayerOpen` / `snapMotionLayerClosed`
- [x] **S29** P1：D2-C——`no-anim` 收拢为 `withNoAnimLayer`（仅 snap）；显式 WAAPI 去 `no-anim`

<details>
<summary>已完成短期目标（S1–S24，归档）</summary>

- [x] **S1** P0：删除 `release-animation.js`，`CodeGraph.md` 改指向 `gesture-motion-engine.js`，重构目标文档「保留不动」列表同步
- [x] **S2** P1：`clearDrawerMotionStyles` / `clearTopSheetMotionStyles` 收到 `pointer-drag-lifecycle.js`（或单一 `endExplicitMotion` helper）
- [x] **S3** P1：`busyKey` 接线 `setUiTransitionBusy` 或从 API 删除（1.7）
- [x] **S4** P1：shadow 完成单一路径，弱化无效 `transitionend`（3.2）
- [x] **S5** P1：`utils/dom.js` toast 路径收拢 `clear*MotionStyles`（3.1 余量）
- [x] **S6** P2：`drawer.js` / `panels.js` 显式 open 编排抽共享 helper（3.3）
- [x] **S7** P2：`evaluateSwipeRelease` 统一释放阈值（3.4）
- [x] **S8** P2：共享 `drawerClosedPx`（3.5）
- [x] **S9** P2：`createHorizontalDragGesture` 返回 `{ abortRelease }`（3.6）
- [x] **S10** P3：删除未用 `endLayerDrag` 或明确用途（1.8）
- [x] **S11** P3：Android `touchmove` 助手抽到 `pointer-drag-lifecycle`（3.7）
- [x] **S12** P3：`waitForTransition` 通用化（3.9）
- [x] **S13** P3：横/竖工厂抽 `bindPointerDragLifecycle`（3.8）
- [x] **S14** P3：评估 score-sheet 内关补 guard（2.4）
- [x] **S15** P3：评估 `opening` / `closing` phase（3.10）→ **跳过**，现有 phase 够用
- [x] **S16** P3：选择器与 `press-feedback` 重叠整理（2.5）→ `NAV_CHROME_SELECTOR` 单源
- [x] **S17** P3：删除 `openDrawer` 死分支 `!shouldAnimate`（D9）
- [x] **S18** P3：`runExplicitOpenAnimation` 接 `busyKey`，drawer 显式 open 收拢（D6 余量）
- [x] **S19** P3：`runExplicitCloseAnimation` 收拢 drawer/panels 显式关闭（D6）
- [x] **S20** P3：scoreSheet 打开迁 WAAPI 显式路径（D7）→ `runExplicitOpenAnimation` + `motionFinished` 阴影
- [x] **S21** P3：`shadow-reveal` 删无调用方的 `transitionend` 路径（D3）
- [x] **S22** P3：评估 D4 generation 复制 → **跳过**，显式 `WeakMap` 与手势闭包 `releaseGeneration` 职责不同
- [x] **S23** P3：评估 D8 `drawer-fullscreen` → **保留**独立编排（多段 expand/opacity，与 `openDrawer` 职责不同）
- [x] **S24** P3：评估 D2 WAAPI/CSS 双轨 → **记录**，靠 `no-anim`+reflow 防御，无 repro 不拆

</details>

### 维护模式

重构承诺 F1–F5 已落地。后续：

- 改手势：先读 CodeGraph「手势」+ `手势和动画重构目标文档.md`；动 `panel-swipe` / 工厂前必读守卫表。
- 双动画 repro：参考 `scripts/__repro_double_anim.html`，单独立项处理 D2。
- 本 tracker 仅在新审查录入技术债或复现 D2 时更新「短期目标」。

---

## 三阶段总览

与 [手势和动画重构目标文档.md](../手势和动画重构目标文档.md) 一致；本表只跟踪**进度**，不重复交互细则。

| 阶段 | 目标 | 进度 | 状态 |
|------|------|------|------|
| **1** 状态收拢 | `layer-motion-state` + `motion-registry`；motion class 由模块写入 | 100% | 完成 |
| **2** 手势入口整理 | `gesture-guards` 命名化；`panel-swipe` 四类动作可读；减少散落 `closest` | 100% | 完成 |
| **3** 减少重复 | 横/竖工厂、generation、shadow 完成路径、显式 open 编排 | 100% | 完成 |

```text
[=======阶段1=======]
[=====阶段2=====]
[====阶段3====]
```

---

## 阶段任务清单

### 阶段 1 — 状态收拢

| ID | 任务 | 优先级 | 状态 | 备注 |
|----|------|--------|------|------|
| 1.1 | `layer-motion-state.js` phase → CSS class | — | ✅ 完成 | |
| 1.2 | `motion-registry.js` 门面 + `isCrossPanelOpenBlocked` | — | ✅ 完成 | |
| 1.3 | 拖动/释放经 `beginLayerDrag` / `beginTargetReleaseAnimation` | — | ✅ 完成 | |
| 1.4 | `shadow-reveal.js` 接 `beginLayerExplicitOpen` | — | ✅ 完成 | WAAPI 路径完成机制仍脆弱 → 见 3.3 |
| 1.5 | motion class 不散落 `classList`（审查已确认） | — | ✅ 完成 | `is-open` / `no-anim` 仍手写，属预期 |
| 1.6 | 删除 `release-animation.js`，文档对齐 `gesture-motion-engine.js` | P0 | ✅ 完成 | **短期 S1** |
| 1.7 | `busyKey`：工厂接入 `setUiTransitionBusy` 或从 API 删除 | P1 | ✅ 完成 | **短期 S3** |
| 1.8 | 删除未用 `endLayerDrag` 或明确其用途 | P3 | ✅ 完成 | **短期 S10**；已删，由 release/clear 路径覆盖 |

### 阶段 2 — 手势入口整理

| ID | 任务 | 优先级 | 状态 | 备注 |
|----|------|--------|------|------|
| 2.1 | `gesture-guards.js` `canStart*` / `blocks*` 集中 | — | ✅ 完成 | |
| 2.2 | `panel-swipe.js` 四类动作分段可读 | — | ✅ 完成 | 四段注释 + 守卫分离 |
| 2.3 | `CodeGraph.md`「手势」改为规则说明为主 | — | ✅ 基本完成 | 随实现变更需持续维护 |
| 2.4 | score-sheet 内关补 guard（若需要） | P3 | ✅ 完成 | **短期 S14**；`canStartScoreSheetInnerClose` |
| 2.5 | 选择器与 `press-feedback` 重叠整理 | P3 | ✅ 完成 | **短期 S16**；`NAV_CHROME_SELECTOR` |

### 阶段 3 — 减少重复（行为稳定后再做）

| ID | 任务 | 优先级 | 状态 | 备注 |
|----|------|--------|------|------|
| 3.1 | 统一 `clear*MotionStyles` + reflow 收尾 | P1 | ✅ 完成 | drawer/top-sheet/toast 均走 `pointer-drag-lifecycle` |
| 3.2 | shadow 完成单一路径（WAAPI 感知，弱化无效 `transitionend`） | P1 | ✅ 完成 | **短期 S4**；scoreSheet 打开已迁 WAAPI（S20） |
| 3.3 | `drawer.js` / `panels.js` 显式 open 编排抽共享 helper | P2 | ✅ 完成 | **短期 S6**；`explicit-open-motion.js` |
| 3.4 | `evaluateSwipeRelease` 统一释放阈值 | P2 | ✅ 完成 | **短期 S7**；`swipe-release.js` |
| 3.5 | 共享 `drawerClosedPx` | P2 | ✅ 完成 | **短期 S8**；`getDrawerClosedPx` |
| 3.6 | `createHorizontalDragGesture` 返回 `{ abortRelease }` | P2 | ✅ 完成 | **短期 S9**；与垂直 API 对齐 |
| 3.7 | Android `touchmove` 助手抽到 `pointer-drag-lifecycle` | P3 | ✅ 完成 | **短期 S11**；`bindAndroidTouchmoveGuard` |
| 3.8 | 横/竖工厂合并或抽 `bindPointerDragLifecycle` | P3 | ✅ 完成 | **短期 S13**；pointer 四事件 + Android guard |
| 3.9 | `waitForTransition` 通用化 | P3 | ✅ 完成 | **短期 S12**；`utils/dom.js` |
| 3.10 | 完整 phase：`opening` / `closing`（文档建议状态机） | P3 | ❌ 放弃 | **短期 S15**；`explicit-opening` + `settling-*` 已覆盖互斥与视觉 class |

**图例**：✅ 完成 · 🔄 进行中 · ⬜ 待做 · ⏸ 暂停 · ❌ 放弃（须写原因）

---

## 已知技术债（审查录入，消一项勾一项）

| ID | 问题 | 严重度 | 关联任务 | 状态 |
|----|------|--------|----------|------|
| D1 | `release-animation.js` 死代码，文档仍写「勿改」 | 高 | 1.6 | ✅ |
| D2 | WAAPI + CSS transition 双轨，靠 `no-anim` + reflow 防御 | 高 | 3.1, 3.2 | ✅ **S27–S29**；位移仅 WAAPI，`no-anim` 仅 snap |
| D3 | `shadow-reveal` 三路完成（transitionend / timeout / settle 显式调用） | 中 | 3.2 | ✅ |
| D4 | generation 令牌 4 处复制 | 中 | 3.3 | ✅ 显式 `WeakMap` + 手势闭包双轨，有意不合并 |
| D5 | `busyKey` 未接线 | 中 | 1.7 | ✅ |
| D6 | `uiTransitionBusy` 与 layer phase 双轨 | 中 | 1.7 | ✅ 显式 open/close 已接 `busyKey`；手势期工厂早已接线 |
| D7 | score-sheet 打开动画路径与其他浮层不一致 | 低 | 3.2 | ✅ |
| D8 | `drawer-fullscreen` 未复用 shadow-reveal / openDrawer | 低 | 3.9 | ✅ 有意独立；`waitForTransition` 已共享 |
| D9 | `openDrawer` 死分支（`!shouldAnimate`） | 低 | — | ✅ |
| D10 | top-sheet 阴影用 `box-shadow`，drawer 用 `::after` | 信息 | — | ✅ **S26**；三滑动手势面板均 `::after` + opacity |

复现资产：`scripts/__repro_double_anim.html`（双动画最小 repro，处理 D2 时参考）。

---

## 单步执行上限（防耗时失控）

| 规则 | 说明 |
|------|------|
| **一步一 PR 粒度** | 单次会话默认只完成「短期目标」里 1～2 个勾选 |
| **先读后改** | 动 `panel-swipe` / `gestures/` 前必读 CodeGraph「手势」 |
| **不改表现** | 阶段 1～2 禁止改 CSS 时长、缓动、阈值（除非修 bug 且有 repro） |
| **验证门槛** | 每步：`node build.mjs && python verify.py`；手势步：下方验收抽测 |
| **超时止损** | 单任务超过 ~45 分钟无进展 → 在「当前快照」记阻塞原因，换下一小项或只更新文档 |
| **文档同步** | 动模块职责 / import 链 / 死代码 → 同步本文件 + CodeGraph（按 AGENTS 文档维护表） |

---

## 验收清单（每阶段或每批短期目标完成后）

完整场景见 [手势和动画重构目标文档.md](../手势和动画重构目标文档.md)「验收方式」。每批至少抽测：

### 必测（任意手势改动）

- [x] quickPanel：列表顶下拉够/不够阈值；内滑关；壳层关；操作记录视图不误关
- [x] drawer：边缘开；内/壳关；关后列表可点可滚；搜索筛选不触发横滑
- [x] 浮层冲突：确认框阻断；A 打开中 B 不能开；A 关闭中 B 可开
- [x] 异常：快速连滑无残留 transform；半路 cancel 界面正常

### 针对 D2 / 显式打开改动时加测

- [x] drawer / top-sheet **点击打开**：无闪开闪关、无双动画（可参考 `__repro_double_anim.html` 思路）
- [x] 阴影：点击打开稍后渐入；拖动打开不叠 shadow-pending 污染

> **验收记录**：2026-07-06，用户双端（浏览器 + Android）手动测试通过。

---

## 进度更新规则（Agent 与用户共用）

每次推进或结束会话前，**必须**改「当前快照」：

1. **最后更新** → 当天日期  
2. **进行中** → 正在做的任务 ID（如 `1.6`）或「无」  
3. **短期目标** → 勾掉已完成；从阶段清单补下一批 1～2 项  
4. **阶段进度** → 粗估百分比（完成项 / 该项清单总数）  
5. **最近决策** → 一句话（含「不做 X 的原因」）  
6. 阶段任务表对应行：⬜ → 🔄 → ✅  
7. 技术债表：问题消掉则 ✅ 或删行  

若发现计划需调整：**先写「最近决策」原因**，再改阶段清单；不要 silent 改交互规则（规则改动手势和动画重构目标文档.md）。

---

## 相关文件索引

| 类型 | 路径 |
|------|------|
| 交互规则 | `手势和动画重构目标文档.md` |
| 实现索引 | `CodeGraph.md`「手势」 |
| 状态核心 | `src/js/gestures/layer-motion-state.js` |
| 门面 | `src/js/gestures/motion-registry.js` |
| 显式打开 | `src/js/gestures/explicit-open-motion.js` |
| 守卫 | `src/js/gestures/gesture-guards.js` |
| WAAPI 引擎 | `src/js/gestures/gesture-motion-engine.js` |
| 拖动生命周期 | `src/js/gestures/pointer-drag-lifecycle.js` |
| 释放阈值 | `src/js/gestures/swipe-release.js` |
| 工厂 | `drag-gesture.js`, `horizontal-drag.js` |
| 业务绑定 | `panel-swipe.js`, `drawer-gestures.js`, `score-swipe.js`, `toast-swipe.js` |
| UI 编排 | `ui/drawer.js`, `ui/panels.js`, `ui/shadow-reveal.js`, `ui/drawer-fullscreen.js` |
| 双动画 repro | `scripts/__repro_double_anim.html` |
| 工程约定 | `AGENTS.md` |

---

## 会话收尾模板（Agent 回复用户）

```markdown
**本步完成**：<任务 ID + 一句话>
**文档已更新**：docs/gesture-animation-refactor-tracker.md（当前快照、短期目标勾选）
**验证**：build / verify / 手动 <场景>
**下一步建议**：<任务 ID，仅 1 项>
```

---

## 变更记录

| 日期 | 变更 |
|------|------|
| 2026-07-06 | S29：D2-C `withNoAnimLayer`；D2 技术债收官 |
| 2026-07-06 | S28：D2-B `snapMotionLayerOpen` / `snapMotionLayerClosed` 统一瞬时开/关 |
| 2026-07-06 | S27：D2-A 去掉滑动手势面板 CSS transform transition；fullscreen 收起 wait 对齐 |
| 2026-07-06 | S26：D10 top-sheet 阴影迁 `::after`，token 仍为 `--shadow-sheet` |
| 2026-07-06 | S25：三阶段收官；CodeGraph 15 模块对齐；进入维护模式 |
| 2026-07-06 | S23+S24：D8 全屏编排保留独立；D2 双轨记为架构约束 |
| 2026-07-06 | S21+S22：`shadow-reveal` 单路径；D4 generation 双轨记为有意设计 |
| 2026-07-06 | S20：scoreSheet 打开迁 WAAPI，`shadow-reveal` 走 `motionFinished` |
| 2026-07-06 | S19：`runExplicitCloseAnimation` 收拢 drawer/panels 显式关闭 |
| 2026-07-06 | S17+S18：`openDrawer` 删死分支；`runExplicitOpenAnimation` 接 `busyKey` |
| 2026-07-06 | S16：`NAV_CHROME_SELECTOR` 单源，`press-feedback` 复用 |
| 2026-07-06 | S15：评估 3.10，决定不增 `opening`/`closing` phase |
| 2026-07-06 | S14：`canStartScoreSheetInnerClose`（release/busy/confirm），`score-swipe` 内关接线 |
| 2026-07-06 | S13：`bindPointerDragLifecycle` 收拢 `drag-gesture` / `horizontal-drag` pointer 绑定 |
| 2026-07-06 | 验收：用户双端手动测试 S1–S12 相关场景全部通过 |
| 2026-07-06 | S12：`waitForTransition` 通用化至 `utils/dom.js`，`drawer-fullscreen` + `shadow-reveal` 复用 |
| 2026-07-06 | S11：`bindAndroidTouchmoveGuard` 收拢横/竖工厂 Android touchmove |
| 2026-07-06 | S10：删除未用 `endLayerDrag`（`layer-motion-state.js`） |
| 2026-07-06 | S9：`horizontal-drag.js` 返回 `abortRelease`，与 `drag-gesture.js` 垂直工厂 API 对齐 |
| 2026-07-06 | S7+S8：`swipe-release.js` 统一释放阈值；`getDrawerClosedPx` 共享 drawer 关闭位移 |
| 2026-07-06 | S5+S6：toast 收拢 `clearExplicitMotionStyles`；新增 `explicit-open-motion.js`，drawer/panels 点击打开与 generation 统一 |
| 2026-07-06 | S3+S4：`busyKey` 接线三工厂；`shadow-reveal` 增 `motionFinished`，drawer/panels WAAPI 路径不再依赖 `transitionend` |
| 2026-07-06 | S1+S2：`release-animation.js` 删除；`endExplicitMotion` / `clearExplicitMotionStyles` 入 `pointer-drag-lifecycle.js` |
| 2026-07-06 | 初版：纳入三阶段进度、审查技术债、短期目标 S1/S2、接续模板 |
