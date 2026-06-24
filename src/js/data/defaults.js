import { clone } from "../utils/clone.js";
import { STATUS } from "../constants.js";
import { makeDefaultAssignmentTitle } from "../utils/id.js";

export const defaultStudents = [
  { id: 1, serial: "01", name: "林子安", status: STATUS.NORMAL, badge: "98", badgeType: "score" },
  { id: 2, serial: "02", name: "陈雨", status: STATUS.REGISTERED, badge: "已交", badgeType: "submit" },
  { id: 3, serial: "03", name: "何思远", status: STATUS.REGISTERED, badge: "100", badgeType: "score" },
  { id: 4, serial: "04", name: "李昕", status: STATUS.NORMAL, badge: "", badgeType: "" },
  { id: 5, serial: "05", name: "周嘉宁", status: STATUS.NORMAL, badge: "", badgeType: "" },

  { id: 6, serial: "06", name: "黄一诺", status: STATUS.NORMAL, badge: "需重写", badgeType: "note" },
  { id: 7, serial: "07", name: "吴泽", status: STATUS.REGISTERED, badge: "已阅", badgeType: "review" },
  { id: 8, serial: "08", name: "郑语涵", status: STATUS.NORMAL, badge: "85", badgeType: "score" },
  { id: 9, serial: "09", name: "许辰", status: STATUS.NORMAL, badge: "", badgeType: "" },
  { id: 10, serial: "10", name: "赵明轩", status: STATUS.NORMAL, badge: "", badgeType: "" },

  { id: 11, serial: "11", name: "梁若曦", status: STATUS.NORMAL, badge: "", badgeType: "" },
  { id: 12, serial: "12", name: "郭晨", status: STATUS.NORMAL, badge: "", badgeType: "" },
  { id: 13, serial: "13", name: "孙亦航", status: STATUS.NORMAL, badge: "", badgeType: "" },
  { id: 14, serial: "14", name: "马可", status: STATUS.NORMAL, badge: "", badgeType: "" },
  { id: 15, serial: "15", name: "谢梓涵", status: STATUS.NORMAL, badge: "", badgeType: "" },
  { id: 16, serial: "16", name: "胡悦", status: STATUS.NORMAL, badge: "", badgeType: "" },
  { id: 17, serial: "17", name: "罗子墨", status: STATUS.NORMAL, badge: "", badgeType: "" },
  { id: 18, serial: "18", name: "唐诗雅", status: STATUS.NORMAL, badge: "", badgeType: "" },
  { id: 19, serial: "19", name: "邓宇", status: STATUS.NORMAL, badge: "", badgeType: "" },
  { id: 20, serial: "20", name: "曹清越", status: STATUS.NORMAL, badge: "", badgeType: "" },

  { id: 21, serial: "21", name: "叶安琪", status: STATUS.NORMAL, badge: "", badgeType: "" },
  { id: 22, serial: "22", name: "曾质彬", status: STATUS.NORMAL, badge: "", badgeType: "" },
  { id: 23, serial: "23", name: "傅晓", status: STATUS.NORMAL, badge: "", badgeType: "" },
  { id: 24, serial: "24", name: "彭乐", status: STATUS.NORMAL, badge: "", badgeType: "" },
  { id: 25, serial: "25", name: "魏子衿", status: STATUS.NORMAL, badge: "", badgeType: "" },
  { id: 26, serial: "26", name: "沈星", status: STATUS.NORMAL, badge: "", badgeType: "" },
  { id: 27, serial: "27", name: "苏以宁", status: STATUS.NORMAL, badge: "", badgeType: "" },
  { id: 28, serial: "28", name: "丁睿", status: STATUS.NORMAL, badge: "", badgeType: "" },
  { id: 29, serial: "29", name: "袁欣怡", status: STATUS.NORMAL, badge: "", badgeType: "" },
  { id: 30, serial: "30", name: "蒋沐阳", status: STATUS.NORMAL, badge: "", badgeType: "" },

  { id: 31, serial: "31", name: "韩知夏", status: STATUS.NORMAL, badge: "", badgeType: "" },
  { id: 32, serial: "32", name: "邱然", status: STATUS.NORMAL, badge: "", badgeType: "" },
  { id: 33, serial: "33", name: "孟梓萱", status: STATUS.NORMAL, badge: "", badgeType: "" },
  { id: 34, serial: "34", name: "邹远", status: STATUS.NORMAL, badge: "", badgeType: "" },
  { id: 35, serial: "35", name: "方予安", status: STATUS.NORMAL, badge: "", badgeType: "" },
  { id: 36, serial: "36", name: "卢佳", status: STATUS.NORMAL, badge: "", badgeType: "" },
  { id: 37, serial: "37", name: "贺子昂", status: STATUS.NORMAL, badge: "", badgeType: "" },
  { id: 38, serial: "38", name: "江晚晴", status: STATUS.NORMAL, badge: "", badgeType: "" },
  { id: 39, serial: "39", name: "高铭", status: STATUS.NORMAL, badge: "", badgeType: "" },
  { id: 40, serial: "40", name: "范若琳", status: STATUS.NORMAL, badge: "", badgeType: "" },

  { id: 41, serial: "41", name: "程奕", status: STATUS.NORMAL, badge: "", badgeType: "" },
  { id: 42, serial: "42", name: "陆思齐", status: STATUS.NORMAL, badge: "", badgeType: "" },
  { id: 43, serial: "43", name: "钟灵", status: STATUS.NORMAL, badge: "", badgeType: "" },
  { id: 44, serial: "44", name: "黎嘉树", status: STATUS.NORMAL, badge: "", badgeType: "" },
  { id: 45, serial: "45", name: "姜月", status: STATUS.NORMAL, badge: "", badgeType: "" },
  { id: 46, serial: "46", name: "白景行", status: STATUS.NORMAL, badge: "", badgeType: "" },
  { id: 47, serial: "47", name: "龚婉", status: STATUS.NORMAL, badge: "", badgeType: "" },
  { id: 48, serial: "48", name: "秦书瑶", status: STATUS.NORMAL, badge: "", badgeType: "" },
  { id: 49, serial: "49", name: "莫辰", status: STATUS.NORMAL, badge: "", badgeType: "" },
  { id: 50, serial: "50", name: "严知许", status: STATUS.NORMAL, badge: "", badgeType: "" }
];

export const defaultAssignment = {
  id: "assignment-default",
  title: makeDefaultAssignmentTitle(),
  subject: "",
  createdAt: new Date().toISOString(),
  students: clone(defaultStudents)
};
