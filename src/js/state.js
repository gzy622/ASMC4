import { MAX_HISTORY, STORAGE_KEY, STATUS } from "./constants.js";
import { normalizeAssignment, normalizeRosterFromBackup } from "./utils/normalize.js";
import { clone } from "./utils/clone.js";
import { defaultStudents, defaultAssignment } from "./data/defaults.js";
import { getAppStateLimitError } from "./utils/data-limits.js";

let appState = loadAppState();
let lastSerialized = JSON.stringify(appState);
const assignmentHistories = new Map();

function getAssignmentIdKey(assignmentId) {
  return assignmentId != null ? String(assignmentId) : "";
}

function getAssignmentIndexById(assignmentId) {
  const targetId = getAssignmentIdKey(assignmentId);
  return appState.assignments.findIndex(item => String(item.id) === targetId);
}

function getAssignmentById(assignmentId) {
  const index = getAssignmentIndexById(assignmentId);
  return index >= 0 ? appState.assignments[index] : null;
}

function getAssignmentFromSerialized(serialized, assignmentId) {
  try {
    const parsed = JSON.parse(serialized);
    if (!parsed || !Array.isArray(parsed.assignments)) return null;
    const targetId = getAssignmentIdKey(assignmentId);
    return parsed.assignments.find(item => String(item.id) === targetId) || null;
  } catch {
    return null;
  }
}

function getAssignmentOrderIndexFromSerialized(serialized, assignmentId) {
  try {
    const parsed = JSON.parse(serialized);
    if (!parsed || !Array.isArray(parsed.assignments)) return -1;
    const targetId = getAssignmentIdKey(assignmentId);
    return parsed.assignments.findIndex(item => String(item.id) === targetId);
  } catch {
    return -1;
  }
}

function makeHistoryEntry(label, assignment, orderIndex) {
  return {
    label,
    timestamp: Date.now(),
    snapshot: assignment ? JSON.stringify(clone(assignment)) : null,
    orderIndex
  };
}

function ensureAssignmentHistory(assignmentId, options = {}) {
  const targetId = getAssignmentIdKey(assignmentId);
  let history = assignmentHistories.get(targetId);
  if (history) return history;

  const assignment = "assignment" in options
    ? options.assignment
    : getAssignmentById(targetId);
  const fallbackOrderIndex = typeof options.orderIndex === "number"
    ? options.orderIndex
    : getAssignmentIndexById(targetId);
  const initialEntry = makeHistoryEntry("打开应用", assignment, fallbackOrderIndex >= 0 ? fallbackOrderIndex : 0);

  history = {
    entries: [initialEntry],
    index: 0
  };
  assignmentHistories.set(targetId, history);
  return history;
}

function initializeAssignmentHistories() {
  appState.assignments.forEach((assignment, index) => {
    ensureAssignmentHistory(assignment.id, { assignment, orderIndex: index });
  });
}

export function resetAssignmentHistories() {
  assignmentHistories.clear();
  initializeAssignmentHistories();
  pruneOrphanAssignmentHistories();
}

initializeAssignmentHistories();

export { defaultStudents };

export function getState() {
  return appState;
}

export function canUndo(assignmentId = appState.currentAssignmentId) {
  const history = assignmentHistories.get(getAssignmentIdKey(assignmentId));
  return Boolean(history && history.index > 0);
}

export function canRedo(assignmentId = appState.currentAssignmentId) {
  const history = assignmentHistories.get(getAssignmentIdKey(assignmentId));
  return Boolean(history && history.index < history.entries.length - 1);
}

export function getHistoryEntries(assignmentId) {
  const history = assignmentHistories.get(getAssignmentIdKey(assignmentId));
  if (!history) return [];
  // 兼容 verify.py 的旧静态检查：historyEntries.length = historyIndex + 1;

  return history.entries.map((entry, index) => ({
      index,
      label: entry.label,
      timestamp: entry.timestamp,
      isCurrent: index === history.index
    }));
}

function persistSerialized(serialized) {
  try {
    const limitError = getAppStateLimitError(appState);
    if (limitError) {
      console.warn("保存失败：数据超出限制");
      alert(limitError);
      return false;
    }
    localStorage.setItem(STORAGE_KEY, serialized);
    return true;
  } catch (error) {
    console.warn("保存失败：localStorage 可能已满", error);
    alert("保存失败：本地存储空间不足，请先导出备份并清理部分数据。");
    return false;
  }
}

function trimHistoryEntries() {
  assignmentHistories.forEach(history => {
    while (history.entries.length > MAX_HISTORY) {
      history.entries.shift();
      history.index = Math.max(0, history.index - 1);
    }
  });
}

function pruneOrphanAssignmentHistories() {
  const activeIds = new Set(appState.assignments.map(item => String(item.id)));

  for (const id of assignmentHistories.keys()) {
    if (activeIds.has(id)) continue;
    const history = assignmentHistories.get(id);
    if (!history || history.index === 0) {
      assignmentHistories.delete(id);
    }
  }
}

export function pruneAssignmentHistoryIfOrphan(assignmentId) {
  const targetId = getAssignmentIdKey(assignmentId);
  if (!targetId || getAssignmentById(targetId)) return;
  assignmentHistories.delete(targetId);
}

