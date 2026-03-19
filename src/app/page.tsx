"use client";

import { useState, useCallback } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { InputStep } from "@/components/InputStep";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import { ResultDashboard } from "@/components/ResultDashboard";
import { ApiKeyDialog, getStoredApiKey } from "@/components/ApiKeyDialog";
import type { AnalysisResult } from "@/types/analysis";
import type { ProgressStep } from "@/types/progress";

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [progressStep, setProgressStep] = useState<ProgressStep | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [apiKeyDialogOpen, setApiKeyDialogOpen] = useState(false);
  const [apiKey, setApiKey] = useState("");

  const handleAnalyze = useCallback(
    async (getData: () => Promise<{ jd: string; resume: string }>) => {
      const key = apiKey || getStoredApiKey();
      if (!key) {
        setApiKeyDialogOpen(true);
        return;
      }

      setIsLoading(true);
      setProgressStep("parsing_jd");
      setResult(null);

      let progressTimer: ReturnType<typeof setInterval> | undefined;

      try {
        const { jd, resume } = await getData();

        setProgressStep("parsing_resume");
        await new Promise((r) => setTimeout(r, 100));

        setProgressStep("analyzing_match");

        progressTimer = setInterval(() => {
          setProgressStep((s) => {
            const steps: ProgressStep[] = ["analyzing_match", "translating_jd", "generating_questions"];
            const idx = steps.indexOf(s || "analyzing_match");
            return idx < 2 ? steps[idx + 1] : s;
          });
        }, 4000);

        const res = await fetch("/api/analyze-stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jd, resume, apiKey: key }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "分析失败");
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error("无法读取响应");

        const decoder = new TextDecoder();
        let fullBuffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          fullBuffer += decoder.decode(value, { stream: true });
        }

        const jsonMatch = fullBuffer.match(/\{[\s\S]*\}/);
        const jsonStr = jsonMatch ? jsonMatch[0] : fullBuffer.trim();
        if (!jsonStr) throw new Error("未能解析分析结果，请检查 API Key 或重试");

        try {
          const parsed = JSON.parse(jsonStr) as AnalysisResult;
          if (typeof parsed.matchScore === "number") {
            setResult(parsed);
            window.scrollTo(0, 0);
          } else {
            throw new Error("分析结果格式异常");
          }
        } catch {
          throw new Error("未能解析分析结果，请检查 API Key 或重试");
        }
        } catch (e) {
        alert(e instanceof Error ? e.message : "分析失败，请稍后重试");
      } finally {
        if (progressTimer) clearInterval(progressTimer);
        setIsLoading(false);
        setProgressStep(null);
      }
    },
    [apiKey]
  );

  const handleBack = () => setResult(null);

  return (
    <div className="flex min-h-screen flex-col bg-[#F8FAFC]">
      <Header onOpenApiKey={() => setApiKeyDialogOpen(true)} />
      <main className="flex-1 px-6 py-12">
        <div className="mx-auto flex max-w-6xl justify-center">
          {result ? (
            <ResultDashboard result={result} onBack={handleBack} />
          ) : (
            <InputStep
              onAnalyze={handleAnalyze}
              isLoading={isLoading}
              onProgressStep={setProgressStep}
            />
          )}
        </div>
      </main>
      <Footer />
      <LoadingOverlay isActive={isLoading} step={progressStep} />
      <ApiKeyDialog
        open={apiKeyDialogOpen}
        onOpenChange={setApiKeyDialogOpen}
        onSave={setApiKey}
      />
    </div>
  );
}
