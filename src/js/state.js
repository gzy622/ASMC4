import { STORAGE_KEY, STATUS } from "./constants.js";
import { normalizeAssignment, normalizeRosterEntry } from "./utils/normalize.js";
import { clone } from "./utils/clone.js";
import { defaultStudents, defaultAssignment } from "./data/defaults.js";

let appState = loadAppState();

export { defaultStudents };

export function getState() {
  return appState;
}

export function saveAppState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
  } catch (error) {
    console.warn("保存失败：localStorage 可能已满", error);
  }
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

  const submitted = activeStudents.filter(student => student.status === STATUS.REGISTERED).length;
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
    hideNames: false,
    scoringMode: false,
    scoreTensMode: false,
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

    const currentAssignmentId = assignments.some(item => item.id === parsed.currentAssignmentId)
      ? parsed.currentAssignmentId
      : assignments[0].id;

    const roster = Array.isArray(parsed.roster)
      ? parsed.roster.map(normalizeRosterEntry)
      : assignments[0].students.map(s => ({ id: s.id, serial: s.serial, name: s.name, nonEnglish: false }));

    return {
      hideNames: Boolean(parsed.hideNames),
      scoringMode: Boolean(parsed.scoringMode),
      scoreTensMode: Boolean(parsed.scoreTensMode),
      currentAssignmentId,
      assignments,
      roster
    };
  } catch (error) {
    console.warn("读取存储失败，使用默认数据", error);
    return fallback;
  }
}
