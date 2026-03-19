export type ProgressStep =
  | "parsing_jd"
  | "parsing_resume"
  | "analyzing_match"
  | "translating_jd"
  | "generating_questions";

export const PROGRESS_LABELS: Record<ProgressStep, string> = {
  parsing_jd: "正在解析目标职位 JD...",
  parsing_resume: "正在解析你的简历...",
  analyzing_match: "正在分析匹配度...",
  translating_jd: "正在翻译 JD 招聘黑话与潜台词...",
  generating_questions: "正在生成突击题库...",
};

export const PROGRESS_ORDER: ProgressStep[] = [
  "parsing_jd",
  "parsing_resume",
  "analyzing_match",
  "translating_jd",
  "generating_questions",
];