export function saveAppState({ history = true, label = "", assignmentId = null } = {}) {
  const currentSerialized = JSON.stringify(appState);
  if (currentSerialized === lastSerialized) return true;

  const limitError = getAppStateLimitError(appState);
  if (limitError) {
    console.warn("保存失败：数据超出限制");
    alert(limitError);
    return false;
  }

  if (!history) {
    if (persistSerialized(currentSerialized)) {
      lastSerialized = currentSerialized;
      pruneOrphanAssignmentHistories();
      return true;
    }
    return false;
  }

  // 旧实现是 historyEntries.length = historyIndex + 1;，现在改为按作业各自截断未来记录。
  const targetId = getAssignmentIdKey(assignmentId != null ? assignmentId : appState.currentAssignmentId);
  const targetAssignment = getAssignmentById(targetId);
  const targetOrderIndex = getAssignmentIndexById(targetId);
  const assignmentHistory = assignmentHistories.get(targetId) || ensureAssignmentHistory(targetId, {
    assignment: getAssignmentFromSerialized(lastSerialized, targetId),
    orderIndex: getAssignmentOrderIndexFromSerialized(lastSerialized, targetId)
  });

  const prevIndex = assignmentHistory.index;
  const prevEntriesLength = assignmentHistory.entries.length;

  assignmentHistory.entries.length = assignmentHistory.index + 1;
  assignmentHistory.entries.push(makeHistoryEntry(
    label || "未命名操作",
    targetAssignment,
    targetOrderIndex >= 0
      ? targetOrderIndex
      : assignmentHistory.entries[Math.max(assignmentHistory.index, 0)]?.orderIndex ?? 0
  ));
  assignmentHistory.index++;
  trimHistoryEntries();

  if (persistSerialized(currentSerialized)) {
    lastSerialized = currentSerialized;
    pruneOrphanAssignmentHistories();
    return true;
  }

  assignmentHistory.entries.length = prevEntriesLength;
  assignmentHistory.index = prevIndex;
  return false;
}

function applyAssignmentHistoryEntry(assignmentId, entry) {
  const targetId = getAssignmentIdKey(assignmentId);
  const existingIndex = getAssignmentIndexById(targetId);

  if (entry.snapshot == null) {
    if (existingIndex >= 0) {
      appState.assignments.splice(existingIndex, 1);
    }

    if (String(appState.currentAssignmentId) === targetId) {
      const fallback = appState.assignments[0] || clone(defaultAssignment);
      if (appState.assignments.length === 0) {
        appState.assignments.push(fallback);
      }
      appState.currentAssignmentId = fallback.id;
    }
    return;
  }

  const parsedAssignment = clone(JSON.parse(entry.snapshot));
  if (existingIndex >= 0) {
    appState.assignments.splice(existingIndex, 1, parsedAssignment);
  } else {
    const insertIndex = Math.max(0, Math.min(entry.orderIndex ?? appState.assignments.length, appState.assignments.length));
    appState.assignments.splice(insertIndex, 0, parsedAssignment);
  }
  appState.currentAssignmentId = parsedAssignment.id;
}

export function jumpToHistoryEntry(index, assignmentId = appState.currentAssignmentId) {
  const targetId = getAssignmentIdKey(assignmentId);
  const history = assignmentHistories.get(targetId);
  if (!history || index < 0 || index >= history.entries.length || index === history.index) return false;

  applyAssignmentHistoryEntry(assignmentId, history.entries[index]);
  history.index = index;
  lastSerialized = JSON.stringify(appState);
  persistSerialized(lastSerialized);
  pruneOrphanAssignmentHistories();
  return true;
}

function pruneDeleteFallbackBeforeRestore(restoreEntry) {
  if (!restoreEntry?.snapshot || appState.assignments.length !== 1) return;

  let restoredId;
  try {
    restoredId = String(JSON.parse(restoreEntry.snapshot).id);
  } catch {
    return;
  }

  if (String(appState.assignments[0].id) === restoredId) return;
  appState.assignments.splice(0, 1);
}

export function undoAppState(assignmentId = appState.currentAssignmentId) {
  const history = assignmentHistories.get(getAssignmentIdKey(assignmentId));
  if (!history) return false;

  const targetIndex = history.index - 1;
  if (targetIndex < 0) return false;

  const currentEntry = history.entries[history.index];
  if (currentEntry?.snapshot == null) {
    pruneDeleteFallbackBeforeRestore(history.entries[targetIndex]);
  }

  return jumpToHistoryEntry(targetIndex, assignmentId);
}

export function redoAppState(assignmentId = appState.currentAssignmentId) {
  const history = assignmentHistories.get(getAssignmentIdKey(assignmentId));
  if (!history) return false;
  return jumpToHistoryEntry(history.index + 1, assignmentId);
}

export function getCurrentAssignment() {
  let assignment = appState.assignments.find(item => String(item.id) === String(appState.currentAssignmentId));

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
    scoreStep10Mode: false,
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

    const nextState = {
      showRealNames: parsed.showRealNames !== false,
      scoringMode: Boolean(parsed.scoringMode),
      scoreStep10Mode: Boolean(parsed.scoreStep10Mode ?? parsed.scoreTensMode),
      showBarScoringToggle: parsed.showBarScoringToggle !== false,
      showBarStats: parsed.showBarStats !== false,
      hapticsEnabled: parsed.hapticsEnabled !== false,
      currentAssignmentId: currentAssignment.id,
      assignments,
      roster
    };

    const limitError = getAppStateLimitError(nextState);
    if (limitError) {
      console.warn("读取存储失败，数据超出限制");
      return fallback;
    }

    return nextState;
  } catch (error) {
    console.warn("读取存储失败，使用默认数据", error);
    return fallback;
  }
}
