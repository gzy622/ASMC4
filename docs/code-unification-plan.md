# ASMC4 代码统一整理计划

## 当前状态

最后更新：2026-07-04。

当前阶段：**整理计划已完成**（2026-07-04）。可选遗留见下方「后置不阻塞收尾」。

当前结论：

- 第 1–3 步已完成；体检见 [code-audit-2026-07-04.md](code-audit-2026-07-04.md)。
- 第 4 步已完成主体整理（数据流、business 分层、浮层栈、switch 绑定、渲染策略等），见下方列表。
- 第 5 步已开始：`AGENTS.md`「模块约定」、`CodeGraph.md` 事件域与目录说明已更新。
- **后置不阻塞收尾**：student id 统一 String（要迁移）、侧栏 `renameAssignment` inline DOM、gestures 目录大改。

第 4 步整理摘要：
  - `scoreStep10Mode` 只保留在 `state.js`，移除 `runtime.js` 镜像。
  - `selectAssignment()` 从 `events/assignments.js` 下沉到 `business/assignment.js`。
  - 新增 `business/settings.js`，settings/students 的偏好开关从 events 下沉。
  - quickPanel 重命名/改科目下沉 `business/assignment.js`。
  - 浮层关闭栈提取到 `ui/floating-layers.js`（back-guard、native 返回键、Esc 共用）。
  - `toggleStudent` 改走 `scheduleRender()`，去掉 business 对 render 子模块的直接依赖。
  - ×10 切换合并到 `business/settings.js`（`setScoreStep10ModeEnabled`），sheet 与设置页共用。
  - `toggleScoringMode` 迁入 `business/settings.js`；`panel-swipe` 复用 `floating-layers.anyFloatingLayerOpen`。
  - 新增 `ui/switch-bind.js`，设置页与 quickPanel 的 switch 统一整行可点；偏好开关绑定收拢到 `events/settings.js`。

- 下一步：计划可标记为完成；遗留项按需单独立项，不阻塞日常开发。

### 完成标准（2026-07-04 核对）

- [x] 后续 Agent 知道每类代码该放哪里（`AGENTS.md`「模块约定」）
- [x] 新功能能沿固定数据流写（events → business → state → render）
- [x] 同类 UI 实现收敛（switch、浮层关闭、×10）
- [x] 高风险妥协已记录（CodeGraph「手势」「约束」）
- [x] 验证命令仍可用（`node build.mjs` + `python verify.py`）
- [ ] 可选后置：student id 类型、侧栏 inline DOM

### 阶段进度

| 阶段 | 状态 | 说明 |
|------|------|------|
| 第 1 步：定标准 | 已完成 | 标准已经写入本文档。 |
| 第 2 步：代码体检 | 已完成 | 清单见 [code-audit-2026-07-04.md](code-audit-2026-07-04.md)。 |
| 第 3 步：整理排序 | 已完成 | 顺序已写入体检清单「第三步整理顺序建议」，与本文档第三步一致。 |
| 第 4 步：小步统一代码 | 已完成 | 遗留项见「后置不阻塞收尾」。 |
| 第 5 步：防止再次变散 | 已完成 | `AGENTS.md`、`CodeGraph.md` 已更新。 |

### 进度更新规则

每次继续推进本文档时，必须更新“当前状态”：

- 改“最后更新”日期。
- 改“当前阶段”。
- 在“当前结论”里记录已经完成和还没完成的事。
- 如果体检或整理产生新文档，在这里写出文件路径。
- 如果发现计划需要调整，先写明原因，再改后面的计划正文。

## 背景

ASMC4 不是一个已经失控、需要推倒重写的项目。它现在有明确入口、模块目录和项目约束：

- 入口：`index.html -> src/js/app.js`
- 主要数据流：`events/ -> business/ -> state.js -> saveAppState() -> render()`
- 持久状态：`localStorage["asmc4_assignments_v1"]`
- 代码目录：`events/`、`business/`、`state.js`、`runtime.js`、`render/`、`ui/`、`gestures/`、`score-sheet/`、`utils/`

真正的问题不是“完全没有结构”，而是多轮修 bug 和多个 Agent 交替修改之后，局部实现可能开始出现不一致：同类 UI 可能写法不同，同类状态可能命名不同，同类交互可能分散在不同层里。这个计划的目标是把这些不一致收束回来，让项目后续看起来像按同一套规则持续写出来。

