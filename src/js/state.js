import { STORAGE_KEY, STATUS } from "./constants.js";
import { normalizeAssignment, normalizeRosterFromBackup } from "./utils/normalize.js";
import { clone } from "./utils/clone.js";
import { defaultStudents, defaultAssignment } from "./data/defaults.js";

const MAX_HISTORY = 50;

let appState = loadAppState();
let lastSerialized = JSON.stringify(appState);
const historyEntries = [{
  label: "打开应用",
  timestamp: Date.now(),
  snapshot: lastSerialized
}];
let historyIndex = 0;

export { defaultStudents };

export function getState() {
  return appState;
}

export function canUndo() {
  return historyIndex > 0;
}

export function canRedo() {
  return historyIndex < historyEntries.length - 1;
}

export function getHistoryEntries() {
  return historyEntries.map((entry, index) => ({
    index,
    label: entry.label,
    timestamp: entry.timestamp,
    isCurrent: index === historyIndex
  }));
}

function persistSerialized(serialized) {
  try {
    localStorage.setItem(STORAGE_KEY, serialized);
  } catch (error) {
    console.warn("保存失败：localStorage 可能已满", error);
  }
}

function trimHistoryEntries() {
  while (historyEntries.length > MAX_HISTORY) {
    historyEntries.shift();
    historyIndex = Math.max(0, historyIndex - 1);
  }
}

export function saveAppState({ history = true, label = "" } = {}) {
  const currentSerialized = JSON.stringify(appState);
  if (currentSerialized === lastSerialized) return;

  historyEntries.length = historyIndex + 1;

  if (history) {
    historyEntries.push({
      label: label || "未命名操作",
      timestamp: Date.now(),
      snapshot: currentSerialized
    });
    historyIndex++;
    trimHistoryEntries();
  } else {
    historyEntries[historyIndex].snapshot = currentSerialized;
  }

  lastSerialized = currentSerialized;
  persistSerialized(currentSerialized);
}

export function jumpToHistoryEntry(index) {
  if (index < 0 || index >= historyEntries.length || index === historyIndex) return false;

  appState = clone(JSON.parse(historyEntries[index].snapshot));
  historyIndex = index;
  lastSerialized = historyEntries[index].snapshot;
  persistSerialized(lastSerialized);
  return true;
}

export function undoAppState() {
  return jumpToHistoryEntry(historyIndex - 1);
}

export function redoAppState() {
  return jumpToHistoryEntry(historyIndex + 1);
}

export function getCurrentAssignment() {
  let assignment = appState.assignments.find(item => item.id === appState.currentAssignmentId);

  if (!assignment) {
    assignment = appState.assignments[0] || clone(defaultAssignment);
    appState.currentAssignmentId = assignment.id;
  }

  return assignment;
}

export function getAssignmentStats(assignment) {
  const isEnglish = assignment.subject === "英语";
  const rosterMap = new Map(appState.roster.map(r => [String(r.id), r]));

  const activeStudents = assignment.students.filter(student => {
    if (student.status === STATUS.NONE) return false;
    if (isEnglish) {
      const entry = rosterMap.get(String(student.id));
      if (entry && entry.nonEnglish) return false;
    }
    return true;
  });

  const submitted = activeStudents.filter(student => student.status === STATUS.SUBMITTED).length;
  const total = activeStudents.length;

  return {
    submitted,
    total,
    pending: Math.max(0, total - submitted)
  };
}

function loadAppState() {
  const LEGACY_KEYS = ["homework_ui_assignments_v4"];

  try {
    if (!localStorage.getItem(STORAGE_KEY)) {
      for (const legacyKey of LEGACY_KEYS) {
        const legacyData = localStorage.getItem(legacyKey);
        if (legacyData) {
          localStorage.setItem(STORAGE_KEY, legacyData);
          localStorage.removeItem(legacyKey);
          break;
        }
      }
    }
  } catch (_) {}

  const rosterFromDefault = () => defaultStudents.map(s => ({
    id: s.id,
    serial: s.serial,
    name: s.name,
    nonEnglish: false
  }));

  const fallback = {
    showRealNames: true,
    scoringMode: false,
    scoreTensMode: false,
    showBarScoringToggle: true,
    showBarStats: true,
    hapticsEnabled: true,
    currentAssignmentId: defaultAssignment.id,
    assignments: [clone(defaultAssignment)],
    roster: rosterFromDefault()
  };

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return fallback;

    const parsed = JSON.parse(stored);

    if (!parsed || !Array.isArray(parsed.assignments)) {
      return fallback;
    }

    const assignments = parsed.assignments
      .filter(item => item && Array.isArray(item.students))
      .map(normalizeAssignment);

    if (assignments.length === 0) {
      return fallback;
    }

    const currentAssignment = assignments.find(item => String(item.id) === String(parsed.currentAssignmentId))
      || assignments[0];

    const roster = normalizeRosterFromBackup(parsed, assignments[0].students);

    return {
      showRealNames: parsed.showRealNames !== false,
      scoringMode: Boolean(parsed.scoringMode),
      scoreTensMode: Boolean(parsed.scoreTensMode),
      showBarScoringToggle: parsed.showBarScoringToggle !== false,
      showBarStats: parsed.showBarStats !== false,
      hapticsEnabled: parsed.hapticsEnabled !== false,
      currentAssignmentId: currentAssignment.id,
      assignments,
      roster
    };
  } catch (error) {
    console.warn("读取存储失败，使用默认数据", error);
    return fallback;
  }
}
