import { hideNameSwitch } from "../dom-refs.js";

export function renderSettingsState(state) {
  const showRealNames = !state.hideNames;

  hideNameSwitch.classList.toggle("is-on", showRealNames);
  hideNameSwitch.setAttribute("aria-pressed", String(showRealNames));
  hideNameSwitch.setAttribute(
    "aria-label",
    showRealNames ? "当前显示真实姓名，点击后隐藏" : "当前隐藏真实姓名，点击后显示"
  );
}