## 总目标

整理后的代码应该满足这些标准：

- 同类功能放在同类目录，不把业务逻辑藏进渲染或 DOM 事件里。
- 同类 UI 用同类实现，不让外观相似的组件背后各自一套逻辑。
- 状态修改路径清楚，优先保持 `events -> business -> state -> save -> render`。
- DOM 引用集中在 `dom-refs.js`，新增 DOM id 时同步 `index.html`。
- 用户输入进入 `innerHTML` 前必须先 `escapeHTML()`。
- 学生 id 比较统一转字符串。
- 持久状态放 `state.js`，运行时临时状态放 `runtime.js`。
- 例外逻辑必须有名字、有边界、有注释或文档记录。

## 不做什么

这次整理不追求一次性重写，也不把“好看”放在稳定性前面。

明确不做：

- 不推倒重写整个前端。
- 不主动引入新框架、新依赖或测试框架。
- 不为了统一文件风格改动稳定逻辑。
- 不把所有小函数抽象成通用工具。
- 不为了减少文件数量合并清晰的模块。
- 不用浏览器自动化测试替代手动交互验证。
- 不在没有证据的情况下改手势、toast、Android WebView 边界逻辑。

## 整体策略

整理分成五步：

1. 先定标准。
2. 再做代码体检。
3. 按风险排整理顺序。
4. 每次只统一一个区域。
5. 把规则写进项目文档，防止后续再次变散。

核心原则是小步、可验证、可回退。每一步都应该能独立合并，不能出现“改了一半项目暂时不可用”的状态。

## 第一步：定标准

先把“干净统一”拆成可检查的标准，而不是凭审美判断。

### 文件职责标准

`events/` 只负责接收用户事件、读取当前输入、调用业务或 UI 函数。这里不应该直接塞复杂状态变更。

`business/` 负责作业、学生、名单等业务修改。这里可以组合状态变更，但不直接操作 DOM。

`state.js` 负责持久状态读取、迁移、保存和基础修改。它不导入 `render/`。

`runtime.js` 负责临时状态，比如当前打分学生、输入中的分数、长按状态、过渡状态。这里不放需要备份的数据。

`render/` 负责根据状态刷新页面。渲染函数尽量是“读状态，写 DOM”，不夹带业务决策。

`ui/` 负责打开、关闭、重置面板，以及 toast、确认框、备份导入这类界面动作。

`gestures/` 负责手势识别和拖动状态。除非明确需要，不直接修改业务状态。

`score-sheet/` 只处理打分 sheet 的显示、输入提交和相关 UI 状态。

`utils/` 放无业务归属的工具函数。不要把业务规则塞进工具目录。

### 命名标准

事件绑定函数使用 `bindXxxEvents()`。

打开和关闭界面使用 `openXxx()`、`closeXxx()`、`toggleXxx()`。

渲染函数使用 `renderXxx()`。

状态读取使用 `getXxx()`，状态修改使用能说明动作的动词，比如 `selectAssignment()`、`updateAssignmentTitle()`。

布尔判断使用 `isXxx()`、`hasXxx()`、`canXxx()`、`shouldXxx()`。

临时清理使用 `resetXxx()`、`clearXxx()`、`teardownXxx()`，其中 `teardown` 只用于解绑、取消拖动、释放监听这类生命周期动作。

### 数据流标准

默认路径：

```text
events/ -> business/ -> state.js -> saveAppState() -> render()
```

允许例外：

- 纯 UI 开关可以在 `ui/` 中完成，比如打开面板、关闭确认框。
- 运行时输入状态可以进 `runtime.js`，比如打分输入框里的临时值。
- 手势拖动中的预览态可以只改 class 或 inline style，但 commit 后要回到正常状态流。

不允许：

- `state.js` 导入 `render/`。
- `render/` 里直接保存状态。
- 事件处理函数里同时塞大段业务逻辑和 DOM 拼接。
- 同一状态既放 `state.js` 又放 `runtime.js`，但没有明确同步规则。

### DOM 标准

DOM 查询只放在 `src/js/dom-refs.js`。新增或改动 DOM id 时，同步检查：

