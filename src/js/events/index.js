import { bindAssignmentEvents } from "./assignments.js";
import { bindBackupEvents } from "./backup.js";
import { bindNavigationEvents } from "./navigation.js";
import { bindScoreEvents } from "./score.js";
import { bindStudentEvents } from "./students.js";
import { bindRosterEvents } from "./roster.js";

export function bindEvents() {
  bindNavigationEvents();
  bindAssignmentEvents();
  bindStudentEvents();
  bindScoreEvents();
  bindRosterEvents();
  bindBackupEvents();
}
