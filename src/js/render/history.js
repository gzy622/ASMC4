import { getHistoryEntries } from "../state.js";
import { historyList } from "../dom-refs.js";
import { escapeHTML } from "../utils/escapeHTML.js";

function formatHistoryTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

export function renderHistoryList() {
  if (!historyList) return;

  const entries = getHistoryEntries();
  if (entries.length === 0) {
    historyList.innerHTML = `<p class="history-empty">暂无操作记录</p>`;
    return;
  }

  const currentIndex = entries.findIndex(entry => entry.isCurrent);

  historyList.innerHTML = entries.map(entry => {
    const classes = ["history-entry"];
    if (entry.isCurrent) classes.push("is-current");
    else if (currentIndex >= 0 && entry.index > currentIndex) classes.push("is-future");

    return `
      <button
        class="${classes.join(" ")}"
        type="button"
        data-index="${entry.index}"
        ${entry.isCurrent ? 'aria-current="step"' : ""}
      >
        <span class="history-entry-label">${escapeHTML(entry.label)}</span>
        <span class="history-entry-time">${formatHistoryTime(entry.timestamp)}</span>
      </button>
    `;
  }).join("");
}
