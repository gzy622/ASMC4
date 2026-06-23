import { scoringToggle } from "../dom-refs.js";

export function renderScoringMode(state) {
  const isOn = state.scoringMode;
  scoringToggle.classList.toggle("is-on", isOn);
  scoringToggle.setAttribute("aria-pressed", String(isOn));
  scoringToggle.setAttribute(
    "aria-label",
    isOn ? "打分模式已开启，点击关闭" : "切换打分模式"
  );
}
