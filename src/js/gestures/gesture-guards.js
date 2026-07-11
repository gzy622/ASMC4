import {
  appToast,
  confirmPanel,
  drawer,
  newAssignmentPanel,
  quickPanel,
  scoreSheet,
} from "../dom-refs.js";
import { FLOATING_LAYER_ELS } from "../ui/floating-layers.js";
import { isQuickPanelPullPreview } from "./layer-motion-state.js";
import { isLayerOpenForGestureBlock, isTargetReleaseAnimating } from "./motion-registry.js";

/** 表单控件：不触发面板下拉打开 */
export const FORM_CONTROL_SELECTOR = "button:not(.student-card), input, select, textarea";

/** 导航控件：按压反馈与壳层/边缘手势排除共用 */
export const NAV_CHROME_SELECTOR = ".nav-button, .icon-button, .title-wrap";

/** 边缘横滑 / 广义壳层关闭：排除浮层与导航控件 */
export const FLOATING_UI_EXCLUDE_SELECTOR =
  `.drawer, .score-sheet, .top-sheet, .modal-panel, .fullscreen-panel, ${NAV_CHROME_SELECTOR}`;

/** 顶栏主操作（不算壳层空白）；限定 .app-bar 以免误伤浮层内同类 class */
export const PRIMARY_CHROME_SELECTOR = NAV_CHROME_SELECTOR
  .split(", ")
  .map((sel) => `.app-bar ${sel}`)
  .join(", ");

/** quickPanel 壳层关闭：不含 top-sheet（由 #quickPanel 单独排除） */
export const QUICK_PANEL_SHELL_EXCLUDE_SELECTOR =
  `.drawer, .score-sheet, .fullscreen-panel, ${NAV_CHROME_SELECTOR}`;

export const OTHER_MODAL_PANELS_SELECTOR =
  "#newAssignmentPanel, #confirmPanel, #rosterEditorPanel, #settingsPanel";

export const DRAWER_FILTER_SELECTOR = ".drawer-filter";
export const QUICK_PANEL_HISTORY_SELECTOR = "#quickPanelHistoryView";
export const QUICK_PANEL_SELECTOR = "#quickPanel";

export function isTouchOn(target, selector) {
  return !!target?.closest(selector);
}

export function isTouchOnFormControl(target) {
  return isTouchOn(target, FORM_CONTROL_SELECTOR);
}

export function isPrimaryChromeClick(target) {
  return isTouchOn(target, PRIMARY_CHROME_SELECTOR);
}

export function isConfirmPanelOpen() {
  return confirmPanel.classList.contains("is-open");
}

export function isPanelVisuallyOpen(el) {
  return el?.classList.contains("is-open") ?? false;
}

export function isToastVisible() {
  return appToast.classList.contains("is-visible") && !appToast.hidden;
}

export function anyFloatingLayerBlocksGesture() {
  return FLOATING_LAYER_ELS.some(el => isLayerOpenForGestureBlock(el));
}

export function blocksQuickPanelPull() {
  if (isQuickPanelPullPreview()) return true;
  if (isTargetReleaseAnimating(quickPanel)) return true;
  return anyFloatingLayerBlocksGesture();
}

export function canQuickPanelPullAtScrollTop(scrollTop) {
  if (isTargetReleaseAnimating(quickPanel)) return false;
  return !anyFloatingLayerBlocksGesture() && scrollTop <= 1;
}

export function blocksDrawerEdgeOpen() {
  return isLayerOpenForGestureBlock(quickPanel)
    || isLayerOpenForGestureBlock(newAssignmentPanel)
    || isLayerOpenForGestureBlock(scoreSheet);
}

// ── quickPanel 四类动作：开始判断 ──

export function canStartQuickPanelPullOpen(event) {
  if (isTargetReleaseAnimating(quickPanel)) return false;
  if (blocksQuickPanelPull()) return false;
  return !isTouchOnFormControl(event.target);
}

export function canStartQuickPanelInnerClose(event) {
  return isPanelVisuallyOpen(quickPanel)
    && !isTargetReleaseAnimating(quickPanel)
    && !isTouchOn(event.target, QUICK_PANEL_HISTORY_SELECTOR);
}

export function canStartQuickPanelShellClose(event) {
  if (isTargetReleaseAnimating(quickPanel)) return false;
  if (isConfirmPanelOpen()) return false;
  if (!isPanelVisuallyOpen(quickPanel)) return false;
  if (isTouchOn(event.target, QUICK_PANEL_SELECTOR)) return false;
  if (isTouchOn(event.target, QUICK_PANEL_SHELL_EXCLUDE_SELECTOR)) return false;
  return !isTouchOn(event.target, OTHER_MODAL_PANELS_SELECTOR);
}

// ── top-sheet（newAssignment）关闭 ──

export function canStartTopSheetInnerClose(panel) {
  return !isTargetReleaseAnimating(panel);
}

export function canStartTopSheetShellClose(panel, event) {
  if (isTargetReleaseAnimating(panel)) return false;
  if (isConfirmPanelOpen()) return false;
  if (!isPanelVisuallyOpen(panel)) return false;
  return !isTouchOn(event.target, FLOATING_UI_EXCLUDE_SELECTOR);
}

// ── drawer ──

export function canStartDrawerEdgeOpen(event) {
  if (isTouchOn(event.target, FLOATING_UI_EXCLUDE_SELECTOR)) return false;
  if (isTargetReleaseAnimating(drawer)) return false;
  if (blocksDrawerEdgeOpen()) return false;
  return true;
}

export function canStartDrawerInnerClose(event) {
  if (isTargetReleaseAnimating(drawer)) return false;
  if (isTouchOn(event.target, DRAWER_FILTER_SELECTOR)) return false;
  return true;
}

export function canStartDrawerShellClose(event) {
  if (isTargetReleaseAnimating(drawer)) return false;
  if (!isPanelVisuallyOpen(drawer)) return false;
  return !isTouchOn(event.target, FLOATING_UI_EXCLUDE_SELECTOR);
}

// ── scoreSheet ──

export function canStartScoreSheetInnerClose(event, isSheetBusy) {
  if (isSheetBusy) return false;
  if (isTargetReleaseAnimating(scoreSheet)) return false;
  if (isConfirmPanelOpen()) return false;
  return isPanelVisuallyOpen(scoreSheet);
}

export function canStartScoreSheetShellClose(event, isSheetBusy) {
  if (isSheetBusy) return false;
  if (isConfirmPanelOpen()) return false;
  if (!isPanelVisuallyOpen(scoreSheet)) return false;
  return !isTouchOn(event.target, FLOATING_UI_EXCLUDE_SELECTOR);
}

// ── toast ──

export function canStartToastDismiss() {
  return isToastVisible();
}
