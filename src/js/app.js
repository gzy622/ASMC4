import { render } from "./render/index.js";
import { bindEvents } from "./events/index.js";
import "./gestures/score-swipe.js";
import "./gestures/drawer-gestures.js";
import "./gestures/panel-swipe.js";
import "./gestures/press-feedback.js";
import "./gestures/toast-swipe.js";
import "./native-shim.js";
import "./utils/back-guard.js";
import { fillSubjectSelect, fillDrawerSubjectFilter } from "./utils/subject-select.js";
import { BUILD_TIMESTAMP } from "./build-version.js";
import { quickSubjectSelect, newAssignmentSubjectInput, drawerSubjectFilter, drawerVersion, bootMask, studentGrid } from "./dom-refs.js";
import { setThemeColor } from "./utils/dom.js";
import {
  createDebugTraceApi,
  setTraceRuntimeSnapshotProvider
} from "./utils/trace.js";
import {
  currentScoringStudent,
  isUiTransitionBusy
} from "./runtime.js";

setTraceRuntimeSnapshotProvider(() => ({
  uiTransitionBusy: isUiTransitionBusy(),
  scoringStudentId: currentScoringStudent ? String(currentScoringStudent.id) : null
}));

if (typeof window !== "undefined") {
  window.__ASMC4_DEBUG_TRACE__ = createDebugTraceApi();
}

setThemeColor("#f4f4f4");

fillSubjectSelect(quickSubjectSelect);
fillSubjectSelect(newAssignmentSubjectInput);
fillDrawerSubjectFilter(drawerSubjectFilter);

if (drawerVersion) {
  drawerVersion.textContent = BUILD_TIMESTAMP
    ? `构建时间 ${BUILD_TIMESTAMP}`
    : "构建时间 开发环境";
}

bindEvents();
render();

if (bootMask) {
  let disposed = false;
  let prevKey = null;
  let stableCount = 0;

  const reveal = () => {
    if (disposed) return;
    disposed = true;
    bootMask.classList.add("is-hidden");
    bootMask.addEventListener("transitionend", () => bootMask.remove(), { once: true });
  };

  const checkStable = () => {
    if (disposed) return;
    if (!studentGrid) { reveal(); return; }
    const { width, height } = studentGrid.getBoundingClientRect();
    const key = `${width},${height}`;
    stableCount = key === prevKey ? stableCount + 1 : 0;
    prevKey = key;
    if (stableCount >= 2) { reveal(); return; }
    requestAnimationFrame(checkStable);
  };

  (document.fonts?.ready ?? Promise.resolve()).then(() => {
    requestAnimationFrame(checkStable);
  });

  setTimeout(reveal, 600);
}
