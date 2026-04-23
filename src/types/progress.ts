export type ProgressStep =
  | "parsing_jd"
  | "parsing_resume"
  | "searching_company"
  | "analyzing_match"
  | "translating_jd"
  | "generating_questions";

export const PROGRESS_LABELS: Record<ProgressStep, string> = {
  parsing_jd: "提取JD核心词",
  parsing_resume: "解析简历经历",
  searching_company: "搜索公司实时动态",
  analyzing_match: "构建能力雷达",
  translating_jd: "翻译JD招聘黑话",
  generating_questions: "生成面试题",
};

export const PROGRESS_ORDER: ProgressStep[] = [
  "parsing_jd",
  "parsing_resume",
  "searching_company",
  "analyzing_match",
  "translating_jd",
  "generating_questions",
];
