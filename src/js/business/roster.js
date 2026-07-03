import { getState, saveAppState } from "../state.js";
import { STATUS } from "../constants.js";

export function applyRosterToAllAssignments(newRoster) {
  const state = getState();

  state.assignments.forEach(assignment => {
    const oldMap = new Map();
    assignment.students.forEach(s => oldMap.set(String(s.id), s));

    assignment.students = newRoster.map(entry => {
      const old = oldMap.get(String(entry.id));
      if (old) {
        old.serial = entry.serial;
        old.name = entry.name;
        return old;
      }
      return {
        id: entry.id,
        serial: entry.serial,
        name: entry.name,
        status: STATUS.NORMAL,
        badge: "",
        badgeType: "",
        note: "",
        updatedAt: ""
      };
    });

  });

  state.roster = newRoster;
  saveAppState({ label: "更新学生名单" });
}
