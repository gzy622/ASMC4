import { hideNameSwitch, scoringModeSwitch, scoreTensModeSwitch } from "../dom-refs.js";

function syncSwitch(el, on, labelOn, labelOff) {
  el.classList.toggle("is-on", on);
  el.setAttribute("aria-pressed", String(on));
  el.setAttribute("aria-label", on ? labelOn : labelOff);
}

export function renderSettingsState(state) {
  const showRealNames = !state.hideNames;
  syncSwitch(
    hideNameSwitch,
    showRealNames,
    "当前显示真实姓名，点击后隐藏",
    "当前隐藏真实姓名，点击后显示"
  );

  syncSwitch(
    scoringModeSwitch,
    state.scoringMode,
    "打分模式已开启，点击关闭",
    "打分模式已关闭，点击开启"
  );

  syncSwitch(
    scoreTensModeSwitch,
    state.scoreTensMode,
    "×10模式已开启，点击关闭",
    "×10模式已关闭，点击开启"
  );
}