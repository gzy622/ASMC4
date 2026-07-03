export const STORAGE_KEY = "asmc4_assignments_v1";
export const MAX_HISTORY = 50;
export const MAX_ASSIGNMENTS = 500;
export const MAX_ROSTER_SIZE = 100;
export const MAX_ASSIGNMENT_TITLE_LENGTH = 24;
export const MAX_SUBJECT_LENGTH = 12;
export const MAX_STUDENT_NAME_LENGTH = 10;
export const MAX_STUDENT_NOTE_LENGTH = 20;
export const MAX_STATE_BYTES = 4 * 1024 * 1024;
export const MAX_BACKUP_FILE_BYTES = 6 * 1024 * 1024;

export const STATUS = {
  NORMAL: "normal",
  SUBMITTED: "submitted",
  NONE: "none"
};

export const STEMS = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
export const BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];

export const LONG_PRESS_MS = 400;

export const SUBJECT_OPTIONS = [
  { value: "", label: "未指定" },
  { value: "英语", label: "英语" },
  { value: "数学", label: "数学" },
  { value: "语文", label: "语文" },
  { value: "物理", label: "物理" },
  { value: "化学", label: "化学" },
  { value: "生物", label: "生物" },
  { value: "历史", label: "历史" },
  { value: "地理", label: "地理" },
  { value: "政治", label: "政治" }
];
