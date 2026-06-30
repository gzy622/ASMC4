import {
  hideNameSwitch,
  quickHideNameSwitch,
  quickScoringModeSwitch,
  scoringModeSwitch,
  scoreTensModeSwitch,
  showBarScoringToggleSwitch,
  showBarStatsSwitch,
  hapticsEnabledSwitch
} from "../dom-refs.js";

function syncSwitch(el, on, labelOn, labelOff) {
  if (!el) return;
  el.classList.toggle("is-on", on);
  el.setAttribute("aria-pressed", String(on));
  el.setAttribute("aria-label", on ? labelOn : labelOff);
}

export function syncHideNameSwitches(state) {
  const showRealNames = !state.hideNames;
  const hideNameLabels = [
    "当前显示真实姓名，点击后隐藏",
    "当前隐藏真实姓名，点击后显示"
  ];
  syncSwitch(hideNameSwitch, showRealNames, hideNameLabels[0], hideNameLabels[1]);
  syncSwitch(quickHideNameSwitch, showRealNames, hideNameLabels[0], hideNameLabels[1]);
}

export function renderSettingsState(state) {
  syncHideNameSwitches(state);

  const scoringLabels = [
    "打分模式已开启，点击关闭",
    "打分模式已关闭，点击开启"
  ];
  syncSwitch(scoringModeSwitch, state.scoringMode, scoringLabels[0], scoringLabels[1]);
  syncSwitch(quickScoringModeSwitch, state.scoringMode, scoringLabels[0], scoringLabels[1]);

  const barScoringLabels = [
    "顶栏已显示打分按钮，点击隐藏",
    "顶栏已隐藏打分按钮，点击显示"
  ];
  syncSwitch(
    showBarScoringToggleSwitch,
    state.showBarScoringToggle !== false,
    barScoringLabels[0],
    barScoringLabels[1]
  );

  const barStatsLabels = [
    "顶栏已显示已交人数，点击隐藏",
    "顶栏已隐藏已交人数，点击显示"
  ];
  syncSwitch(
    showBarStatsSwitch,
    state.showBarStats !== false,
    barStatsLabels[0],
    barStatsLabels[1]
  );

  syncSwitch(
    scoreTensModeSwitch,
    state.scoreTensMode,
    "×10模式已开启，点击关闭",
    "×10模式已关闭，点击开启"
  );

  syncSwitch(
    hapticsEnabledSwitch,
    state.hapticsEnabled !== false,
    "振动反馈已开启，点击关闭",
    "振动反馈已关闭，点击开启"
  );
}