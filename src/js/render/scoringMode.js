import { settingsButton } from "../dom-refs.js";

export function renderScoringMode(state) {
  const isOn = state.scoringMode;
  settingsButton.classList.toggle("is-on", isOn);
  settingsButton.setAttribute("aria-pressed", String(isOn));
  settingsButton.setAttribute(
    "aria-label",
    isOn ? "打分模式已开启，点击关闭" : "切换打分模式"
  );
}
