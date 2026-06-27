# 手势系统原生质感升级方案

> 目标：在 HTML5 / Capacitor WebView 内，把抽屉、顶部面板、打分面板等触摸手势升级到更接近手机系统的手感。重点是速度与距离共同触发、释放动画可中断、动画跟手、性能稳定、行为一致。

## 1. 当前状态

现有代码已经具备一部分现代手势基础：

- `src/js/gestures/horizontal-drag.js` 已使用 Pointer Events、`setPointerCapture`、rAF 合帧、`will-change` 和 WAAPI 释放动画。
- `src/js/gestures/drag-gesture.js` 覆盖垂直关闭与顶部下拉打开，也使用 Pointer Events、rAF、`will-change` 和 WAAPI。
- `src/js/gestures/release-animation.js` 已根据最后一次移动速度动态计算释放时长。
- CSS 中抽屉、顶部面板、打分面板主要用 `transform` 和 `opacity`，方向相关区域已设置 `touch-action`。

主要差距不在 API 是否现代，而在模型分散和判定不足：

- 水平拖拽、垂直关闭、顶部下拉打开各自维护状态机，重复处理 pointer 生命周期、rAF、速度、释放动画。
- 触发条件主要看固定距离阈值，速度只影响释放动画时长，不参与是否打开或关闭。
- 速度取最后一帧，松手前轻微停顿会把快速滑动降级为慢速拖动。
- `releaseAnimating` 会阻止动画中再次起拖，无法做到手机系统常见的“动画途中按住并接管”。
- 释放动画由 WAAPI 创建，但没有统一登记、取消、读取当前视觉位置、续接手势。
- `offsetWidth / offsetHeight` 在移动过程中仍可能被读取，极端情况下会放大布局成本。

## 2. HTML5 内可达到的边界

可以做到：

- 单指拖拽跟手，移动帧只写 `transform` / `opacity`。
- 用 Pointer Events 统一触摸和鼠标调试。
- 用 `touch-action` 把垂直滚动、水平拖拽的边界交给浏览器提前判定。
- 用 rAF 合并同一帧内的多次样式写入。
- 用 WAAPI 或 rAF 动画实现释放动画，并支持取消。
- 用速度窗口和距离进度共同决定释放目标。

不能完全做到：

- 无法拿到系统级手势仲裁能力，例如 iOS 返回手势、Android 系统导航栏手势的优先级。
- 无法保证 WebView 与系统原生控件完全相同的触摸采样、预测和回弹曲线。
- 浏览器可能因滚动、缩放、系统手势接管触发 `pointercancel`，业务代码必须接受取消并恢复状态。

## 3. 外部依据

- Pointer Events 提供 `pointerId`、`setPointerCapture`、`pointercancel` 等统一输入模型。参考 MDN：<https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events>
- `touch-action` 决定浏览器是否保留滚动、缩放等默认手势；配置错误会导致 `pointercancel` 或滚动冲突。参考 MDN：<https://developer.mozilla.org/en-US/docs/Web/CSS/touch-action>
- rAF 适合把视觉更新安排到浏览器绘制前。参考 MDN：<https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame>
- WAAPI 的 `Animation.cancel()` 和 `finished` 可用于释放动画的取消与完成等待。参考 MDN：<https://developer.mozilla.org/en-US/docs/Web/API/Animation/cancel>
- 高性能动画应优先使用 `transform` 与 `opacity`。参考 web.dev：<https://web.dev/articles/animations-guide>
- Hammer.js 的 swipe 判定同时看速度、距离和方向，说明成熟库不会只靠距离阈值。参考源码：<https://github.com/hammerjs/hammer.js/blob/master/src/recognizers/swipe.js>
- use-gesture 暴露 `swipe.velocity`、`swipe.distance`、`swipe.duration` 等参数，说明速度、距离、时长组合是常见手势抽象。参考文档：<https://use-gesture.netlify.app/docs/options/>

## 4. 推荐架构

新增三个底层模块，逐步替换现有重复状态机。

### 4.1 `gesture-engine.js`

职责是输入和生命周期，不包含抽屉或面板业务。

应统一处理：

- `pointerdown / pointermove / pointerup / pointercancel / lostpointercapture`
- 主指针选择与 `pointerId` 隔离
- 鼠标左键过滤
- `setPointerCapture` 与释放
- 起拖前意图判定
- rAF 写入队列
- 最近 80-120ms 速度采样窗口
- `cancelActiveGesture(reason)`，供外部 overlay 状态变化或路由变化调用
- 动画中断接管

