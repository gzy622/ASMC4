# 手势层重构行动计划

> 状态：**已完成**（phase 0~5 全部落地，水平手势统一走 `horizontal-drag.js`，共享状态隔离完毕）。
> 目标：提升 `src/js/gestures/` 的健壮性与可维护性，**不引入复杂度**。
> 适用范围：垂直/水平拖拽手势（A~D）。**roster 行排序(E)、long-press、press-feedback、pointer-guard 本期不动。**

---

## 0. 上次「越改越乱」的复盘与防错原则

| 上次症状推测 | 本次约束 |
|---|---|
| 一次提交里同时抽工厂 + 换实现 + 改动画 | **一步只做一件事**：抽取、迁移、换实现严格分阶段，禁止混在一个 commit |
| 边重构边改动画语义，行为漂移无法定位回归 | 重构期保持**行为零变化**；行为升级单列在「本期不做」清单，等结构稳定后再议 |
| 旧路径被删后新路径出 bug，无路可退 | 采用**绞杀者模式**：新模块与旧路径并存，逐个 caller 迁移、验证、再删旧 |
| 共享状态串扰（如 `cachedClosedPx`）在迁移时被触发 | 先隔离再迁移：共享状态封装进实例闭包**单独成阶段**，与迁移解耦 |
| 没有「基线」 checklist，改完不知道是否回归 | 第 0 阶段**先写可执行的手势验收清单**作为回归基线，每阶段必须跑绿 |
| 改动跨太多文件，回滚连带丢掉其他工作 | **每阶段单 commit、单一文件聚焦**，回滚只需 `git revert <hash>` |

**总原则**：能 `git revert` 单个 commit 精确回滚某一步，且不波及其他阶段。

---

## 1. 范围

### 做（Do）
- 收敛 `drag-gesture.js` 与 `drawer-gestures.js` 中重复的常量与起拖判定逻辑。
- 把抽屉三组水平手势（phone/drawer/scrim）迁移到统一的 `createHorizontalDragGesture` 原语。
- 消除模块级共享变量 `cachedClosedPx`，封装进实例闭包。

### 不做（Don't，明确排除，避免范围蔓延）
- ❌ 迁移到 Pointer Events（保持 touch 事件）
- ❌ 引入 WAAPI / rAF / spring 动画（保持 `transition` 切换语义）
- ❌ `will-change` 合成层优化
- ❌ `roster.js` 行拖拽、`longpress.js`、`press-feedback.js`、`score-sheet/index.js` 的 pointer-guard 重构
- ❌ 调整阈值数值与坡度

> 理由：这些是「行为升级」，应在结构稳定后另起计划逐项评估，混入本期是「越改越乱」的直接诱因。

---

## 2. 重构前缺陷清单（历史记录，已全部解决）

| # | 缺陷 | 解决方式 |
|---|---|---|
| D1 | `DRAG_START_THRESHOLD / DRAG_SLOPE` 在两文件各定义一份 | phase 1：统一到 `constants.js` |
| D2 | 水平起拖判定三处复制粘贴 | phase 2~4：统一原语消除重复 |
| D3 | `cachedClosedPx` 为模块级变量，phone/drawer/scrim 共写 | phase 5：移入实例闭包 |
| D4 | `closedPx` 依赖布局时刻（低频，记录未修） | 当前状态：仍缓存在实例闭包，未改 |
| D5 | `transition` 硬切换耦合 CSS | 当前状态：仍维持原始方式，未改 |

---

## 3. 阶段划分（全部已完成）

> 每阶段结束必须满足：**验收清单全绿 + 可 `git revert` 精确回滚且不留副作用**。

### ✓ 阶段 0 · 基线验收清单
- 新建 `docs/gesture-refactor-checklist.md`，列出全部 6 组手势验收步骤。
- **完成判定**：清单可按步骤执行，每条有可观察信号。

