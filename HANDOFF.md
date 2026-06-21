# HANDOFF.md

> Reasonix（规划者）与 CodeWhale（执行者）之间的交接文档。
> 每次新任务直接覆盖，始终只保留当前一条任务。

---

## 计划

### 任务：侧边栏作业列表底部增加"+ 新建作业"条目

> ⚠️ 注意：这是列表内嵌的加号条目方案，**不是**在底部操作栏（导出/导入那排）加按钮。
> 如果 index.html 中已有 `newAssignmentDrawerBtn`，请先删除它及相关代码。

**需求概述**：在侧边栏作业列表所有条目下方，渲染一个与普通条目风格一致
但显示"+ 新建作业"的虚线边框条目，点击打开新建面板。

---

#### 一、CSS 新增（`.assignment-item.is-active` 样式之后）

```css
.assignment-item-add {
  width: 100%;
  min-height: 54px;
  border: 1.5px dashed var(--line);
  border-radius: 14px;
  background: transparent;
  box-shadow: none;
  padding: 9px 12px;
  margin-bottom: 8px;
  cursor: pointer;
  font: inherit;
  color: var(--muted);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease, transform 0.12s ease;
}

.assignment-item-add:active {
  transform: scale(0.985);
  background: #f0fbf5;
  border-color: #166534;
  color: #166534;
}
```

---

#### 二、JS `renderAssignmentList` 改造

在 `.map(...).join("")` 的**结果字符串之后用 `+` 拼接**一条新建条目：

```js
function renderAssignmentList() {
  assignmentList.innerHTML = appState.assignments.map(assignment => {
    const stats = getAssignmentStats(assignment);
    const activeClass = assignment.id === appState.currentAssignmentId ? "is-active" : "";

    return `
      <div
        class="assignment-item ${activeClass}"
        role="button"
        tabindex="0"
        data-assignment-id="${assignment.id}"
        aria-label="${escapeHTML(assignment.title)}，${stats.submitted}/${stats.total} 已交"
      >
        <div class="assignment-item-body">
          <span class="assignment-name" data-assignment-id="${assignment.id}">${escapeHTML(assignment.title)}</span>
          <span class="assignment-meta">${stats.submitted}/${stats.total} 已交 · ${stats.pending} 未交</span>
        </div>
        <div class="assignment-item-actions">
          <button class="assignment-item-action" data-action="edit" data-assignment-id="${assignment.id}" type="button" aria-label="编辑 ${escapeHTML(assignment.title)}">✎</button>
          <button class="assignment-item-action danger" data-action="delete" data-assignment-id="${assignment.id}" type="button" aria-label="删除 ${escapeHTML(assignment.title)}">✕</button>
        </div>
      </div>
    `;
  }).join("") + `
    <div class="assignment-item-add" role="button" tabindex="0" aria-label="新建作业">
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.2" stroke-linecap="square"/>
      </svg>
      <span style="font-size:15px;font-weight:600;">新建作业</span>
    </div>
  `;
}
```

---

#### 三、JS click 委托（`assignmentList` 的 click 处理器内）

在 `// 编辑中输入框不触发切换` 那行之后、`// 编辑/删除按钮` 之前，插入：

```js
  // 新建作业条目
  if (event.target.closest(".assignment-item-add")) {
    closeDrawer();
    openNewAssignmentPanel();
    return;
  }
```

---

#### 四、JS keydown 委托（`assignmentList` 的 keydown 处理器内）

同样在合适位置插入：

```js
  // 新建作业条目
  if (event.target.closest(".assignment-item-add")) {
    event.preventDefault();
    closeDrawer();
    openNewAssignmentPanel();
    return;
  }
```

---

#### 五、清理（如果存在旧方案的代码）

如果 index.html 中存在以下旧方案代码，请删除：
- ~~`<button ... id="newAssignmentDrawerBtn">新建作业</button>`~~ ✅ 已删除
- ~~`const newAssignmentDrawerBtn = ...`~~ ✅ 已替换为注释
- ~~`newAssignmentDrawerBtn.addEventListener(...)`~~ ✅ 已替换为注释

---

#### 六、验证清单

- [x] 作业列表底部有一条虚线边框的"+ 新建作业"条目，与普通条目等高
- [x] 点击 → 抽屉关闭，弹出新建作业面板
- [x] 按 Enter/Space → 同样打开新建面板
- [x] active 时缩放 + 绿色高亮
- [x] 加号 SVG 与顶部 app-bar 的 + 按钮风格一致
- [x] 导出/导入按钮保持原样不变
- [x] 删除所有作业后，该条目仍然存在

---

## 执行结果

**状态：已完成**（2026-06-21 by CodeWhale）

全部 5 处改动在 `index.html` 中落地，验证清单 7 项通过。

| # | 改动 | 位置（行号） |
|---|---|---|
| 一 | CSS 新增 `.assignment-item-add` + `:active` | 524–549 |
| 二 | `renderAssignmentList` 末尾拼接新建条目 HTML | 2065–2071 |
| 三 | click 委托插入新建条目处理（`closeDrawer()` + `openNewAssignmentPanel()`） | 1639–1644 |
| 四 | keydown 委托插入 Enter/Space 处理 | 1675–1682 |
| 五 | 清理旧 `newAssignmentDrawerBtn`（HTML/JS 引用/事件绑定） | 三处已替换为注释 |

注意：行号基于最终版本，若后续改动请重新核对。