输出给调用方的数据应包括：

- `axis`
- `delta`
- `clamped`
- `progress`
- `velocity`
- `peakVelocity`
- `duration`
- `direction`
- `isDragging`
- `cancelReason`

### 4.2 `gesture-physics.js`

职责是判定和释放目标。

建议统一采用三类条件：

```js
shouldCommit =
  directionMatches
  && (
    progress >= progressThreshold
    || distance >= distanceThreshold
    || (velocity >= velocityThreshold && distance >= minFlingDistance)
  )
```

推荐初始参数：

| 参数 | 建议值 | 用途 |
|---|---:|---|
| `startThreshold` | 8px | 起拖前过滤抖动 |
| `slope` | 1.5 | 防止斜向误触 |
| `distanceThreshold.horizontal` | 50px | 延续现有抽屉阈值 |
| `distanceThreshold.vertical` | 80px | 延续现有面板阈值 |
| `progressThreshold` | 0.38 | 拖过约三分之一后倾向完成 |
| `velocityThreshold` | 0.45px/ms | 快速甩动触发 |
| `minFlingDistance` | 18px | 防止原地抖动被速度误判 |
| `velocityWindowMs` | 100ms | 平滑最后一帧速度噪声 |
| `projectRatio` | 120ms | 用速度投影辅助目标选择 |

速度不能只取最后一次 move。保留采样队列：

- 每次 move 记录 `{ time, position }`。
- 清理超过 `velocityWindowMs` 的旧样本。
- 释放时用窗口首尾位置计算平均速度。
- 同时记录同方向峰值速度，避免快速滑动后短暂停顿完全丢失意图。
- 若最后 50ms 反向移动，则降低峰值权重，避免误触。

### 4.3 `gesture-animation.js`

职责是视觉位置、动画登记、取消和续接。

必须支持：

- `startRelease(el, axis, from, to, velocity, secondaryTargets)`
- `interrupt(el)`，返回当前视觉位置并取消旧动画
- `finish()`，把最终 transform/opacity 写回 inline style，再取消 WAAPI 实例
- fallback 到同步设置样式

可中断动画的关键步骤：

1. 新 pointerdown 命中可拖区域。
2. 查询该元素是否有未完成释放动画。
3. 从 `getComputedStyle(el).transform` 读取当前视觉位置。
4. `animation.cancel()` 取消旧动画。
5. 把当前位置写入 inline transform。
6. 从当前位置开始新的拖拽。

没有这一步，动画中再次按住会出现跳帧或直接被 `releaseAnimating` 拦截。

## 5. 调用方配置

抽屉右滑打开：

- `axis: "x"`
- `from: closedPx`
- `to: 0`
- `bounds: [closedPx, 0]`
- `commitDirection: +1`
- `distanceThreshold: 50`
- `progressThreshold: 0.38`
- `onCommit: openDrawer`
- 无半透明遮罩联动

抽屉左滑关闭：

- `axis: "x"`
- `from: 0`
- `to: closedPx`
- `bounds: [closedPx, 0]`
- `commitDirection: -1`
- `distanceThreshold: 50`
- `onCommit: closeDrawer`
- 无半透明遮罩联动

顶部面板下拉打开：

- `axis: "y"`
- `from: -height`
- `to: 0`
- `bounds: [-height, 0]`
- `commitDirection: +1`
- `canDrag: scrollContainer.scrollTop <= 0`
- `onPrepare: renderQuickAssignmentList`
- `onCommit: commitQuickPanelOpen`
- `onCancel: cancelTopSheetOpen`

顶部面板上滑关闭：

- `axis: "y"`
- `from: 0`
- `to: -height`
- `bounds: [-height, 0]`
- `commitDirection: -1`
- `onCommit: closeAllCenterPanels`

打分面板下滑关闭：

- `axis: "y"`
- `from: 0`
- `to: height`
- `bounds: [0, height]`
- `commitDirection: +1`
- `onCommit: closeScoreSheet`
- 无半透明遮罩联动

## 6. 性能规则

拖拽期间：

- pointermove 不直接多次写 DOM，只更新 pending state。
- rAF 中一次性写 `transform` 和 `opacity`。
- 不读取 layout；尺寸在 pointerdown 缓存。
- 起拖后设置 `will-change: transform`，结束后移除。
- 不改 `left/top/width/height` 等布局属性。
- 不触发全量 `render()`。

释放期间：

- 只动画 `transform` 和 `opacity`。
- 不依赖 CSS transition 和 WAAPI 同时驱动同一属性。
- 释放动画完成后清理 inline 临时状态。
- `resize / orientationchange` 时取消活动手势和释放动画，让 UI 回到当前业务状态。

