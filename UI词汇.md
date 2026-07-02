# ASMC4 UI 词汇对照表

沟通界面问题时，优先说「推荐叫法」。需要定位代码时，再看右侧的 id、class 或函数名。

描述问题按这个顺序说：位置、控件、现象。比如：「打分面板里的 ×10 键点了没反应」。

## 浮层分类

| 推荐叫法 | 代码 | 成员 | 打开方式 |
|----------|------|------|----------|
| 顶部 sheet | `.top-sheet` | 当前作业面板、新建作业面板 | 点标题、点加号，或列表顶部下拉 |
| 居中确认框 | `.modal-panel.confirm-panel` | 确认框 | 删除等操作前弹出 |
| 底部 sheet | `.score-sheet` | 打分面板 | 操作学生卡片 |
| 全屏页 | `.fullscreen-panel` | 设置页、名单编辑页 | 从侧栏进入 |
| 作业侧栏 | `.drawer` | 作业列表 | 点菜单按钮，或主界面右滑 |

## 主界面

主界面是顶栏加学生列表，外层容器是 `.phone`。

| 推荐叫法 | 代码 | 说明 |
|----------|------|------|
| 主界面 / 手机框 | `.phone` | 整个 app 可视区域 |
| 顶栏 | `.app-bar` | 顶部操作区 |
| 菜单按钮 | `#menuButton` / `.nav-button` | 打开作业侧栏 |
| 已交人数 | `#barStats` / `.bar-stats` | 如 `12/50`，可在设置里隐藏 |
| 作业标题区 | `#titleButton` / `#assignmentTitle` | 点开当前作业面板 |
| 进度条 | `#progressBar` / `.progress-bar` | 当前作业提交进度 |
| 打分按钮 | `#scoringToggle` / `.icon-button` | 切换打分模式，可在设置里隐藏 |
| 新建按钮 | `#addButton` | 打开新建作业面板 |
| 学生列表 / 学生网格 | `#studentGrid` / `.grid` | 主区域学生卡片 |
| 滚动区 | `.scroll-container` | 列表顶部下拉可打开当前作业面板 |
| 启动遮罩 | `#bootMask` | 打开 app 时的闪屏 |
| 骨架屏 | `.skeleton-card` | 加载完成前的占位卡片 |

## 学生卡片

| 推荐叫法 | 代码 | 说明 |
|----------|------|------|
| 学生卡片 | `.student-card` | 每个学生一格 |
| 序号 | `.serial` | 如 `01` |
| 姓名 | `.name` | 真实姓名，或天干地支代号 |
| 分数角标 | `.badge` | 打分后显示的分数 |
| 备注行 | `.note-text` | 卡片底部备注 |

### 卡片状态

| 推荐叫法 | 代码 | 说明 |
|----------|------|------|
| 未交 | 无额外 class / `STATUS.NORMAL` | 默认状态 |
| 已交 | `.is-submitted` / `STATUS.SUBMITTED` | 高亮，统计里叫「已交」 |
| 无登记 | `.no-registration` / `STATUS.NONE` | 英语作业中的非英语学生，不参与点按 |

### 卡片交互

| 打分模式 | 短按 | 长按 |
|----------|------|------|
| 关闭 | 切换已交 / 未交 | 打开打分面板 |
| 开启 | 打开打分面板 | 打开打分面板 |

## 作业侧栏

| 推荐叫法 | 代码 | 说明 |
|----------|------|------|
| 作业侧栏 | `#assignmentDrawer` / `.drawer` | 左侧滑出的作业列表 |
| 侧栏版本号 | `#drawerVersion` / `.drawer-version` | 显示构建版本 |
| 作业列表 | `#assignmentList` / `.drawer-list` | 侧栏中间列表 |
| 作业项 | `.assignment-item` | 一行一个作业，当前项带 `.is-active` |
| 作业名 | `.assignment-name` | 作业项标题 |
| 科目标签 | `.assignment-subject-tag` | 如「数学」 |
| 已交统计 | `.assignment-meta` | 如 `12/50 已交` |
| 编辑 / 删除小钮 | `.assignment-item-action` | 每项右侧 |
| 行内编辑名 | `.assignment-edit-input` | 点编辑后出现 |
| 行内编辑科目 | `.assignment-edit-subject` | 点编辑后出现 |
| 新建作业行 | `.assignment-item-add` | 列表底部 |
| 导出 / 导入备份 | `#exportBackupBtn` / `#importBackupBtn` | 侧栏底部 |
| 隐藏文件选择 | `#importBackupInput` | 导入备份用 |
| 设置入口 | `#settingsBtn` | 进入设置页 |
| 关闭钮 | `#drawerCloseButton` / `.panel-close` | 右上角关闭 |

## 当前作业面板

当前作业面板是顶部 sheet，代码为 `#quickPanel` / `.top-sheet`。

