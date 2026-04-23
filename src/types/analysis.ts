export interface AnalysisResult {
  matchScore?: number;
  matchSummary?: string;
  jdTranslations?: Array<{
    original: string;
    translation: string;
  }>;
  strengths?: string[];
  weaknesses?: string[];
  interviewQuestions?: Array<{
    question: string;
    suggestion: string;
  }>;
  thinkingText?: string;
  pipelineSteps?: Array<{ step: string; data: Record<string, unknown> }>;
  marketInsights?: {
    company: Array<{ title: string; content: string; url: string }>;
    role: Array<{ title: string; content: string; url: string }>;
    extra?: Array<{ title: string; content: string; url: string }>;
  };
  marketInsightSummary?: {
    /** Markdown 结构化洞察正文 */
    markdown: string;
    sources: Array<{ title: string; url: string }>;
  };
  marketInsightSections?: {
    company: string[];
    role: string[];
    process: string[];
    prep: string[];
  };
}
