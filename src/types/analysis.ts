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
}