| 推荐叫法 | 代码 | 说明 |
|----------|------|------|
| 当前作业面板 | `#quickPanel` | 点标题或列表顶部下拉打开 |
| 面板头 | `.panel-head` | 标题和关闭钮所在区域 |
| 关闭钮 | `#quickPanelCloseButton` / `.panel-close` | 关闭当前作业面板 |
| 拖动手柄区 | `.top-sheet-handle-zone` | 上滑关闭的手势区 |
| 拖动手柄 | `.top-sheet-handle` | 手柄横条 |
| 当前作业摘要 | `#quickCurrentSummary` | 科目和统计的容器 |
| 科目标签 | `#quickCurrentSubject` | 当前作业科目 |
| 已交统计 | `#quickCurrentStats` | 当前作业已交人数 |
| 改名输入框 | `#quickRenameInput` / `.quick-edit-name` | 修改作业名称 |
| 科目下拉 | `#quickSubjectSelect` / `.subject-select` | 修改科目 |
| 设置卡片 | `.quick-settings-card` | 当前作业里的设置区 |
| 设置行 | `.quick-setting-row` | 一行设置 |
| 显示真实姓名 | `#quickShowRealNameSwitch` | 当前作业面板里的开关 |
| 打分模式 | `#quickScoringModeSwitch` | 当前作业面板里的开关 |
| 撤回 / 重做 | `#undoButton` / `#redoButton` / `.quick-action-btn` | 历史操作 |
| 反选提交 | `#invertButton` | 已交和未交互换 |
| 删除作业 | `#deleteAssignmentButton` | 删除当前作业 |

关闭相关函数是 `closeFloatingPanels()`，会关闭两个顶部 sheet、确认框，并顺带关打分面板。

## 新建作业面板

新建作业面板是顶部 sheet，代码为 `#newAssignmentPanel` / `.top-sheet`。

| 推荐叫法 | 代码 | 说明 |
|----------|------|------|
| 新建作业面板 | `#newAssignmentPanel` | 点加号或侧栏新建作业行打开 |
| 面板头 | `.panel-head` | 标题和关闭钮 |
| 关闭钮 | `#newAssignmentCloseButton` / `.panel-close` | 关闭面板 |
| 拖动手柄区 | `.top-sheet-handle-zone` | 上滑关闭的手势区 |
| 名称输入框 | `#newAssignmentInput` / `.field` | 新作业名称 |
| 科目下拉 | `#newAssignmentSubjectInput` / `.field` | 新作业科目 |
| 取消 / 创建 | `#newAssignmentCancelButton` / `#newAssignmentCreateButton` | 底部操作 |

## 确认框

| 推荐叫法 | 代码 | 说明 |
|----------|------|------|
| 确认框 / 确认面板 | `#confirmPanel` / `.modal-panel.confirm-panel` | 居中弹出 |
| 遮罩 | `#confirmScrim` / `.confirm-scrim` | 后面的暗层，点击会提示 |
| 确认标题 | `#confirmTitle` | 标题文本 |
| 确认正文 | `#confirmMessage` / `.confirm-message` | 说明文本 |
| 取消 / 确认 | `#confirmCancelButton` / `#confirmOkButton` | 操作按钮 |

## 全屏页

全屏页是 `#settingsPanel` 和 `#rosterEditorPanel` 这两个页面，共用 `.fullscreen-panel`。

### 设置页

| 推荐叫法 | 代码 |
|----------|------|
| 设置页 | `#settingsPanel` |
| 关闭钮 | `#settingsCloseButton` |
| 设置分组 | `.settings-section` |
| 设置行 | `.setting-row` |
| 显示真实姓名 | `#showRealNameSwitch` | 主开关 |
| 顶栏打分按钮 | `#showBarScoringToggleSwitch` |
| 顶栏已交人数 | `#showBarStatsSwitch` |
| 打分模式 | `#scoringModeSwitch` |
| ×10 模式 | `#scoreTensModeSwitch` |
| 振动反馈 | `#hapticsEnabledSwitch` | 仅 Android 壳内显示 |
| 导出 / 导入备份 | `#settingsExportBtn` / `#settingsImportBtn` |
| 编辑名单 | `#settingsRosterBtn` | 切到名单编辑页 |

设置页打开流程由 `openDrawerFullscreenPanel()` 驱动。这个函数只管侧栏展开后淡入全屏页，不是任意浮层打开。

### 名单编辑页

| 推荐叫法 | 代码 |
|----------|------|
| 名单编辑页 | `#rosterEditorPanel` |
| 名单列表 | `#rosterEditorList` / `.fullscreen-panel-body` |
| 名单行 | `.roster-row` |
| 拖动手柄 | `.roster-row-handle` |
| 行内姓名输入 | `.roster-row-input` |
| 重置默认 50 人 | `#rosterResetBtn` / `.roster-foot-btn` |
| 取消 / 保存名单 | `#rosterCancelBtn` / `#rosterSaveBtn` |

## 打分面板

打分面板是底部 sheet，代码为 `#scoreSheet` / `.score-sheet`。

