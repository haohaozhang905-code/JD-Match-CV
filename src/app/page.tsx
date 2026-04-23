"use client";

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { InputStep } from "@/components/InputStep";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import { ResultDashboard } from "@/components/ResultDashboard";
import { ApiKeyDialog, getStoredApiKey, getStoredThinkingMode } from "@/components/ApiKeyDialog";
import type { AnalysisResult } from "@/types/analysis";
import type { ProgressStep } from "@/types/progress";

const MIN_LOADING_DURATION_MS = 2500;
const MAX_RETRIES = 3;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function isRetryable(e: unknown): boolean {
  const err = e as { retryable?: boolean };
  return err?.retryable !== false;
}

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [progressStep, setProgressStep] = useState<ProgressStep | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [apiKeyDialogOpen, setApiKeyDialogOpen] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [thinkingText, setThinkingText] = useState("");
  const [enableThinking, setEnableThinking] = useState(false);
  const [pipelineSteps, setPipelineSteps] = useState<Array<{ step: string; data: Record<string, unknown> }>>([]);
  const loadingStartRef = useRef<number>(0);

  const handleAnalyze = useCallback(
    async (getData: () => Promise<{ jd: string; resume: string }>) => {
      const key = apiKey || getStoredApiKey();
      // key 为空时走免费模式，不强制弹窗

      setIsLoading(true);
      loadingStartRef.current = Date.now();
      setProgressStep("parsing_jd");
      setResult(null);
      setThinkingText("");
      setPipelineSteps([]);
      const thinkingMode = getStoredThinkingMode();
      setEnableThinking(thinkingMode);

      let progressTimer: ReturnType<typeof setInterval> | undefined;
      let lastError: Error | null = null;

      try {
      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          if (attempt > 0) {
            if (progressTimer) clearInterval(progressTimer);
            progressTimer = undefined;
            setThinkingText("");
            setProgressStep("parsing_jd");
            await sleep(1000 * attempt);
          }

          const { jd, resume } = await getData();

          setProgressStep("parsing_resume");
          await new Promise((r) => setTimeout(r, 100));

          setProgressStep("searching_company");
          await new Promise((r) => setTimeout(r, 100));

          setProgressStep("analyzing_match");

          progressTimer = setInterval(() => {
            setProgressStep((s) => {
              const steps: ProgressStep[] = ["analyzing_match", "translating_jd", "generating_questions"];
              const idx = steps.indexOf(s || "analyzing_match");
              return idx < 2 ? steps[idx + 1] : s;
            });
          }, 4000);

          console.log("[FETCH] Sending enableThinking:", thinkingMode);
          const res = await fetch("/api/analyze-stream", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ jd, resume, apiKey: key, enableThinking: thinkingMode }),
          });

          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            const apiError = new Error(err.error || "分析失败") as Error & { retryable?: boolean };
            apiError.retryable = res.status >= 500 || res.status === 429;
            throw apiError;
          }

        const reader = res.body?.getReader();
        if (!reader) throw new Error("无法读取响应");

        const decoder = new TextDecoder();
        let contentBuffer = "";
        let lineBuffer = "";
        let thinkingBuffer = "";
        const localPipelineSteps: Array<{ step: string; data: Record<string, unknown> }> = [];

        let lastUpdateTime = Date.now();
        const updateInterval = 100;

        const flushUpdates = () => {
          setPipelineSteps([...localPipelineSteps]);
          setThinkingText(thinkingBuffer);
          lastUpdateTime = Date.now();
        };

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          lineBuffer += decoder.decode(value, { stream: true });
          const lines = lineBuffer.split("\n");
          lineBuffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const parsed = JSON.parse(line);
              console.log("[STREAM]", parsed.type, parsed);
              if (parsed.type === "step") {
                localPipelineSteps.push({ step: parsed.step, data: parsed.data });
              } else if (parsed.type === "reasoning" && parsed.content) {
                console.log("[REASONING]", parsed.content.slice(0, 100));
                thinkingBuffer += parsed.content;
              } else if (parsed.type === "content" && parsed.content) {
                contentBuffer += parsed.content;
              }
            } catch {
              // 非 JSON 行，忽略
            }
          }

          if (Date.now() - lastUpdateTime >= updateInterval) {
            flushUpdates();
          }
        }

        if (lineBuffer.trim()) {
          try {
            const parsed = JSON.parse(lineBuffer);
            console.log("[STREAM-FINAL]", parsed.type, parsed);
            if (parsed.type === "step") {
              localPipelineSteps.push({ step: parsed.step, data: parsed.data });
            } else if (parsed.type === "reasoning" && parsed.content) {
              thinkingBuffer += parsed.content;
            } else if (parsed.type === "content" && parsed.content) {
              contentBuffer += parsed.content;
            }
          } catch {
            // 忽略
          }
        }

        flushUpdates();

        // 提取 JSON：支持纯 JSON、或 ```json ... ``` 包裹
        let jsonStr = contentBuffer.trim();
        const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (codeBlockMatch) {
          jsonStr = codeBlockMatch[1].trim();
        } else {
          const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
          jsonStr = jsonMatch ? jsonMatch[0] : jsonStr;
        }

        if (!jsonStr) throw new Error("未能解析分析结果，请检查 API Key 或重试");

        try {
          const parsed = JSON.parse(jsonStr) as Record<string, unknown>;
          let score = parsed.matchScore ?? parsed.match_score;
          if (typeof score === "string") {
            const n = Number(score);
            score = Number.isFinite(n) ? n : undefined;
          }
          if (typeof score === "number" && score >= 0 && score <= 100) {
            const elapsed = Date.now() - loadingStartRef.current;
            const remaining = Math.max(0, MIN_LOADING_DURATION_MS - elapsed);
            await new Promise((r) => setTimeout(r, remaining));
            setProgressStep("generating_questions");
            await new Promise((r) => setTimeout(r, 200));
            console.log("[RESULT] thinkingText length:", thinkingBuffer.length, "pipelineSteps:", localPipelineSteps.length);

            // 从 pipelineSteps 中提取市场洞察数据
            const companyStep = localPipelineSteps.find(s => s.step === "searching_company");
            const roleStep = localPipelineSteps.find(s => s.step === "searching_role");
            const extraStep = localPipelineSteps.find(s => s.step === "searching_extra");
            const summaryStep = localPipelineSteps.find(s => s.step === "summarizing_market");
            const marketInsights = {
              company: (companyStep?.data?.items as Array<{ title: string; content: string; url: string }>) ?? [],
              role: (roleStep?.data?.items as Array<{ title: string; content: string; url: string }>) ?? [],
              extra: (extraStep?.data?.items as Array<{ title: string; content: string; url: string }>) ?? [],
            };
            const marketInsightSummary = summaryStep?.data as { markdown?: string; sources?: Array<{ title: string; url: string }>; sections?: { company: string[]; role: string[]; process: string[]; prep: string[] } } | undefined;
            const marketInsightSections = marketInsightSummary?.sections;

            setResult({ ...parsed, matchScore: score, thinkingText: thinkingBuffer, pipelineSteps: localPipelineSteps, marketInsights, marketInsightSummary, marketInsightSections } as AnalysisResult);
            window.scrollTo(0, 0);
            break;
          } else {
            throw new Error("分析结果格式异常");
          }
        } catch (parseErr) {
          if (parseErr instanceof SyntaxError) {
            throw new Error("未能解析分析结果，请检查 API Key 或重试");
          }
          throw parseErr;
        }
        } catch (e) {
          lastError = e instanceof Error ? e : new Error(String(e));
          if (!isRetryable(e) || attempt >= MAX_RETRIES) break;
        }
      }

      if (lastError) {
        alert(lastError instanceof Error ? lastError.message : "分析失败，请稍后重试");
        setThinkingText("");
      }
      } finally {
        if (progressTimer) clearInterval(progressTimer);
        setIsLoading(false);
        setProgressStep(null);
        setEnableThinking(false);
      }
    },
    [apiKey]
  );

  const handleBack = () => setResult(null);

  return (
    <div className="flex min-h-screen flex-col bg-[#F8FAFC]">
      <Header onOpenApiKey={() => setApiKeyDialogOpen(true)} />
      <main className="flex-1 px-6 pt-[35px] pb-12">
        <div className="mx-auto flex max-w-6xl justify-center">
          <AnimatePresence mode="wait">
            {result ? (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="w-full"
              >
                <ResultDashboard result={result} onBack={handleBack} />
              </motion.div>
            ) : (
              <motion.div
                key="input"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="w-full"
              >
                <InputStep
                  onAnalyze={handleAnalyze}
                  isLoading={isLoading}
                  onProgressStep={setProgressStep}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
      <Footer />
      <LoadingOverlay
        isActive={isLoading}
        step={progressStep}
        thinkingText={thinkingText}
        enableThinking={enableThinking}
        pipelineSteps={pipelineSteps}
      />
      <ApiKeyDialog
        open={apiKeyDialogOpen}
        onOpenChange={setApiKeyDialogOpen}
        onSave={setApiKey}
      />
    </div>
  );
}