### ✓ 阶段 1 · 抽常量为单一模块
- 新建 `src/js/gestures/constants.js`，两文件常量收敛至单一来源。
- **验收**：无重复字面量。

### ✓ 阶段 2 · 抽取水平 drag 原语 + 迁移 scrim
- 新建 `src/js/gestures/horizontal-drag.js`，scrim 段迁移至统一原语。

### ✓ 阶段 3 · 迁移 drawer 自身左滑关
- drawer 段改用 `createHorizontalDragGesture`。

### ✓ 阶段 4 · 迁移 phone 右滑开
- phone 段改用统一原语，hit-test 排除区、长按联动、方向判定均正常。

### ✓ 阶段 5 · 消除共享 `cachedClosedPx`
- `cachedClosedPx` 从模块级变量移入实例闭包，`drawer-gestures.js` 中已消除。

> 结构稳定、所有水平手势走统一原语、共享状态隔离完毕。本计划结束。

---

## 4. 本期不做的后续清单（结构稳定后另议）

> 仅记录方向，不做设计。每条若启动需单独 think。

1. Pointer Events 统一（替换 touch，兼容鼠标调试）。
2. spring/WAAPI 释能动画，取代 `transition` 硬切换。
3. `requestAnimationFrame` 合帧 + `will-change` 合成层。
4. `armScoreSheetPointerGuard` 450ms 延时改为事件时序判定。
5. D4：`drawerClosedPx` 在 resize 时失效问题。
6. 抽屉打开中/已打开时，在 drawer/scrim 上往右滑 ≥50px 会触发关闭。根因：① drawer/scrim 段 `onRelease` 用 `Math.abs(dx)` 判定（右滑也满足）；② `openDrawer()` 不设 `overlayTransitionBusy` 窗口，打开动画期间仍可起拖。属原码既有行为，重构期保持不变。后续可改为方向判定（仅 `dx <= -DRAG_CLOSE_THRESHOLD` 关）+ 给 `openDrawer` 加 320ms busy 窗口。

---

## 5. 交接到执行方

- **执行顺序**：阶段 0 → 1 → 2 → 3 → 4 → 5，严格串行，不跳步。
- **提交规范**：每阶段单 commit，message 前缀 `gesture refactor: phase<N>`。
- **依赖与凭据**：无外部依赖、无新 npm 包、无网络/Credential。
- **验证命令**：
  ```powershell
  # 手动验收（每阶段后）
  .\start-lan-preview.cmd --lan
  # 检查重复常量
  rg "DRAG_(START|CLOSE)_THRESHOLD = |DRAG_SLOPE = " src/js/gestures
  # 检查共享变量已消除
  rg "cachedClosedPx" src/js/gestures/drawer-gestures.js
  ```
- **手动手势验收**：见 `docs/gesture-refactor-checklist.md`（阶段 0 产出）。

## 6. 风险自查
- **依赖风险**：无新增依赖。
- **兼容性风险**：Capacitor WebView 对 touch 事件行为不变（本期不换 Pointer Events）。
- **数据风险**：无，纯 UI 手势，不碰 localStorage/state.js。
- **回滚风险**：每阶段单 commit，`git revert <hash>` 即可精确回滚，互不连带。
- **最大假设（premise collapse）**：本计划假设「迁移到统一原语可在不改变 touch 语义下完成」。若原语 API 表达力不足以覆盖 phone 的 hit-test + 长按联动，应在阶段 2 启动前先扩展原语设计，而非在 phone 阶段临时打补丁——否则会重现「越改越乱」。阶段 2 必须先验证原语 API 能覆盖三组调用方的所有钩子需求，再进阶段 4。

## 7. 撤回方法
- 任一阶段出问题：`git revert <该阶段 commit hash>`，不影响其他阶段已合并工作。
- 全量回退：按阶段 5→1 倒序 revert，或直接重置到阶段 0 提交点（无生产数据受影响）。