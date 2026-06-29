import { makeDefaultAssignmentTitle } from "../utils/id.js";
import { createFreshStudentsFrom } from "../utils/normalize.js";

export const defaultStudents = [
  { id: 1, serial: "01", name: "林子安" },
  { id: 2, serial: "02", name: "陈雨" },
  { id: 3, serial: "03", name: "何思远" },
  { id: 4, serial: "04", name: "李昕" },
  { id: 5, serial: "05", name: "周嘉宁" },

  { id: 6, serial: "06", name: "黄一诺" },
  { id: 7, serial: "07", name: "吴泽" },
  { id: 8, serial: "08", name: "郑语涵" },
  { id: 9, serial: "09", name: "许辰" },
  { id: 10, serial: "10", name: "赵明轩" },

  { id: 11, serial: "11", name: "梁若曦" },
  { id: 12, serial: "12", name: "郭晨" },
  { id: 13, serial: "13", name: "孙亦航" },
  { id: 14, serial: "14", name: "马可" },
  { id: 15, serial: "15", name: "谢梓涵" },
  { id: 16, serial: "16", name: "胡悦" },
  { id: 17, serial: "17", name: "罗子墨" },
  { id: 18, serial: "18", name: "唐诗雅" },
  { id: 19, serial: "19", name: "邓宇" },
  { id: 20, serial: "20", name: "曹清越" },

  { id: 21, serial: "21", name: "叶安琪" },
  { id: 22, serial: "22", name: "曾质彬" },
  { id: 23, serial: "23", name: "傅晓" },
  { id: 24, serial: "24", name: "彭乐" },
  { id: 25, serial: "25", name: "魏子衿" },
  { id: 26, serial: "26", name: "沈星" },
  { id: 27, serial: "27", name: "苏以宁" },
  { id: 28, serial: "28", name: "丁睿" },
  { id: 29, serial: "29", name: "袁欣怡" },
  { id: 30, serial: "30", name: "蒋沐阳" },

  { id: 31, serial: "31", name: "韩知夏" },
  { id: 32, serial: "32", name: "邱然" },
  { id: 33, serial: "33", name: "孟梓萱" },
  { id: 34, serial: "34", name: "邹远" },
  { id: 35, serial: "35", name: "方予安" },
  { id: 36, serial: "36", name: "卢佳" },
  { id: 37, serial: "37", name: "贺子昂" },
  { id: 38, serial: "38", name: "江晚晴" },
  { id: 39, serial: "39", name: "高铭" },
  { id: 40, serial: "40", name: "范若琳" },

  { id: 41, serial: "41", name: "程奕" },
  { id: 42, serial: "42", name: "陆思齐" },
  { id: 43, serial: "43", name: "钟灵" },
  { id: 44, serial: "44", name: "黎嘉树" },
  { id: 45, serial: "45", name: "姜月" },
  { id: 46, serial: "46", name: "白景行" },
  { id: 47, serial: "47", name: "龚婉" },
  { id: 48, serial: "48", name: "秦书瑶" },
  { id: 49, serial: "49", name: "莫辰" },
  { id: 50, serial: "50", name: "严知许" }
];

export const defaultAssignment = {
  id: "assignment-default",
  title: makeDefaultAssignmentTitle(),
  subject: "",
  createdAt: new Date().toISOString(),
  students: createFreshStudentsFrom(defaultStudents)
};