| 推荐叫法 | 代码 | 说明 |
|----------|------|------|
| 打分面板 | `#scoreSheet` / `.score-sheet` | 从学生卡片打开 |
| 拖动手柄 | `.score-sheet-handle` | 顶部横条 |
| 学生序号 / 姓名 | `#scoreStudentSerial` / `#scoreStudentName` | 当前打分学生 |
| 分数显示区 | `#scoreDisplay` / `.score-display` | 显示输入分数 |
| 分数值 | `#scoreDisplayValue` / `.score-display-value` | 当前分数文本 |
| 退格钮 | `#scoreBackspaceBtn` / `.score-display-backspace` | 删除上一位 |
| 数字键盘 | `.score-numpad` / `scoreNumpad` | `scoreNumpad` 是 dom-refs 变量 |
| 数字键 | `.numpad-btn` | 0 到 9 |
| ×10 键 | `#scoreTensBtn` / `.score-tens-btn` | ×10 模式输入 |
| 小数点键 | `[data-action="decimal"]` | 小数点 |
| 备注输入框 | `#scoreNoteInput` / `.score-note-input` | 最多 20 字 |
| 清除备注 | `#scoreNoteClear` | 清空备注 |
| 取消 | `#scoreCancel` / `.dialog-button` | 关闭不保存 |
| 确认 | `#scoreConfirm` / `.score-action-btn` | 保存分数和备注 |

## 全局提示

| 推荐叫法 | 代码 | 说明 |
|----------|------|------|
| 提示条 / Toast | `#appToast` / `.app-toast` | 底部短暂提示 |
| 提示文字 | `#appToastMessage` / `.app-toast-message` | 提示内容 |
| 提示动作钮 | `#appToastAction` / `.app-toast-action` | 如「撤回」 |
| 屏幕阅读器状态 | `#liveStatus` / `.sr-only` | 用户不可见 |

## 通用控件

| 推荐叫法 | 代码 | 说明 |
|----------|------|------|
| 按钮 | `.dialog-button` | 不只用于对话框 |
| 图标按钮 | `.icon-button` | 顶栏加号、打分按钮等 |
| 菜单按钮 | `.nav-button` | 汉堡按钮 |
| 开关 | `.switch` / `.switch-knob` | ON/OFF 滑块 |
| 下拉框 | `.field` / `.subject-select` | 科目选择 |
| 输入框 | `.field` / `.quick-edit-name` | 单行输入 |
| 关闭钮 | `.panel-close` | 侧栏和各面板通用 |
| 宽操作钮 | `.drawer-action-btn` | 侧栏和设置页复用 |
| 快捷操作钮 | `.quick-action-btn` | 当前作业面板里的操作按钮 |

## 命名校准

| 代码名 | 当前含义 |
|--------|----------|
| `showRealNames` / `#showRealNameSwitch` / `#quickShowRealNameSwitch` | true 表示显示真实姓名 |
| `STATUS.SUBMITTED` / `.is-submitted` | 界面叫「已交」 |
| `uiTransitionBusy` | UI 过渡锁，拖拽释放和面板切换期间为 true |
| `openDrawerFullscreenPanel()` / `closeDrawerFullscreenPanel()` | 侧栏展开后进入或退出全屏页 |

## 通用样式名

| 代码名 | 使用范围 |
|--------|----------|
| `.badge` | 在学生卡片里通常是分数角标 |
| `.dialog-button` | 顶部 sheet、确认框、打分面板都在用 |
| `.drawer-action-btn` | 侧栏和设置页都在用 |
| `.phone` | 浏览器预览时的主容器 |
| `.nav-button` | 实际是菜单按钮 |

## 快速查找

| 你说 | 找代码 |
|------|--------|
| 主界面 / 顶栏 / 学生列表 | `.phone` / `.app-bar` / `#studentGrid` |
| 学生卡片 / 已交 / 未交 / 分数角标 | `.student-card` / `.is-submitted` / 无额外 class / `.badge` |
| 作业侧栏 / 作业项 | `#assignmentDrawer` / `.assignment-item` |
| 当前作业面板 | `#quickPanel` / `.top-sheet` |
| 新建作业面板 | `#newAssignmentPanel` / `.top-sheet` |
| 确认框 | `#confirmPanel` / `.modal-panel.confirm-panel` |
| 设置页 / 名单编辑页 | `#settingsPanel` / `#rosterEditorPanel` |
| 打分面板 | `#scoreSheet` / `.score-sheet` |
| 提示条 | `#appToast` |
| 侧栏版本号 | `#drawerVersion` |
| 关浮层面板 | `closeFloatingPanels()` |

## 描述模板

```text
[位置] 里的 [控件] [现象]
```

例子：

- 当前作业面板里的删除作业点了没反应
- 打分面板里的 ×10 键状态不对
- 学生卡片已交状态的分数角标太挤
- 设置页里的显示真实姓名和当前作业面板不一致
- 作业侧栏某个作业项的删除小钮容易误触

不确定名字时，直接说「点某某之后出现的那块」，或者发截图。

最后更新：2026-07-02