CSS 约束：

- 允许垂直滚动的主内容保持 `touch-action: pan-y`。
- 水平拖动目标保持 `touch-action: pan-y`，让水平手势交给 JS，垂直滚动交给浏览器。
- 垂直面板拖动目标保持 `touch-action: pan-x`，让垂直手势交给 JS，水平默认行为保留。
- 纯按钮使用 `touch-action: manipulation`。

## 7. 实施阶段

### 阶段 1：新增物理判定，不迁移动画

- 新建 `src/js/gestures/gesture-physics.js`。
- 把速度窗口、投影距离、`shouldCommit()` 单独实现并加纯函数测试。
- `horizontal-drag.js` 先接入速度窗口和 commit 判定。

验收：

- 慢拖未达阈值回弹。
- 慢拖超过距离触发。
- 快速甩动即使距离较短也触发。
- 反方向甩动不触发。

### 阶段 2：新增动画登记与中断

- 新建 `src/js/gestures/gesture-animation.js`。
- 替换 `release-animation.js` 的内部实现，保留 `animateRelease()` 对外接口。
- 支持 `interruptRelease(el)`。
- 先只让 horizontal 使用中断能力。

验收：

- 抽屉关闭动画未完成时再次按住，抽屉从当前视觉位置被接管。
- 无跳帧、无瞬移、无动画叠加。
- 动画完成后 inline style 清理正确。

### 阶段 3：收敛状态机

- 新建 `gesture-engine.js`。
- 用配置化引擎替换 `horizontal-drag.js` 内部状态机。
- 再替换 `createVerticalDragGesture()`。
- 最后替换 `createTopSheetOpenGesture()`。

验收：

- `docs/gesture-refactor-checklist.md` 全部通过。
- drawer、quickPanel、newAssignmentPanel、scoreSheet 的释放判定一致。
- 多指快速切换不串扰。

### 阶段 4：删除重复实现与旧备注

- 删除重复的 rAF、velocity、capture、clear style 代码。
- 更新 `docs/gesture-refactor-checklist.md`，移除“右滑≥50px 触发关闭为原码既有行为”的旧备注。
- 更新后续计划中已经完成或失效的项。

验收：

- `rg "lastVelocity|releaseAnimating|pendingTransform|rafId" src/js/gestures` 只应出现在底层引擎或动画模块。
- `node build.mjs` 通过。
- 手动清单通过。

## 8. 不推荐方向

- 不建议引入大型手势库。当前手势面少、业务钩子强，引入库会把问题转成适配成本。
- 不建议只调 CSS transition 曲线。触发意图和动画中断问题不会因此解决。
- 不建议一步替换所有手势。状态机迁移影响面大，应先让水平抽屉跑通，再迁移垂直手势。
- 不建议长期保留 `will-change`。它提升合成稳定性，也会增加内存占用，应只在拖拽和短释放期间启用。

## 9. 验证清单

自动检查：

```powershell
node build.mjs
rg "lastVelocity|releaseAnimating|pendingTransform|rafId" src/js/gestures
rg "touch-action" src/css
```

手动检查：

- 抽屉慢拖 20px 松手，应回弹。
- 抽屉快速右甩 20-40px，应打开。
- 抽屉打开后快速左甩 20-40px，应关闭。
- 抽屉正在关闭时按住，应从当前视觉位置继续拖。
- 顶部面板打开动画中按住，应从当前视觉位置继续拖。
- 打分面板下滑关闭，快甩和慢拖都符合相同判定。
- 主列表垂直滚动不被水平抽屉手势误拦截。
- 输入框、按钮、导航按钮不起拖。
- 多指触摸不导致位移跳变。

性能检查：

- Chrome DevTools Performance 中拖拽帧无长任务。
- 拖拽期间没有 Layout 抖动。
- 动画属性只包含 transform / opacity。
- 结束后元素不残留长期 `will-change`。

## 10. 回滚

- 阶段 1 出问题：回退 `gesture-physics.js` 接入点，恢复固定距离判定。
- 阶段 2 出问题：恢复 `release-animation.js` 旧实现，禁用动画中断。
- 阶段 3 出问题：按调用方逐个回退，优先保留已验证的 horizontal。
- 阶段 4 出问题：只恢复文档或删除清理提交，不影响运行代码。

全部改动均为 UI 手势层，不触碰 `localStorage["asmc4_assignments_v1"]`，无数据迁移。
