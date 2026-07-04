export function bindSettingSwitch(switchEl, toggleFn) {
  if (!switchEl) return;
  const rowEl = switchEl.closest(".setting-row, .quick-setting-row");
  rowEl?.addEventListener("click", toggleFn);
  switchEl.addEventListener("click", event => {
    event.stopPropagation();
    toggleFn();
  });
}
