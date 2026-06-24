import { quickPanel, newAssignmentPanel } from "../dom-refs.js";
import { closeAllCenterPanels } from "../ui/panels.js";
import { createVerticalDragGesture } from "./drag-gesture.js";

createVerticalDragGesture(quickPanel, { closeDirection: -1, onClose: closeAllCenterPanels });
createVerticalDragGesture(newAssignmentPanel, { closeDirection: -1, onClose: closeAllCenterPanels });