- `index.html`
- `src/js/dom-refs.js`
- 相关渲染、事件、样式
- 必要时更新 `CodeGraph.md`

用户输入或可变文本进入 `innerHTML` 前，必须先 `escapeHTML()`。如果只写纯文本，优先用 `textContent`。

### UI 标准

同类 UI 应该走同类实现：

- sheet 类界面统一看打开、关闭、拖动、重置状态。
- switch 类控件统一看按钮状态、`aria-checked`、触觉反馈。
- 列表项统一看点击区域、操作按钮、按压反馈。
- toast 统一走 `showToast()` / `hideToast()`，不要在各处临时改 class。
- 确认类操作统一走确认框，不各自写一套弹出逻辑。

如果两个 UI 看起来相同，但实现方式不同，要先判断是历史原因还是确实有不同交互边界。只有确认交互语义一致，才合并写法。

## 第二步：代码体检

体检只读代码，不急着改。目标是列出问题清单，并给每个问题定级。

### 检查项

1. 状态流是否被绕过。
2. `innerHTML` 是否处理了用户输入。
3. DOM 查询是否集中在 `dom-refs.js`。
4. 同类 UI 是否存在多套实现。
5. 同类事件是否命名和绑定方式不一致。
6. 学生 id 比较是否统一转字符串。
7. `state.js`、`runtime.js` 是否职责混用。
8. 手势是否有未记录的特殊条件。
9. toast、确认框、面板关闭是否存在重复逻辑。
10. 样式中是否有同类组件的重复 class 或冲突规则。

### 分类方式

体检结果分四类：

**必须修**，会继续制造 bug，或者违反硬规则。比如用户输入未转义、状态保存路径绕开、DOM id 不同步。

**建议修**，影响可读性和后续维护，但短期不一定出 bug。比如同类打开面板函数命名不同、渲染函数里夹了少量业务判断。

**暂时不碰**，写法不优雅，但已经稳定，改动收益低或回归风险高。手势和 Android WebView 相关逻辑默认先放这里，除非有明确 bug。

**需要记录**，属于历史妥协或平台边界，最好写进 `CodeGraph.md` 或局部注释，不一定改代码。

## 第三步：整理顺序

整理顺序按风险和收益排，不按文件顺序排。

### 1. 状态和持久化

先查 `state.js`、`runtime.js`、`backup.js`、涉及状态修改的 `business/` 文件。

目标：

- 持久字段只在 `state.js` 里定义和迁移。
- 运行时字段只在 `runtime.js` 里维护。
- 保存路径清楚，状态变更后通常先 `saveAppState()` 再 `render()`。
- 备份导入导出和状态字段一致。

风险：

- 误改持久字段会影响用户已有数据。
- 迁移逻辑不能凭感觉删。

验收：

- `node build.mjs`
- `python verify.py`
- 手动导入导出一次备份
- 新建、切换、删除作业后刷新页面确认状态保留

### 2. DOM 引用和渲染

再查 `dom-refs.js`、`render/`、`index.html`。

目标：

- DOM 查询集中。
- 同类渲染函数命名一致。
- 用户文本统一转义或使用 `textContent`。
- 全量渲染优先，只在明确需要时做局部更新。

风险：

- 改 DOM id 会影响事件绑定和样式。
- 渲染顺序变化可能影响打开中的面板。

验收：

- `node build.mjs`
- `python verify.py`
- 手动检查作业列表、学生列表、历史记录、顶栏状态

### 3. 打分 sheet

再查 `events/score.js`、`score-sheet/`、相关 DOM 和 CSS。

目标：

- 分数输入、备注输入、确认、取消的路径清楚。
- `runtime.scoreInputValue` 和显示内容同步规则清楚。
- ×10、小数点、退格等特殊逻辑集中，不散在多个地方。

风险：

- 打分是核心功能，任何小改都要手动测。

验收：

- 输入整数、小数、退格、清空
- ×10 模式下确认分数
- 输入备注并保存
- 取消后不污染下一个学生

### 4. 作业列表和学生列表

再查 `events/assignments.js`、`events/students.js`、`business/assignment.js`、`render/assignmentList.js`、`render/students.js`。

目标：

