import {
  confirmScrim,
  scoreSheet,
  rosterEditorPanel,
  settingsPanel,
  quickPanel,
  newAssignmentPanel,
  drawer,
} from "../dom-refs.js";
import {
  beginLayerExplicitOpen,
  beginLayerReleaseAnimation,
  endLayerExplicitOpen,
  endLayerReleaseAnimation,
  isLayerExplicitOpening,
  isLayerOpeningAnimating,
  isLayerOpenForGestureBlock,
  isLayerReleaseAnimating,
  isLayerReleaseOpening,
} from "./layer-motion-state.js";

const GESTURE_LAYER_ELS = [
  confirmScrim,
  scoreSheet,
  rosterEditorPanel,
  settingsPanel,
  quickPanel,
  newAssignmentPanel,
  drawer,
];

export {
  beginLayerReleaseAnimation as beginTargetReleaseAnimation,
  endLayerReleaseAnimation as endTargetReleaseAnimation,
  isLayerReleaseAnimating as isTargetReleaseAnimating,
  isLayerReleaseOpening as isTargetOpenReleaseAnimating,
  beginLayerExplicitOpen as beginTargetExplicitOpenAnimation,
  endLayerExplicitOpen as endTargetExplicitOpenAnimation,
  isLayerExplicitOpening as isTargetExplicitOpenAnimating,
  isLayerOpeningAnimating,
  isLayerOpenForGestureBlock,
};

export function isCrossPanelOpenBlocked() {
  return GESTURE_LAYER_ELS.some(el => isLayerOpeningAnimating(el));
}