- 作业新增、切换、重命名、删除、反选路径一致。
- 学生点击、长按、状态切换、显示姓名开关职责清楚。
- 列表项操作按钮和整行点击不互相干扰。

风险：

- 事件委托和长按容易互相影响。
- 学生 id 比较必须统一转字符串。

验收：

- 新建、重命名、切换、删除作业
- 学生提交状态切换
- 长按和普通点击不互相误触
- 显示姓名开关正常

### 5. 设置页和名单编辑

再查 `events/settings.js`、`events/roster.js`、`ui/roster.js`、相关 CSS。

目标：

- 设置项保存路径一致。
- switch 状态、显示隐藏、触觉反馈一致。
- 名单编辑只影响新用户或明确的新建数据，不意外改旧数据。

风险：

- 花名册和作业里的学生数据不是同一个东西，不能混改。

验收：

- 修改设置后刷新仍生效
- 编辑名单后新建作业生效
- 旧作业不被意外改名或重排

### 6. 手势和 toast

最后查 `gestures/`、`ui/panels.js`、`utils/dom.js`、toast 相关 CSS。

目标：

- 打开、关闭、拖动、取消的状态命名一致。
- `is-open`、`is-dragging` 不混用。
- toast 下滑关闭和撤回/重做按钮不互相干扰。
- 手势特殊边界写入 `CodeGraph.md`。

风险：

- 手势最容易引入平台回归。
- Android WebView 的 `pointercancel`、触摸穿透、拖动预览不能只凭桌面浏览器判断。

验收：

- 列表顶部下拉打开 quickPanel
- 面板内、面板下空白、学生区上滑关闭
- 打开后立刻上滑关闭
- 侧栏切换作业后立刻下拉
- toast 显示时下滑关闭
- 撤回/重做按钮可点，不误触关闭
- Android WebView 上不闪退、不误关

## 第四步：每次改动的执行规则

每次整理只选一个区域。不要一次同时整理状态、渲染、手势和样式。

执行顺序：

1. 读 `AGENTS.md` 和相关 `CodeGraph.md` 小节。
2. 用搜索找 caller 和被调用方。
3. 先列出当前路径，再决定是否改。
4. 做最小 diff。
5. 跑验证命令。
6. 写清楚手动验证步骤。
7. 如果改了状态、DOM id、手势或 agent 约定，同步文档。

默认验证：

```powershell
node build.mjs
python verify.py
```

手势和移动端相关改动必须补手动验证，不做浏览器自动化测试。

## 第五步：防止再次变散

整理完成后，应该把稳定规则沉淀到项目文档里。

建议新增或更新：

- `CodeGraph.md`：记录真实数据流、手势边界、状态字段。
- `AGENTS.md`：记录对后续 Agent 的硬规则。
- 必要时新增 `docs/code-style.md`：只写长期规则，不写一次性审计结论。

不建议把某次审计分数、临时问题清单、个人判断写成长期规则。长期规则只保留能指导以后写代码的内容。

## 体检输出模板

代码体检完成后，建议输出一份短清单：

```text
必须修
- 问题：
- 文件：
- 风险：
- 建议改法：
- 验证：

建议修
- 问题：
- 文件：
- 收益：
- 风险：

暂时不碰
- 位置：
- 原因：
- 需要记录的边界：

需要记录
- 内容：
- 建议写入：
```

## 完成标准

这个整理计划完成时，项目不一定每一行都“漂亮”，但应该达到这些结果：

- 后续 Agent 知道每类代码该放哪里。
- 新功能能沿着固定数据流写，不容易绕路。
- 同类 UI 的实现方式明显收敛。
- 高风险历史妥协被记录，不再靠记忆维护。
- 每次整理都有验证结果和手动检查步骤。
- 项目仍然可以随时构建和使用。

## 判断是否需要升级成重构

只有出现下面情况，才考虑从“整理”升级为“分阶段重构”：

- 多个核心功能都绕过 `state.js` 直接改持久数据。
- 渲染层和业务层大量互相调用，无法局部拆开。
- 同一状态在多个地方各存一份，且没有同步规则。
- 修一个区域必须同时改 8 个以上文件才能保持可用。
- 验证命令不能覆盖基础风险，手动验证也无法稳定复现关键路径。

如果没有这些信号，就继续按小步整理推进，不做大改。
